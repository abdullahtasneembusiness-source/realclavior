"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type FeedbackState = { error?: string; success?: string };

const idSchema = z.string().uuid();

function mapWriteError(code: string | undefined, fallback: string): string {
  return code === "42501"
    ? "Only founders and managers can manage feedback."
    : fallback;
}

/** Resolves a note — it stops showing in the operator's "Before you start" panel. */
export async function resolveFeedbackNote(
  workspaceId: string,
  playbookId: string,
  noteId: string,
): Promise<FeedbackState> {
  const parsedWs = idSchema.safeParse(workspaceId);
  const parsedPb = idSchema.safeParse(playbookId);
  const parsedNote = idSchema.safeParse(noteId);
  if (!parsedWs.success || !parsedPb.success || !parsedNote.success)
    return { error: "Invalid note." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("feedback_notes")
    .update({ resolved: true })
    .eq("id", parsedNote.data)
    .eq("playbook_id", parsedPb.data);

  if (error)
    return { error: mapWriteError(error.code, "Couldn't resolve that note.") };

  revalidatePath(`/w/${workspaceId}/playbooks/${playbookId}`);
  return { success: "Resolved." };
}

const editSchema = z
  .string()
  .trim()
  .min(2, "The note can't be empty.")
  .max(2000, "That's a bit long — keep it tight.");

/** Edits a note's wording in place. */
export async function updateFeedbackNote(
  workspaceId: string,
  playbookId: string,
  noteId: string,
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const parsedWs = idSchema.safeParse(workspaceId);
  const parsedPb = idSchema.safeParse(playbookId);
  const parsedNote = idSchema.safeParse(noteId);
  if (!parsedWs.success || !parsedPb.success || !parsedNote.success)
    return { error: "Invalid note." };

  const parsed = editSchema.safeParse(formData.get("body"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid note." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("feedback_notes")
    .update({ body: parsed.data })
    .eq("id", parsedNote.data)
    .eq("playbook_id", parsedPb.data);

  if (error)
    return { error: mapWriteError(error.code, "Couldn't save that note.") };

  revalidatePath(`/w/${workspaceId}/playbooks/${playbookId}`);
  return { success: "Saved." };
}

/**
 * Feedback distiller: turns a raw, rambling correction into one crisp standing rule.
 * A helpful assist, never required — the review flow works fully without it. Only
 * offered when an Anthropic key is configured (the caller checks feedbackDistiller-
 * Available()); if the call fails for any reason it degrades to the founder's own text.
 */
export async function distillFeedback(
  raw: string,
): Promise<{ text?: string; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "not_configured" };

  const input = raw.trim();
  if (input.length < 2) return { error: "Nothing to clean up yet." };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
        max_tokens: 200,
        system:
          "You turn a founder's raw, messy correction to a team member into ONE crisp standing rule, in plain direct language, imperative voice, no preamble, one or two sentences max. Return only the rule text, nothing else.",
        messages: [{ role: "user", content: input }],
      }),
    });
    if (!res.ok) return { error: "Couldn't reach the cleanup service." };
    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = data.content?.find((c) => c.type === "text")?.text?.trim();
    if (!text) return { error: "Couldn't clean that up — keep your wording." };
    return { text };
  } catch {
    return { error: "Couldn't reach the cleanup service." };
  }
}
