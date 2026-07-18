"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { resolveWorkspaceId } from "@/lib/workspace";
import { MEMBER_COLORS } from "@/lib/colors";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Enter your name.")
  .max(80, "Keep it under 80 characters.");
const colorSchema = z.enum(MEMBER_COLORS);

export type SettingsState = { error?: string; success?: boolean };

/** Updates the signed-in user's own display name (auth metadata — not a schema column). */
export async function updateDisplayName(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid name." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { full_name: parsed.data },
  });

  if (error) {
    return { error: "Couldn't save your name. Please try again." };
  }

  return { success: true };
}

/**
 * Updates the caller's own avatar color for this workspace's membership. Goes
 * through update_my_membership_color() rather than a direct table update — the
 * memberships_update RLS policy only allows workspace admins to write, by design
 * (operators shouldn't be able to touch role/status), so a plain operator's own
 * color change needs this narrow, single-column escape hatch instead.
 */
export async function updateAvatarColor(
  workspaceId: string,
  color: string,
): Promise<SettingsState> {
  const parsed = colorSchema.safeParse(color);
  if (!parsed.success) {
    return { error: "Invalid color." };
  }

  const supabase = await createClient();
  const wsId = await resolveWorkspaceId(supabase, workspaceId);
  if (!wsId) return { error: "Invalid workspace." };

  const { error } = await supabase.rpc("update_my_membership_color", {
    p_workspace_id: wsId,
    p_color: parsed.data,
  });

  if (error) {
    return { error: "Couldn't save your color. Please try again." };
  }

  revalidatePath(`/w/${workspaceId}`, "layout");
  return { success: true };
}
