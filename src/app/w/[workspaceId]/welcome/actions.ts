"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const workspaceIdSchema = z.string().uuid();

/**
 * Marks the current member as having finished onboarding. Backed by the
 * mark_self_onboarded SECURITY DEFINER function — the member can set this one field on
 * their own row even though memberships_update is admin-only, and it's a no-op if
 * already set (so it can't be back-dated by a replay).
 */
export async function markOnboarded(
  workspaceId: string,
): Promise<{ error?: string }> {
  const parsed = workspaceIdSchema.safeParse(workspaceId);
  if (!parsed.success) return { error: "Invalid workspace." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_self_onboarded", {
    p_workspace_id: parsed.data,
  });
  if (error) return { error: "Couldn't save your progress." };
  return {};
}
