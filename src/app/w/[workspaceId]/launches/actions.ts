"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { spawnLaunch } from "@/lib/launches";
import type { Launch, LaunchItem } from "@/types/db";

export type LaunchState = { error?: string; success?: string };

const idSchema = z.string().uuid();
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date.");
const permissionError = "Only founders and managers can manage launches.";

function mapWriteError(code: string | undefined, fallback: string): string {
  return code === "42501" ? permissionError : fallback;
}

function blank(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---- Launch CRUD -----------------------------------------------------------

const createSchema = z.object({
  name: z.string().trim().min(2, "Name it (at least 2 characters).").max(120),
  startDate: dateSchema.optional(),
});

/** Creates a draft launch and opens its builder. */
export async function createLaunch(
  workspaceId: string,
  _prev: LaunchState,
  formData: FormData,
): Promise<LaunchState> {
  const parsedWs = idSchema.safeParse(workspaceId);
  if (!parsedWs.success) return { error: "Invalid workspace." };

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    startDate: blank(formData.get("startDate")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid launch." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("launches")
    .insert({
      workspace_id: parsedWs.data,
      name: parsed.data.name,
      start_date: parsed.data.startDate ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: mapWriteError(error?.code, "Couldn't create the launch.") };
  }
  revalidatePath(`/w/${workspaceId}/launches`);
  redirect(`/w/${workspaceId}/launches/${data.id}`);
}

/** Updates a draft launch's name / start date. Locked once armed. */
export async function updateLaunch(
  workspaceId: string,
  launchId: string,
  _prev: LaunchState,
  formData: FormData,
): Promise<LaunchState> {
  const parsedWs = idSchema.safeParse(workspaceId);
  const parsedId = idSchema.safeParse(launchId);
  if (!parsedWs.success || !parsedId.success)
    return { error: "Invalid launch." };

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    startDate: blank(formData.get("startDate")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid launch." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("launches")
    .update({
      name: parsed.data.name,
      start_date: parsed.data.startDate ?? null,
    })
    .eq("id", parsedId.data)
    .eq("workspace_id", parsedWs.data)
    .eq("status", "draft");

  if (error) return { error: mapWriteError(error.code, "Couldn't save.") };
  revalidatePath(`/w/${workspaceId}/launches/${launchId}`);
  return { success: "Saved." };
}

/** Removes a launch (and its items, via cascade). */
export async function deleteLaunch(
  workspaceId: string,
  launchId: string,
): Promise<LaunchState> {
  const parsedWs = idSchema.safeParse(workspaceId);
  const parsedId = idSchema.safeParse(launchId);
  if (!parsedWs.success || !parsedId.success)
    return { error: "Invalid launch." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("launches")
    .delete()
    .eq("id", parsedId.data)
    .eq("workspace_id", parsedWs.data);
  if (error) return { error: mapWriteError(error.code, "Couldn't delete.") };

  revalidatePath(`/w/${workspaceId}/launches`);
  redirect(`/w/${workspaceId}/launches`);
}

// ---- Launch items ----------------------------------------------------------

const itemSchema = z.object({
  playbookId: z.string().uuid({ message: "Pick a playbook." }),
  membershipId: z.string().uuid({ message: "Pick who runs it." }),
  offsetDays: z.coerce
    .number()
    .int()
    .min(-60, "Offset is too far back.")
    .max(365, "Offset is too far out."),
  dueTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
});

/** Adds an item to a draft launch. */
export async function addLaunchItem(
  workspaceId: string,
  launchId: string,
  _prev: LaunchState,
  formData: FormData,
): Promise<LaunchState> {
  const parsedWs = idSchema.safeParse(workspaceId);
  const parsedId = idSchema.safeParse(launchId);
  if (!parsedWs.success || !parsedId.success)
    return { error: "Invalid launch." };

  const parsed = itemSchema.safeParse({
    playbookId: formData.get("playbookId"),
    membershipId: formData.get("membershipId"),
    offsetDays: formData.get("offsetDays") ?? 0,
    dueTime: blank(formData.get("dueTime")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid item." };
  }

  const supabase = await createClient();
  // Guard against adding to an armed/live launch.
  const { data: launch } = await supabase
    .from("launches")
    .select("status")
    .eq("id", parsedId.data)
    .eq("workspace_id", parsedWs.data)
    .maybeSingle();
  if (!launch) return { error: "That launch no longer exists." };
  if (launch.status !== "draft") {
    return { error: "Un-arm the launch to change its items." };
  }

  const { error } = await supabase.from("launch_items").insert({
    launch_id: parsedId.data,
    playbook_id: parsed.data.playbookId,
    membership_id: parsed.data.membershipId,
    offset_days: parsed.data.offsetDays,
    due_time: parsed.data.dueTime ?? null,
  });
  if (error) return { error: mapWriteError(error.code, "Couldn't add that.") };

  revalidatePath(`/w/${workspaceId}/launches/${launchId}`);
  return { success: "Added." };
}

/** Removes a launch item (draft launches only). */
export async function removeLaunchItem(
  workspaceId: string,
  launchId: string,
  itemId: string,
): Promise<LaunchState> {
  const parsedWs = idSchema.safeParse(workspaceId);
  const parsedId = idSchema.safeParse(launchId);
  const parsedItem = idSchema.safeParse(itemId);
  if (!parsedWs.success || !parsedId.success || !parsedItem.success)
    return { error: "Invalid item." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("launch_items")
    .delete()
    .eq("id", parsedItem.data)
    .eq("launch_id", parsedId.data);
  if (error) return { error: mapWriteError(error.code, "Couldn't remove.") };

  revalidatePath(`/w/${workspaceId}/launches/${launchId}`);
  return { success: "Removed." };
}

// ---- Spawn (arm → live) ----------------------------------------------------

/**
 * Arms a launch: locks its structure. If the start date is already here (today or
 * past — e.g. armed a day late), it goes live immediately, spawning any runs that
 * should already have started rather than skipping them. A future-dated launch stays
 * armed until checkDueLaunches (or a real cron) fires on the day.
 */
export async function armLaunch(
  workspaceId: string,
  launchId: string,
): Promise<LaunchState> {
  const parsedWs = idSchema.safeParse(workspaceId);
  const parsedId = idSchema.safeParse(launchId);
  if (!parsedWs.success || !parsedId.success)
    return { error: "Invalid launch." };

  const supabase = await createClient();
  const { data: launchRow } = await supabase
    .from("launches")
    .select("*")
    .eq("id", parsedId.data)
    .eq("workspace_id", parsedWs.data)
    .maybeSingle();
  const launch = launchRow as Launch | null;
  if (!launch) return { error: "That launch no longer exists." };
  if (!launch.start_date) return { error: "Set a start date before arming." };
  if (launch.status !== "draft") return { error: "Already armed." };

  const { count } = await supabase
    .from("launch_items")
    .select("id", { count: "exact", head: true })
    .eq("launch_id", launch.id);
  if ((count ?? 0) === 0) {
    return { error: "Add at least one item before arming." };
  }

  const { error } = await supabase
    .from("launches")
    .update({ status: "armed" })
    .eq("id", launch.id)
    .eq("workspace_id", parsedWs.data)
    .eq("status", "draft");
  if (error) return { error: mapWriteError(error.code, "Couldn't arm it.") };

  if (launch.start_date <= today()) {
    await spawnLaunch(supabase, parsedWs.data, {
      ...launch,
      status: "armed",
    });
  }

  revalidatePath(`/w/${workspaceId}/launches/${launchId}`);
  revalidatePath(`/w/${workspaceId}/launches`);
  return { success: "Armed." };
}

/** Un-arms an armed (not yet live) launch back to draft so it can be edited. */
export async function disarmLaunch(
  workspaceId: string,
  launchId: string,
): Promise<LaunchState> {
  const parsedWs = idSchema.safeParse(workspaceId);
  const parsedId = idSchema.safeParse(launchId);
  if (!parsedWs.success || !parsedId.success)
    return { error: "Invalid launch." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("launches")
    .update({ status: "draft" })
    .eq("id", parsedId.data)
    .eq("workspace_id", parsedWs.data)
    .eq("status", "armed");
  if (error) return { error: mapWriteError(error.code, "Couldn't un-arm.") };

  revalidatePath(`/w/${workspaceId}/launches/${launchId}`);
  return { success: "Back to draft." };
}

/** Marks a live launch complete once the founder considers it wrapped. */
export async function completeLaunch(
  workspaceId: string,
  launchId: string,
): Promise<LaunchState> {
  const parsedWs = idSchema.safeParse(workspaceId);
  const parsedId = idSchema.safeParse(launchId);
  if (!parsedWs.success || !parsedId.success)
    return { error: "Invalid launch." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("launches")
    .update({ status: "complete" })
    .eq("id", parsedId.data)
    .eq("workspace_id", parsedWs.data)
    .eq("status", "live");
  if (error) return { error: mapWriteError(error.code, "Couldn't complete.") };

  revalidatePath(`/w/${workspaceId}/launches/${launchId}`);
  revalidatePath(`/w/${workspaceId}/launches`);
  return { success: "Marked complete." };
}

/**
 * Catch-up spawn: fires any armed launches whose start date has arrived. A stand-in for
 * the daily cron job that would normally do this — invoked opportunistically when a
 * founder opens the launches area. Safe to call repeatedly (spawnLaunch is idempotent).
 */
export async function checkDueLaunches(workspaceId: string): Promise<void> {
  const parsedWs = idSchema.safeParse(workspaceId);
  if (!parsedWs.success) return;

  const supabase = await createClient();
  const { data: dueRows } = await supabase
    .from("launches")
    .select("*")
    .eq("workspace_id", parsedWs.data)
    .eq("status", "armed")
    .lte("start_date", today());

  const due = (dueRows ?? []) as Launch[];
  if (due.length === 0) return;

  for (const launch of due) {
    await spawnLaunch(supabase, parsedWs.data, launch);
  }
  revalidatePath(`/w/${workspaceId}/launches`);
}

// ---- Templates -------------------------------------------------------------

const templateNameSchema = z
  .string()
  .trim()
  .min(2, "Name the template.")
  .max(120);

/** Saves a launch's structure (items minus dates) as a reusable template. */
export async function saveAsTemplate(
  workspaceId: string,
  launchId: string,
  _prev: LaunchState,
  formData: FormData,
): Promise<LaunchState> {
  const parsedWs = idSchema.safeParse(workspaceId);
  const parsedId = idSchema.safeParse(launchId);
  if (!parsedWs.success || !parsedId.success)
    return { error: "Invalid launch." };
  const parsedName = templateNameSchema.safeParse(formData.get("name"));
  if (!parsedName.success) {
    return { error: parsedName.error.issues[0]?.message ?? "Invalid name." };
  }

  const supabase = await createClient();
  const { data: itemRows } = await supabase
    .from("launch_items")
    .select("*")
    .eq("launch_id", parsedId.data);
  const items = (itemRows ?? []) as LaunchItem[];

  const { data: template, error } = await supabase
    .from("launches")
    .insert({
      workspace_id: parsedWs.data,
      name: parsedName.data,
      is_template: true,
      start_date: null,
    })
    .select("id")
    .single();
  if (error || !template) {
    return { error: mapWriteError(error?.code, "Couldn't save the template.") };
  }

  if (items.length > 0) {
    await supabase.from("launch_items").insert(
      items.map((i) => ({
        launch_id: template.id,
        playbook_id: i.playbook_id,
        membership_id: i.membership_id,
        offset_days: i.offset_days,
        due_time: i.due_time,
      })),
    );
  }

  revalidatePath(`/w/${workspaceId}/launches`);
  return { success: "Saved as template." };
}

const fromTemplateSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().trim().min(2, "Name it.").max(120),
  startDate: dateSchema.optional(),
});

/** Creates a fresh draft launch from a template, copying its items (offsets, owners). */
export async function createFromTemplate(
  workspaceId: string,
  _prev: LaunchState,
  formData: FormData,
): Promise<LaunchState> {
  const parsedWs = idSchema.safeParse(workspaceId);
  if (!parsedWs.success) return { error: "Invalid workspace." };
  const parsed = fromTemplateSchema.safeParse({
    templateId: formData.get("templateId"),
    name: formData.get("name"),
    startDate: blank(formData.get("startDate")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { data: tItems } = await supabase
    .from("launch_items")
    .select("*")
    .eq("launch_id", parsed.data.templateId);
  const items = (tItems ?? []) as LaunchItem[];

  const { data: launch, error } = await supabase
    .from("launches")
    .insert({
      workspace_id: parsedWs.data,
      name: parsed.data.name,
      start_date: parsed.data.startDate ?? null,
    })
    .select("id")
    .single();
  if (error || !launch) {
    return { error: mapWriteError(error?.code, "Couldn't create the launch.") };
  }

  if (items.length > 0) {
    await supabase.from("launch_items").insert(
      items.map((i) => ({
        launch_id: launch.id,
        playbook_id: i.playbook_id,
        membership_id: i.membership_id,
        offset_days: i.offset_days,
        due_time: i.due_time,
      })),
    );
  }

  revalidatePath(`/w/${workspaceId}/launches`);
  redirect(`/w/${workspaceId}/launches/${launch.id}`);
}
