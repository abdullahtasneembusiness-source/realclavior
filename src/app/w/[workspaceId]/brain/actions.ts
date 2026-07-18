"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type BrainState = { error?: string; success?: string };

const workspaceIdSchema = z.string().uuid();
const idSchema = z.string().uuid();

const permissionError = "Only founders and managers can edit the Team Brain.";

function mapWriteError(code: string | undefined, fallback: string): string {
  return code === "42501" ? permissionError : fallback;
}

// "corrections" is a derived, read-only view (it mirrors feedback_notes), so it is
// deliberately NOT a category a person can author into.
const entrySchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Give the entry a title (at least 2 characters).")
    .max(140, "Keep the title under 140 characters."),
  category: z.enum([
    "voice",
    "standards",
    "tools",
    "contacts",
    "preferences",
    "other",
  ]),
  // Bodies now hold rich HTML (headings, lists, links, long-form docs), so the cap
  // is generous. The column is `text`, so no schema change is needed to store this.
  body: z.string().trim().max(100000, "That entry is a bit long.").optional(),
});

function parseEntry(formData: FormData) {
  const rawBody = formData.get("body");
  const body =
    typeof rawBody === "string" && rawBody.trim().length > 0
      ? rawBody.trim()
      : undefined;
  return entrySchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    body,
  });
}

/** Resolves the caller's active membership id in this workspace (for authorship). */
async function myMembershipId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("memberships")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  return data?.id ?? null;
}

/** Creates a Brain entry. RLS restricts the insert to workspace admins. */
export async function createBrainEntry(
  workspaceId: string,
  _prev: BrainState,
  formData: FormData,
): Promise<BrainState> {
  const parsedWs = workspaceIdSchema.safeParse(workspaceId);
  if (!parsedWs.success) return { error: "Invalid workspace." };

  const parsed = parseEntry(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid entry." };
  }

  const supabase = await createClient();
  const author = await myMembershipId(supabase, parsedWs.data);

  const { error } = await supabase.from("brain_entries").insert({
    workspace_id: parsedWs.data,
    title: parsed.data.title,
    category: parsed.data.category,
    body: parsed.data.body ?? null,
    author_membership_id: author,
  });

  if (error) {
    return { error: mapWriteError(error.code, "Couldn't save that entry.") };
  }

  revalidatePath(`/w/${workspaceId}/brain`);
  return { success: "Saved." };
}

/** Edits a Brain entry in place. */
export async function updateBrainEntry(
  workspaceId: string,
  entryId: string,
  _prev: BrainState,
  formData: FormData,
): Promise<BrainState> {
  const parsedWs = workspaceIdSchema.safeParse(workspaceId);
  const parsedId = idSchema.safeParse(entryId);
  if (!parsedWs.success || !parsedId.success)
    return { error: "Invalid entry." };

  const parsed = parseEntry(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid entry." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("brain_entries")
    .update({
      title: parsed.data.title,
      category: parsed.data.category,
      body: parsed.data.body ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsedId.data)
    .eq("workspace_id", parsedWs.data);

  if (error) {
    return { error: mapWriteError(error.code, "Couldn't save that entry.") };
  }

  revalidatePath(`/w/${workspaceId}/brain`);
  return { success: "Saved." };
}

/** Deletes a Brain entry. */
export async function deleteBrainEntry(
  workspaceId: string,
  entryId: string,
): Promise<BrainState> {
  const parsedWs = workspaceIdSchema.safeParse(workspaceId);
  const parsedId = idSchema.safeParse(entryId);
  if (!parsedWs.success || !parsedId.success)
    return { error: "Invalid entry." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("brain_entries")
    .delete()
    .eq("id", parsedId.data)
    .eq("workspace_id", parsedWs.data);

  if (error) {
    return { error: mapWriteError(error.code, "Couldn't delete that entry.") };
  }

  revalidatePath(`/w/${workspaceId}/brain`);
  return { success: "Deleted." };
}
