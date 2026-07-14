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

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({ name: parsed.data, owner_id: user.id })
    .select("id")
    .single();

  if (workspaceError || !workspace) {
    return {
      error: "We couldn't create your workspace. Please try again in a moment.",
    };
  }

  const { error: membershipError } = await supabase.from("memberships").insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: "founder",
    title: "Founder",
    color: pickMemberColor(user.email ?? user.id),
    status: "active",
  });

  if (membershipError) {
    // The workspace exists but has no founder row — surface it rather than
    // stranding the user in a half-created state.
    return {
      error:
        "Your workspace was created but we couldn't finish setting you up. Please refresh.",
    };
  }

  redirect("/app");
}
