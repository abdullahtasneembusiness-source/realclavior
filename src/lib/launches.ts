import type { SupabaseClient } from "@supabase/supabase-js";

import { logActivity } from "@/lib/activity";
import type { Launch, LaunchItem, PlaybookStep } from "@/types/db";

/**
 * Shared launch-spawning core. Deliberately client-agnostic (accepts any Supabase
 * client) so the exact same snapshot logic runs two ways:
 *  - from the armLaunch/checkDueLaunches server actions, on the founder's RLS-scoped
 *    client (same-day arming + opportunistic catch-up), and
 *  - from the /api/cron/launches daily job, on the service-role client, which sees every
 *    workspace so a future-dated launch fires on its day even if nobody opens the app.
 */

/**
 * due_at = start_date + offset_days (+ due_time, else 17:00 UTC). Kept in UTC — a
 * launch's schedule is date-shaped, not tied to a viewer's timezone, in v1.
 */
export function computeDueAt(
  startDate: string,
  offsetDays: number,
  dueTime: string | null,
): string {
  const d = new Date(`${startDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  if (dueTime) {
    const [h, m] = dueTime.split(":").map((n) => Number(n));
    d.setUTCHours(h ?? 0, m ?? 0, 0, 0);
  } else {
    d.setUTCHours(17, 0, 0, 0);
  }
  return d.toISOString();
}

/**
 * Spawns real runs for every item of a launch that has just gone live, flipping it
 * 'armed' → 'live' atomically FIRST so the transition itself is the idempotency gate.
 *
 * The claim is a conditional update (`... where status = 'armed'`) that returns the row
 * only to the caller that actually performed the flip. Any concurrent or retried
 * invocation — two overlapping cron ticks, a cron racing arm-time, a re-fired job — sees
 * zero rows updated and returns without spawning, so a launch's runs are created exactly
 * once. (The old order spawned first and flipped last, which let a second call re-spawn
 * a launch whose flip hadn't landed yet.)
 *
 * Each spawned run is an immutable snapshot, exactly like a hand-off: the playbook name
 * on the run and the step content on run_steps, with due_at = start + offset (+ time).
 * Returns the number of runs spawned.
 */
export async function spawnLaunch(
  supabase: SupabaseClient,
  workspaceId: string,
  launch: Launch,
): Promise<number> {
  if (launch.status !== "armed" || !launch.start_date) return 0;

  // Atomically claim the launch. Only the caller that flips armed→live proceeds.
  const { data: claimed, error: claimError } = await supabase
    .from("launches")
    .update({ status: "live" })
    .eq("id", launch.id)
    .eq("status", "armed")
    .select("id");
  // eslint-disable-next-line no-console
  console.error(
    `[spawn] claim launch=${launch.id} rows=${claimed?.length ?? 0} err=${claimError?.message ?? "none"}`,
  );
  if (!claimed || claimed.length === 0) return 0;

  const { data: itemRows, error: itemError } = await supabase
    .from("launch_items")
    .select("*")
    .eq("launch_id", launch.id);
  const items = (itemRows ?? []) as LaunchItem[];
  // eslint-disable-next-line no-console
  console.error(
    `[spawn] items launch=${launch.id} count=${items.length} err=${itemError?.message ?? "none"}`,
  );
  if (items.length === 0) return 0;

  const playbookIds = Array.from(new Set(items.map((i) => i.playbook_id)));
  const [{ data: pbRows }, { data: stepRows }] = await Promise.all([
    supabase
      .from("playbooks")
      .select("id, name, status, owner_membership_id")
      .in("id", playbookIds),
    supabase
      .from("playbook_steps")
      .select("*")
      .in("playbook_id", playbookIds)
      .order("position", { ascending: true }),
  ]);

  const playbooks = new Map(
    (pbRows ?? []).map((p) => [
      p.id,
      p as {
        id: string;
        name: string;
        status: string;
        owner_membership_id: string | null;
      },
    ]),
  );
  const stepsByPlaybook = new Map<string, PlaybookStep[]>();
  for (const s of (stepRows ?? []) as PlaybookStep[]) {
    const list = stepsByPlaybook.get(s.playbook_id) ?? [];
    list.push(s);
    stepsByPlaybook.set(s.playbook_id, list);
  }

  let spawned = 0;
  for (const item of items) {
    const pb = playbooks.get(item.playbook_id);
    if (!pb || pb.status === "archived") continue;
    const owner = item.membership_id ?? pb.owner_membership_id;
    if (!owner) continue;
    const steps = stepsByPlaybook.get(item.playbook_id) ?? [];
    if (steps.length === 0) continue;

    const { data: run, error: runError } = await supabase
      .from("runs")
      .insert({
        playbook_id: item.playbook_id,
        membership_id: owner,
        launch_id: launch.id,
        title: pb.name,
        due_at: computeDueAt(launch.start_date, item.offset_days, item.due_time),
        status: "queued",
      })
      .select("id")
      .single();
    // eslint-disable-next-line no-console
    console.error(
      `[spawn] run launch=${launch.id} run=${run?.id ?? "null"} err=${runError?.message ?? "none"}`,
    );
    if (runError || !run) continue;

    await supabase.from("run_steps").insert(
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
    spawned += 1;
  }

  // Best-effort activity: logs a 'launched' entry when there's a signed-in user (the
  // action path). The cron's service-role client has no user, so it no-ops silently.
  await logActivity(supabase, {
    workspaceId,
    verb: "launched",
    targetType: "launch",
    targetId: launch.id,
  });

  return spawned;
}
