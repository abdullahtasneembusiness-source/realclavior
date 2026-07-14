import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Membership, Workspace } from "@/types/db";

export interface ActiveContext {
  userId: string;
  email: string | null;
  membership: Membership;
  workspace: Workspace;
}

/**
 * Resolves the current user's active workspace context for server components in the
 * authenticated app. Redirects to /login if signed out, or /onboarding if the user
 * has no active membership yet.
 *
 * Phase 1 assumes a single active workspace per user; the workspace switcher and
 * multi-workspace selection land in Session 2.
 */
export async function requireActiveContext(): Promise<ActiveContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("*, workspace:workspaces(*)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/onboarding");
  }

  const { workspace, ...membershipRow } = membership as Membership & {
    workspace: Workspace;
  };

  return {
    userId: user.id,
    email: user.email ?? null,
    membership: membershipRow,
    workspace,
  };
}
