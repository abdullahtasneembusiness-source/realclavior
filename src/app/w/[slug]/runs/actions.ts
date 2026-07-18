"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { resolveWorkspaceId } from "@/lib/workspace";
import { logActivity } from "@/lib/activity";
import type { PlaybookStep } from "@/types/db";

export type RunState = { error?: string; success?: string };

const idSchema = z.string().uuid();

function mapWriteError(code: string | undefined, fallback: string): string {
  return code === "42501" ? "You don't have permission to do that." : fallback;
}

const handOffSchema = z.object({
  membershipId: z.string().uuid({ message: "Pick who runs it." }),
  dueAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
    .optional(),
});

/**
 * Hands a playbook off to a team member as a run: a live, immutable checklist. The
 * step content is snapshotted onto run_steps so the operator's checklist never shifts
 * if the playbook is later edited. Admin-only (enforced by RLS on runs/run_steps).
 */
export async function handOffPlaybook(
  workspaceId: string,
  playbookId: string,
  _prev: RunState,
  formData: FormData,
): Promise<RunState> {
  const parsedPb = idSchema.safeParse(playbookId);
  if (!parsedPb.success) return { error: "Invalid playbook." };

  const dueRaw = formData.get("dueAt");
  const parsed = handOffSchema.safeParse({
    membershipId: formData.get("membershipId"),
    dueAt:
      typeof dueRaw === "string" && dueRaw.trim().length > 0
        ? dueRaw.trim()
        : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { membershipId, dueAt } = parsed.data;

  const supabase = await createClient();
  const wsId = await resolveWorkspaceId(supabase, workspaceId);
  if (!wsId) return { error: "Invalid playbook." };

  // Load the playbook (name) and its steps to snapshot.
  const { data: playbook } = await supabase
    .from("playbooks")
    .select("id, name, status")
    .eq("id", parsedPb.data)
    .eq("workspace_id", wsId)
    .maybeSingle();
  if (!playbook) return { error: "That playbook no longer exists." };
  if (playbook.status === "archived") {
    return { error: "You can't hand off an archived playbook." };
  }

  const { data: stepRows } = await supabase
    .from("playbook_steps")
    .select("*")
    .eq("playbook_id", parsedPb.data)
    .order("position", { ascending: true });
  const steps = (stepRows ?? []) as PlaybookStep[];
  if (steps.length === 0) {
    return { error: "Add at least one step before handing this off." };
  }

  // Confirm the assignee is an active member of this workspace.
  const { data: assignee } = await supabase
    .from("memberships")
    .select("id, title, invited_email")
    .eq("id", membershipId)
    .eq("workspace_id", wsId)
    .eq("status", "active")
    .maybeSingle();
  if (!assignee) return { error: "Pick an active team member." };

  const { data: run, error: runError } = await supabase
    .from("runs")
    .insert({
      playbook_id: parsedPb.data,
      membership_id: membershipId,
      title: playbook.name,
      due_at: dueAt ?? null,
      status: "queued",
    })
    .select("id")
    .single();

  if (runError || !run) {
    return {
      error: mapWriteError(runError?.code, "Couldn't hand off the playbook."),
    };
  }

  const { error: stepsError } = await supabase.from("run_steps").insert(
    steps.map((s) => ({
      run_id: run.id,
      playbook_step_id: s.id,
      position: s.position,
      title: s.title,
      detail: s.detail,
      link_url: s.link_url,
      requires_proof: s.requires_proof,
      done: false,
    })),
  );

  if (stepsError) {
    // Roll back the empty run so we don't leave a checklist with no steps.
    await supabase.from("runs").delete().eq("id", run.id);
    return {
      error: mapWriteError(stepsError.code, "Couldn't hand off the playbook."),
    };
  }

  revalidatePath(`/w/${workspaceId}/playbooks/${playbookId}`);
  const who = assignee.title || assignee.invited_email || "your teammate";
  return { success: `Handed off to ${who}.` };
}

/** Operator (or admin) starts a queued/returned run — moves it to in progress. */
export async function startRun(
  workspaceId: string,
  runId: string,
): Promise<RunState> {
  const parsedRun = idSchema.safeParse(runId);
  if (!parsedRun.success) return { error: "Invalid run." };

  const supabase = await createClient();
  const wsId = await resolveWorkspaceId(supabase, workspaceId);
  if (!wsId) return { error: "Invalid run." };

  const { error } = await supabase
    .from("runs")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", parsedRun.data)
    .in("status", ["queued", "changes_requested"]);

  if (error)
    return { error: mapWriteError(error.code, "Couldn't start the run.") };

  await logActivity(supabase, {
    workspaceId: wsId,
    verb: "started",
    targetType: "run",
    targetId: parsedRun.data,
  });
  revalidatePath(`/w/${workspaceId}/runs/${runId}`);
  revalidatePath(`/w/${workspaceId}`);
  return { success: "Started." };
}

const stepUpdateSchema = z.object({
  done: z.boolean(),
  proofUrl: z
    .string()
    .trim()
    .url("Enter a valid URL (including https://).")
    .optional(),
  note: z.string().trim().max(2000, "That note is a bit long.").optional(),
});

/** Ticks a step off (or back on) and saves its proof link / note. */
export async function updateRunStep(
  workspaceId: string,
  runId: string,
  runStepId: string,
  _prev: RunState,
  formData: FormData,
): Promise<RunState> {
  const parsedRun = idSchema.safeParse(runId);
  const parsedStep = idSchema.safeParse(runStepId);
  if (!parsedRun.success || !parsedStep.success)
    return { error: "Invalid step." };

  const proofRaw = formData.get("proofUrl");
  const noteRaw = formData.get("note");
  const parsed = stepUpdateSchema.safeParse({
    done: formData.get("done") === "on",
    proofUrl:
      typeof proofRaw === "string" && proofRaw.trim().length > 0
        ? proofRaw.trim()
        : undefined,
    note:
      typeof noteRaw === "string" && noteRaw.trim().length > 0
        ? noteRaw.trim()
        : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("run_steps")
    .update({
      done: parsed.data.done,
      done_at: parsed.data.done ? new Date().toISOString() : null,
      proof_url: parsed.data.proofUrl ?? null,
      note: parsed.data.note ?? null,
    })
    .eq("id", parsedStep.data)
    .eq("run_id", parsedRun.data);

  if (error)
    return { error: mapWriteError(error.code, "Couldn't save the step.") };

  revalidatePath(`/w/${workspaceId}/runs/${runId}`);
  return { success: "Saved." };
}

/** Operator submits a finished run for review. Guards completeness + required proof. */
export async function submitRun(
  workspaceId: string,
  runId: string,
): Promise<RunState> {
  const parsedRun = idSchema.safeParse(runId);
  if (!parsedRun.success) return { error: "Invalid run." };

  const supabase = await createClient();
  const wsId = await resolveWorkspaceId(supabase, workspaceId);
  if (!wsId) return { error: "Invalid run." };

  const { data: rows } = await supabase
    .from("run_steps")
    .select("done, requires_proof, proof_url")
    .eq("run_id", parsedRun.data);
  const steps = rows ?? [];

  if (steps.length === 0) return { error: "This run has no steps." };
  const unchecked = steps.filter((s) => !s.done).length;
  if (unchecked > 0) {
    return {
      error: `Finish every step first — ${unchecked} still to go.`,
    };
  }
  const missingProof = steps.filter(
    (s) => s.requires_proof && !s.proof_url,
  ).length;
  if (missingProof > 0) {
    return {
      error: `${missingProof} step${missingProof === 1 ? "" : "s"} still need proof attached.`,
    };
  }

  const { error } = await supabase
    .from("runs")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", parsedRun.data)
    .in("status", ["in_progress", "changes_requested"]);

  if (error)
    return { error: mapWriteError(error.code, "Couldn't submit the run.") };

  await logActivity(supabase, {
    workspaceId: wsId,
    verb: "submitted",
    targetType: "run",
    targetId: parsedRun.data,
  });
  revalidatePath(`/w/${workspaceId}/runs/${runId}`);
  revalidatePath(`/w/${workspaceId}`);
  return { success: "Submitted for review." };
}

/** Admin approves a submitted run — the terminal happy state. */
export async function approveRun(
  workspaceId: string,
  runId: string,
): Promise<RunState> {
  const parsedRun = idSchema.safeParse(runId);
  if (!parsedRun.success) return { error: "Invalid run." };

  const supabase = await createClient();
  const wsId = await resolveWorkspaceId(supabase, workspaceId);
  if (!wsId) return { error: "Invalid run." };

  const { error } = await supabase
    .from("runs")
    .update({ status: "approved", completed_at: new Date().toISOString() })
    .eq("id", parsedRun.data)
    .eq("status", "submitted");

  if (error)
    return { error: mapWriteError(error.code, "Couldn't approve the run.") };

  await logActivity(supabase, {
    workspaceId: wsId,
    verb: "approved",
    targetType: "run",
    targetId: parsedRun.data,
  });
  revalidatePath(`/w/${workspaceId}/runs/${runId}`);
  revalidatePath(`/w/${workspaceId}`);
  return { success: "Approved." };
}

const requestChangesSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(2, "Tell them what needs to change.")
    .max(2000, "That's a bit long — keep it tight."),
  saveToMemory: z.boolean(),
});

/**
 * Admin sends a submitted run back with a correction — and, by default, saves that
 * correction to Feedback Memory as a standing note on the playbook (run_id null) so it
 * resurfaces before every future run. Unchecked, the note is tied to just this run
 * (run_id set), so the operator still sees it on the run they're fixing without it
 * becoming permanent. This is the core interaction of the whole product.
 */
export async function requestChangesRun(
  workspaceId: string,
  runId: string,
  _prev: RunState,
  formData: FormData,
): Promise<RunState> {
  const parsedRun = idSchema.safeParse(runId);
  if (!parsedRun.success) return { error: "Invalid run." };

  const parsed = requestChangesSchema.safeParse({
    comment: formData.get("comment"),
    saveToMemory: formData.get("saveToMemory") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { comment, saveToMemory } = parsed.data;

  const supabase = await createClient();
  const wsId = await resolveWorkspaceId(supabase, workspaceId);
  if (!wsId) return { error: "Invalid run." };

  const { data: run } = await supabase
    .from("runs")
    .select("playbook_id")
    .eq("id", parsedRun.data)
    .maybeSingle();
  if (!run) return { error: "That run no longer exists." };

  const { error } = await supabase
    .from("runs")
    .update({ status: "changes_requested" })
    .eq("id", parsedRun.data)
    .eq("status", "submitted");

  if (error)
    return { error: mapWriteError(error.code, "Couldn't update the run.") };

  // Resolve the reviewer's membership so the note has an author (NOT NULL column).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase
        .from("memberships")
        .select("id")
        .eq("workspace_id", wsId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle()
    : { data: null };
  if (!me) {
    return { error: "Your session expired. Please sign in again." };
  }

  const { error: noteError } = await supabase.from("feedback_notes").insert({
    playbook_id: run.playbook_id,
    // Standing note (all future runs) vs. tied to just this run.
    run_id: saveToMemory ? null : parsedRun.data,
    author_membership_id: me.id,
    body: comment,
    resolved: false,
  });
  if (noteError) {
    return {
      error: mapWriteError(noteError.code, "Couldn't save your feedback."),
    };
  }

  await logActivity(supabase, {
    workspaceId: wsId,
    verb: "added_note",
    targetType: "playbook",
    targetId: run.playbook_id,
  });
  await logActivity(supabase, {
    workspaceId: wsId,
    verb: "requested_changes",
    targetType: "run",
    targetId: parsedRun.data,
  });
  revalidatePath(`/w/${workspaceId}/runs/${runId}`);
  revalidatePath(`/w/${workspaceId}`);
  return {
    success: saveToMemory
      ? "Sent back — and saved to Feedback Memory."
      : "Sent back for changes.",
  };
}
