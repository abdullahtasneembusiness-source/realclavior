"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { pickMemberColor } from "@/lib/colors";

const nameSchema = z
  .string()
  .trim()
  .min(2, "Give your business a name (at least 2 characters).")
  .max(80, "That name is a bit long — keep it under 80 characters.");

export type CreateWorkspaceState = { error?: string };

/**
 * Creates a workspace and the founder membership for the current user, then routes
 * into the app. Both writes go through RLS: workspaces_insert allows owner_id =
 * auth.uid(), and the memberships_insert bootstrap policy allows the owner to add
 * their own founder row.
 */
export async function createWorkspace(
  _prev: CreateWorkspaceState,
  formData: FormData,
): Promise<CreateWorkspaceState> {
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid name." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Create the workspace and the founder membership in one atomic, RLS-safe call
  // (see the create_workspace SECURITY DEFINER function). This can't leave a
  // workspace stranded without its founder row, and it doesn't depend on the
  // membership-bootstrap RLS path.
  const { data: workspaceId, error } = await supabase.rpc("create_workspace", {
    p_name: parsed.data,
    p_color: pickMemberColor(user.email ?? user.id),
  });

  if (error || !workspaceId) {
    return {
      error: "We couldn't create your workspace. Please try again in a moment.",
    };
  }

  redirect(`/w/${workspaceId}`);
}
