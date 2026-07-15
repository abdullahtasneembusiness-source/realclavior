import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Membership, Workspace } from "@/types/db";

export interface WorkspaceSummary {
  id: string;
  name: string;
}

export interface ActiveContext {
  userId: string;
  email: string | null;
  fullName: string | null;
  membership: Membership;
  workspace: Workspace;
  /** Every workspace this user is an active member of, for the switcher. */
  allWorkspaces: WorkspaceSummary[];
}

type MembershipRow = Membership & { workspace: Workspace | Workspace[] };

function normalizeWorkspace(row: Workspace | Workspace[]): Workspace {
  return Array.isArray(row) ? row[0] : row;
}

/**
 * Resolves the user's default workspace (their earliest-joined active membership).
 * Used by entry points that don't already carry a workspace in the URL — post-login,
 * post-onboarding. Once a user is on a /w/[workspaceId] route, that URL itself is
 * the persisted "active workspace" (bookmarkable, survives refresh) — no separate
 * cookie needed on top of it.
 */
export async function getDefaultWorkspaceId(
  userId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("workspace_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.workspace_id ?? null;
}

/**
 * Resolves the current user's context for a specific workspace route
 * (/w/[workspaceId]/...). Redirects to /login if signed out, and to /app (which
 * re-resolves a valid default) if the user has no active membership in this
 * particular workspace — this covers both "wrong workspace id" and "not a member"
 * without ever showing a bare error page.
 */
export async function requireWorkspaceContext(
  workspaceId: string,
): Promise<ActiveContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("memberships")
    .select("*, workspace:workspaces(*)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as MembershipRow[];
  const match = rows.find((row) => row.workspace_id === workspaceId);

  if (!match) {
    redirect("/app");
  }

  const { workspace, ...membershipRow } = match;

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
    membership: membershipRow,
    workspace: normalizeWorkspace(workspace),
    allWorkspaces: rows.map((row) => ({
      id: row.workspace_id,
      name: normalizeWorkspace(row.workspace).name,
    })),
  };
}

export function isAdminRole(role: Membership["role"]): boolean {
  return role === "founder" || role === "manager";
}

/**
 * Gate for founder/manager-only sections (Team, Goals, Launches). Operators hitting
 * these by URL bounce cleanly to their workspace home, same as if the nav item never
 * existed for them — never a bare error page.
 */
export function requireAdmin(ctx: ActiveContext): void {
  if (!isAdminRole(ctx.membership.role)) {
    redirect(`/w/${ctx.workspace.id}`);
  }
}
