import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Membership, Workspace } from "@/types/db";

export interface WorkspaceSummary {
  id: string;
  slug: string;
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

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type MembershipRow = Membership & { workspace: Workspace | Workspace[] };

function normalizeWorkspace(row: Workspace | Workspace[]): Workspace {
  return Array.isArray(row) ? row[0] : row;
}

/** Matches a bare UUID — used to tell an old /w/<uuid> link from a slug. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Resolves a workspace slug to its id for server actions. Actions receive the slug
 * (it's what the URL and every internal link carry now), but DB rows are still keyed
 * by the workspace UUID. Runs under the caller's RLS, so it only returns an id for a
 * workspace the user actually belongs to — doubling as an access check.
 */
export async function resolveWorkspaceId(
  supabase: SupabaseServerClient,
  slug: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Resolves the user's default workspace slug (their earliest-joined active membership).
 * Used by entry points that don't already carry a workspace in the URL — post-login,
 * post-onboarding. Once a user is on a /w/[slug] route, that URL itself is the
 * persisted "active workspace" (bookmarkable, survives refresh).
 */
export async function getDefaultWorkspaceSlug(
  userId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("workspace:workspaces(slug)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const ws = (data as { workspace: { slug: string } | { slug: string }[] } | null)
    ?.workspace;
  if (!ws) return null;
  return (Array.isArray(ws) ? ws[0]?.slug : ws.slug) ?? null;
}

/**
 * Resolves the current user's context for a workspace route (/w/[slug]/...). The param
 * is normally the slug, but an old /w/<uuid> bookmark still resolves by id (middleware
 * 301s those to the slug URL; resolving both here is a safety net). Redirects to /login
 * if signed out, and to /app if the user has no active membership in this workspace —
 * covering "wrong slug" and "not a member" without ever showing a bare error page.
 *
 * Wrapped in React cache() below: the layout and the page of the same request both call
 * it with the same slug, so this dedupes to a single getUser() + membership query per
 * navigation instead of running twice.
 */
async function loadWorkspaceContext(
  slugOrId: string,
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
  const match = rows.find((row) => {
    const ws = normalizeWorkspace(row.workspace);
    return ws.slug === slugOrId || ws.id === slugOrId;
  });

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
    allWorkspaces: rows.map((row) => {
      const ws = normalizeWorkspace(row.workspace);
      return { id: ws.id, slug: ws.slug, name: ws.name };
    }),
  };
}

export const requireWorkspaceContext = cache(loadWorkspaceContext);

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
    redirect(`/w/${ctx.workspace.slug}`);
  }
}
