"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type ManualState = { error?: string; success?: string };

const idSchema = z.string().uuid();
const sectionKeySchema = z.enum([
  "communication",
  "delivery",
  "response_time",
  "dealbreakers",
  "trust",
  "standard",
]);
const bodySchema = z.string().trim().max(3000, "Keep it a bit shorter.");

function mapWriteError(code: string | undefined, fallback: string): string {
  return code === "42501"
    ? "Only founders and managers can edit the manual."
    : fallback;
}

async function upsertSections(
  workspaceId: string,
  rows: { section_key: string; body: string | null }[],
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("founder_manual_sections").upsert(
    rows.map((r) => ({
      workspace_id: workspaceId,
      section_key: r.section_key,
      body: r.body,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "workspace_id,section_key" },
  );
  if (error) return { error: mapWriteError(error.code, "Couldn't save.") };
  revalidatePath(`/w/${workspaceId}/brain/manual`);
  revalidatePath(`/w/${workspaceId}/brain`);
  return {};
}

/** Saves (or clears) a single section — used by the per-section inline editor. */
export async function saveManualSection(
  workspaceId: string,
  sectionKey: string,
  _prev: ManualState,
  formData: FormData,
): Promise<ManualState> {
  const parsedWs = idSchema.safeParse(workspaceId);
  const parsedKey = sectionKeySchema.safeParse(sectionKey);
  if (!parsedWs.success || !parsedKey.success)
    return { error: "Invalid section." };
  const parsedBody = bodySchema.safeParse(formData.get("body") ?? "");
  if (!parsedBody.success) {
    return { error: parsedBody.error.issues[0]?.message ?? "Invalid input." };
  }

  const body = parsedBody.data.length > 0 ? parsedBody.data : null;
  const result = await upsertSections(parsedWs.data, [
    { section_key: parsedKey.data, body },
  ]);
  if (result.error) return { error: result.error };
  return { success: "Saved." };
}

const draftSchema = z.object({
  communication: bodySchema,
  delivery: bodySchema,
  response_time: bodySchema,
  dealbreakers: bodySchema,
  trust: bodySchema,
  standard: bodySchema,
});

export type ManualDraftInput = z.infer<typeof draftSchema>;

/**
 * Persists a whole manual in one shot — the save side of both the AI-review screen and
 * the write-it-myself editor. Nothing here is written until the founder confirms.
 */
export async function saveManualDraft(
  workspaceId: string,
  draft: ManualDraftInput,
): Promise<ManualState> {
  const parsedWs = idSchema.safeParse(workspaceId);
  if (!parsedWs.success) return { error: "Invalid workspace." };
  const parsed = draftSchema.safeParse(draft);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid manual." };
  }

  const rows = Object.entries(parsed.data).map(([section_key, body]) => ({
    section_key,
    body: body.trim().length > 0 ? body.trim() : null,
  }));
  const result = await upsertSections(parsedWs.data, rows);
  if (result.error) return { error: result.error };
  revalidatePath(`/w/${workspaceId}/welcome`);
  return { success: "Saved." };
}
