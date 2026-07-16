"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { PlaybookStatus } from "@/types/db";

export type PlaybookState = { error?: string; success?: string };

const workspaceIdSchema = z.string().uuid();
const idSchema = z.string().uuid();

/** Empty string / whitespace-only form fields come through as "" — treat as absent. */
function blankToUndefined(
  value: FormDataEntryValue | null,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const nameSchema = z
  .string()
  .trim()
  .min(2, "Give your playbook a name (at least 2 characters).")
  .max(80, "Keep the name under 80 characters.");

const permissionError = "Only founders and managers can manage playbooks.";

function mapWriteError(code: string | undefined, fallback: string): string {
  return code === "42501" ? permissionError : fallback;
}

/**
 * Creates a playbook shell (name + optional description) and drops the author
 * straight into its editor. RLS's playbooks_admin_write requires the caller be an
 * admin of this workspace, so a forged workspaceId just fails at the database.
 */
export async function createPlaybook(
  workspaceId: string,
  _prev: PlaybookState,
  formData: FormData,
): Promise<PlaybookState> {
  const parsedWs = workspaceIdSchema.safeParse(workspaceId);
  if (!parsedWs.success) return { error: "Invalid workspace." };

  const parsedName = nameSchema.safeParse(formData.get("name"));
  if (!parsedName.success) {
    return { error: parsedName.error.issues[0]?.message ?? "Invalid name." };
  }
  const description = blankToUndefined(formData.get("description"));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("playbooks")
    .insert({
      workspace_id: parsedWs.data,
      name: parsedName.data,
      description: description ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      error: mapWriteError(error?.code, "Couldn't create the playbook."),
    };
  }

  revalidatePath(`/w/${workspaceId}/playbooks`);
  redirect(`/w/${workspaceId}/playbooks/${data.id}`);
}

const metaSchema = z.object({
  name: nameSchema,
  description: z
    .string()
    .trim()
    .max(2000, "That description is a bit long.")
    .optional(),
  ownerMembershipId: z.string().uuid().optional(),
  estMinutes: z
    .number()
    .int()
    .min(1, "Estimated time must be at least 1 minute.")
    .max(100000, "That estimate is unrealistically large.")
    .optional(),
  schedule: z.enum(["none", "daily", "weekly", "monthly"], {
    message: "Pick a cadence.",
  }),
});

/** Updates a playbook's metadata (name, description, owner, estimate, cadence). */
export async function updatePlaybookMeta(
  workspaceId: string,
  playbookId: string,
  _prev: PlaybookState,
  formData: FormData,
): Promise<PlaybookState> {
  const parsedWs = workspaceIdSchema.safeParse(workspaceId);
  const parsedId = idSchema.safeParse(playbookId);
  if (!parsedWs.success || !parsedId.success)
    return { error: "Invalid playbook." };

  const estRaw = blankToUndefined(formData.get("estMinutes"));
  const parsed = metaSchema.safeParse({
    name: formData.get("name"),
    description: blankToUndefined(formData.get("description")),
    ownerMembershipId: blankToUndefined(formData.get("ownerMembershipId")),
    estMinutes: estRaw === undefined ? undefined : Number(estRaw),
    schedule: formData.get("schedule"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { name, description, ownerMembershipId, estMinutes, schedule } =
    parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("playbooks")
    .update({
      name,
      description: description ?? null,
      owner_membership_id: ownerMembershipId ?? null,
      est_minutes: estMinutes ?? null,
      schedule,
    })
    .eq("id", parsedId.data)
    .eq("workspace_id", parsedWs.data);

  if (error) {
    return { error: mapWriteError(error.code, "Couldn't save your changes.") };
  }

  revalidatePath(`/w/${workspaceId}/playbooks/${playbookId}`);
  revalidatePath(`/w/${workspaceId}/playbooks`);
  return { success: "Saved." };
}

const statusSchema = z.enum(["active", "paused", "archived"]);

/** Flips a playbook's lifecycle status (active ⇄ paused, or archive). */
export async function setPlaybookStatus(
  workspaceId: string,
  playbookId: string,
  status: PlaybookStatus,
): Promise<PlaybookState> {
  const parsedWs = workspaceIdSchema.safeParse(workspaceId);
  const parsedId = idSchema.safeParse(playbookId);
  const parsedStatus = statusSchema.safeParse(status);
  if (!parsedWs.success || !parsedId.success || !parsedStatus.success)
    return { error: "Invalid request." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("playbooks")
    .update({ status: parsedStatus.data })
    .eq("id", parsedId.data)
    .eq("workspace_id", parsedWs.data);

  if (error) {
    return {
      error: mapWriteError(error.code, "Couldn't update the playbook."),
    };
  }

  revalidatePath(`/w/${workspaceId}/playbooks/${playbookId}`);
  revalidatePath(`/w/${workspaceId}/playbooks`);
  if (parsedStatus.data === "archived") {
    redirect(`/w/${workspaceId}/playbooks`);
  }
  return { success: "Updated." };
}

const stepSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Give the step a title (at least 2 characters).")
    .max(140, "Keep the step title under 140 characters."),
  detail: z.string().trim().max(2000, "That detail is a bit long.").optional(),
  linkUrl: z
    .string()
    .trim()
    .url("Enter a valid URL (including https://).")
    .optional(),
  requiresProof: z.boolean(),
});

function parseStepForm(formData: FormData) {
  return stepSchema.safeParse({
    title: formData.get("title"),
    detail: blankToUndefined(formData.get("detail")),
    linkUrl: blankToUndefined(formData.get("linkUrl")),
    requiresProof: formData.get("requiresProof") === "on",
  });
}

/** Appends a step to the end of a playbook. */
export async function addStep(
  workspaceId: string,
  playbookId: string,
  _prev: PlaybookState,
  formData: FormData,
): Promise<PlaybookState> {
  const parsedWs = workspaceIdSchema.safeParse(workspaceId);
  const parsedId = idSchema.safeParse(playbookId);
  if (!parsedWs.success || !parsedId.success)
    return { error: "Invalid playbook." };

  const parsed = parseStepForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid step." };
  }

  const supabase = await createClient();

  // Next position = one past the current highest. A fresh playbook starts at 0.
  const { data: last } = await supabase
    .from("playbook_steps")
    .select("position")
    .eq("playbook_id", parsedId.data)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = (last?.position ?? -1) + 1;

  const { error } = await supabase.from("playbook_steps").insert({
    playbook_id: parsedId.data,
    position: nextPosition,
    title: parsed.data.title,
    detail: parsed.data.detail ?? null,
    link_url: parsed.data.linkUrl ?? null,
    requires_proof: parsed.data.requiresProof,
  });

  if (error) {
    return { error: mapWriteError(error.code, "Couldn't add that step.") };
  }

  revalidatePath(`/w/${workspaceId}/playbooks/${playbookId}`);
  return { success: "Step added." };
}

/** Edits a single step in place. */
export async function updateStep(
  workspaceId: string,
  playbookId: string,
  stepId: string,
  _prev: PlaybookState,
  formData: FormData,
): Promise<PlaybookState> {
  const parsedWs = workspaceIdSchema.safeParse(workspaceId);
  const parsedPb = idSchema.safeParse(playbookId);
  const parsedStep = idSchema.safeParse(stepId);
  if (!parsedWs.success || !parsedPb.success || !parsedStep.success)
    return { error: "Invalid step." };

  const parsed = parseStepForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid step." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("playbook_steps")
    .update({
      title: parsed.data.title,
      detail: parsed.data.detail ?? null,
      link_url: parsed.data.linkUrl ?? null,
      requires_proof: parsed.data.requiresProof,
    })
    .eq("id", parsedStep.data)
    .eq("playbook_id", parsedPb.data);

  if (error) {
    return { error: mapWriteError(error.code, "Couldn't save that step.") };
  }

  revalidatePath(`/w/${workspaceId}/playbooks/${playbookId}`);
  return { success: "Step saved." };
}

/** Removes a step. Remaining steps keep their positions (gaps are harmless). */
export async function deleteStep(
  workspaceId: string,
  playbookId: string,
  stepId: string,
): Promise<PlaybookState> {
  const parsedWs = workspaceIdSchema.safeParse(workspaceId);
  const parsedPb = idSchema.safeParse(playbookId);
  const parsedStep = idSchema.safeParse(stepId);
  if (!parsedWs.success || !parsedPb.success || !parsedStep.success)
    return { error: "Invalid step." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("playbook_steps")
    .delete()
    .eq("id", parsedStep.data)
    .eq("playbook_id", parsedPb.data);

  if (error) {
    return { error: mapWriteError(error.code, "Couldn't delete that step.") };
  }

  revalidatePath(`/w/${workspaceId}/playbooks/${playbookId}`);
  return { success: "Step removed." };
}

/**
 * Moves a step one slot up or down by swapping `position` with its neighbour.
 * Reads the ordered list first so the swap is against the true adjacent step,
 * regardless of any gaps left by deletes.
 */
export async function moveStep(
  workspaceId: string,
  playbookId: string,
  stepId: string,
  direction: "up" | "down",
): Promise<PlaybookState> {
  const parsedWs = workspaceIdSchema.safeParse(workspaceId);
  const parsedPb = idSchema.safeParse(playbookId);
  const parsedStep = idSchema.safeParse(stepId);
  if (!parsedWs.success || !parsedPb.success || !parsedStep.success)
    return { error: "Invalid step." };

  const supabase = await createClient();
  const { data: steps, error: readError } = await supabase
    .from("playbook_steps")
    .select("id, position")
    .eq("playbook_id", parsedPb.data)
    .order("position", { ascending: true });

  if (readError || !steps) {
    return { error: "Couldn't reorder the steps." };
  }

  const index = steps.findIndex((s) => s.id === parsedStep.data);
  if (index === -1) return { error: "That step no longer exists." };

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= steps.length) {
    // Already at the edge — nothing to do, not an error.
    return { success: "No change." };
  }

  const current = steps[index];
  const neighbour = steps[swapWith];

  // Two-step swap through a temporary position keeps things sane even if a unique
  // index is added on (playbook_id, position) later.
  const temp = -1 - index;
  const updates = [
    supabase
      .from("playbook_steps")
      .update({ position: temp })
      .eq("id", current.id)
      .eq("playbook_id", parsedPb.data),
  ];
  for (const op of updates) {
    const { error } = await op;
    if (error)
      return {
        error: mapWriteError(error.code, "Couldn't reorder the steps."),
      };
  }

  const { error: e1 } = await supabase
    .from("playbook_steps")
    .update({ position: current.position })
    .eq("id", neighbour.id)
    .eq("playbook_id", parsedPb.data);
  if (e1)
    return { error: mapWriteError(e1.code, "Couldn't reorder the steps.") };

  const { error: e2 } = await supabase
    .from("playbook_steps")
    .update({ position: neighbour.position })
    .eq("id", current.id)
    .eq("playbook_id", parsedPb.data);
  if (e2)
    return { error: mapWriteError(e2.code, "Couldn't reorder the steps.") };

  revalidatePath(`/w/${workspaceId}/playbooks/${playbookId}`);
  return { success: "Reordered." };
}
