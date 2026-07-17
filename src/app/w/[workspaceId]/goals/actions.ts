"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { GoalStatus } from "@/types/db";

export type GoalState = { error?: string; success?: string };

const workspaceIdSchema = z.string().uuid();
const idSchema = z.string().uuid();

const permissionError = "Only founders and managers can manage goals.";

function mapWriteError(code: string | undefined, fallback: string): string {
  return code === "42501" ? permissionError : fallback;
}

function blankToUndefined(
  value: FormDataEntryValue | null,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const labelSchema = z
  .string()
  .trim()
  .min(2, "Give the goal a label (at least 2 characters).")
  .max(120, "Keep the label under 120 characters.");

const goalFields = {
  label: labelSchema,
  description: z
    .string()
    .trim()
    .max(2000, "That description is a bit long.")
    .optional(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date.")
    .optional(),
  progress: z.coerce
    .number()
    .int()
    .min(0, "Progress can't be below 0.")
    .max(100, "Progress can't be above 100."),
};

const createSchema = z.object(goalFields);

/** Creates a goal and drops the founder onto its detail page. */
export async function createGoal(
  workspaceId: string,
  _prev: GoalState,
  formData: FormData,
): Promise<GoalState> {
  const parsedWs = workspaceIdSchema.safeParse(workspaceId);
  if (!parsedWs.success) return { error: "Invalid workspace." };

  const parsed = createSchema.safeParse({
    label: formData.get("label"),
    description: blankToUndefined(formData.get("description")),
    targetDate: blankToUndefined(formData.get("targetDate")),
    progress: formData.get("progress") ?? 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid goal." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goals")
    .insert({
      workspace_id: parsedWs.data,
      label: parsed.data.label,
      description: parsed.data.description ?? null,
      target_date: parsed.data.targetDate ?? null,
      progress: parsed.data.progress,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: mapWriteError(error?.code, "Couldn't create the goal.") };
  }

  revalidatePath(`/w/${workspaceId}/goals`);
  redirect(`/w/${workspaceId}/goals/${data.id}`);
}

const updateSchema = z.object(goalFields);

/** Updates a goal's label, description, target date, and progress. */
export async function updateGoal(
  workspaceId: string,
  goalId: string,
  _prev: GoalState,
  formData: FormData,
): Promise<GoalState> {
  const parsedWs = workspaceIdSchema.safeParse(workspaceId);
  const parsedId = idSchema.safeParse(goalId);
  if (!parsedWs.success || !parsedId.success) return { error: "Invalid goal." };

  const parsed = updateSchema.safeParse({
    label: formData.get("label"),
    description: blankToUndefined(formData.get("description")),
    targetDate: blankToUndefined(formData.get("targetDate")),
    progress: formData.get("progress") ?? 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid goal." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .update({
      label: parsed.data.label,
      description: parsed.data.description ?? null,
      target_date: parsed.data.targetDate ?? null,
      progress: parsed.data.progress,
    })
    .eq("id", parsedId.data)
    .eq("workspace_id", parsedWs.data);

  if (error) {
    return { error: mapWriteError(error.code, "Couldn't save the goal.") };
  }

  revalidatePath(`/w/${workspaceId}/goals/${goalId}`);
  revalidatePath(`/w/${workspaceId}/goals`);
  return { success: "Saved." };
}

const statusSchema = z.enum(["active", "done", "archived"]);

/** Flips a goal's status (mark done, reopen, archive). */
export async function setGoalStatus(
  workspaceId: string,
  goalId: string,
  status: GoalStatus,
): Promise<GoalState> {
  const parsedWs = workspaceIdSchema.safeParse(workspaceId);
  const parsedId = idSchema.safeParse(goalId);
  const parsedStatus = statusSchema.safeParse(status);
  if (!parsedWs.success || !parsedId.success || !parsedStatus.success)
    return { error: "Invalid request." };

  const supabase = await createClient();
  // Marking a goal done also snaps its progress to 100 — the two should never disagree.
  const patch =
    parsedStatus.data === "done"
      ? { status: parsedStatus.data, progress: 100 }
      : { status: parsedStatus.data };

  const { error } = await supabase
    .from("goals")
    .update(patch)
    .eq("id", parsedId.data)
    .eq("workspace_id", parsedWs.data);

  if (error) {
    return { error: mapWriteError(error.code, "Couldn't update the goal.") };
  }

  revalidatePath(`/w/${workspaceId}/goals/${goalId}`);
  revalidatePath(`/w/${workspaceId}/goals`);
  if (parsedStatus.data === "archived") {
    redirect(`/w/${workspaceId}/goals`);
  }
  return { success: "Updated." };
}
