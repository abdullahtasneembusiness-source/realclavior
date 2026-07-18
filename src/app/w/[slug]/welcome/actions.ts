"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { resolveWorkspaceId } from "@/lib/workspace";

/**
 * Marks the current member onboarded, then routes them into their workspace home.
 *
 * A server action (not a client call) on purpose: the home redirects back to /welcome
 * while onboarded_at is null, so the write has to be committed before we navigate. Here
 * the RPC and the redirect happen in the same server request, in order, so by the time
 * the browser follows the redirect the flag is already set — no client-side race.
 *
 * Backed by the mark_self_onboarded SECURITY DEFINER function: the member can set this
 * one field on their own row even though memberships_update is admin-only, and it's a
 * no-op if already set.
 */
export async function finishOnboarding(workspaceId: string): Promise<void> {
  const supabase = await createClient();
  const wsId = await resolveWorkspaceId(supabase, workspaceId);
  if (!wsId) redirect("/app");

  await supabase.rpc("mark_self_onboarded", { p_workspace_id: wsId });

  redirect(`/w/${workspaceId}`);
}
