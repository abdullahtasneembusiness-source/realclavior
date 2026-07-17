import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Drift Signals (Addition B): intelligence over the feedback_notes Clovior already
 * captures. Everything here is framed for COACHING, never surveillance — the callers
 * surface "worth a check-in", never "underperforming", and only founders/managers ever
 * see it (all its surfaces are admin-only pages).
 *
 * Attribution: a note is "about" the operator who ran it — the run's assignee when the
 * note is tied to a run, otherwise the playbook's current owner (for a standing note).
 */

export interface AttributedNote {
  id: string;
  playbookId: string;
  playbookName: string;
  operatorId: string | null;
  createdAt: string;
}

interface FeedbackJoinRow {
  id: string;
  playbook_id: string;
  run_id: string | null;
  created_at: string;
  playbooks:
    | { name: string; owner_membership_id: string | null }
    | { name: string; owner_membership_id: string | null }[]
    | null;
}

function playbookOf(row: FeedbackJoinRow): {
  name: string;
  owner: string | null;
} {
  const p = row.playbooks;
  const one = Array.isArray(p) ? p[0] : p;
  return {
    name: one?.name ?? "A playbook",
    owner: one?.owner_membership_id ?? null,
  };
}

/** All feedback since `sinceIso`, each attributed to the operator it's about. */
export async function attributedFeedback(
  supabase: SupabaseServerClient,
  workspaceId: string,
  sinceIso: string,
): Promise<AttributedNote[]> {
  const { data } = await supabase
    .from("feedback_notes")
    .select(
      "id, playbook_id, run_id, created_at, playbooks!inner(name, owner_membership_id, workspace_id)",
    )
    .eq("playbooks.workspace_id", workspaceId)
    .gte("created_at", sinceIso);

  const rows = (data ?? []) as FeedbackJoinRow[];

  // Resolve the assignee for run-tied notes in one query.
  const runIds = Array.from(
    new Set(rows.filter((r) => r.run_id).map((r) => r.run_id as string)),
  );
  const runOperator = new Map<string, string | null>();
  if (runIds.length > 0) {
    const { data: runs } = await supabase
      .from("runs")
      .select("id, membership_id")
      .in("id", runIds);
    for (const r of runs ?? []) runOperator.set(r.id, r.membership_id);
  }

  return rows.map((row) => {
    const pb = playbookOf(row);
    const operatorId = row.run_id
      ? (runOperator.get(row.run_id) ?? null)
      : pb.owner;
    return {
      id: row.id,
      playbookId: row.playbook_id,
      playbookName: pb.name,
      operatorId,
      createdAt: row.created_at,
    };
  });
}

export interface RecurringSignal {
  playbookId: string;
  playbookName: string;
  operatorId: string;
  count: number;
}

/**
 * A recurring signal = the same operator racking up multiple notes on the same playbook
 * in the window. `minCount` (default 3) keeps it to real patterns, not one-offs.
 */
export function recurringSignals(
  notes: AttributedNote[],
  minCount = 3,
): RecurringSignal[] {
  const groups = new Map<string, RecurringSignal>();
  for (const n of notes) {
    if (!n.operatorId) continue;
    const key = `${n.playbookId}:${n.operatorId}`;
    const g = groups.get(key) ?? {
      playbookId: n.playbookId,
      playbookName: n.playbookName,
      operatorId: n.operatorId,
      count: 0,
    };
    g.count += 1;
    groups.set(key, g);
  }
  return Array.from(groups.values())
    .filter((g) => g.count >= minCount)
    .sort((a, b) => b.count - a.count);
}

export type Trend = "up" | "steady" | "down";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Per-operator direction from feedback volume: this fortnight vs the one before. A clear
 * up / steady / down, never a noisy chart. "up" (more corrections lately) is the one
 * worth a look — but the label the UI shows is coaching-toned, not a scarlet letter.
 */
export function operatorTrend(
  notes: AttributedNote[],
  operatorId: string,
  now = Date.now(),
): { trend: Trend; recent: number } {
  let recent = 0;
  let prior = 0;
  for (const n of notes) {
    if (n.operatorId !== operatorId) continue;
    const age = now - new Date(n.createdAt).getTime();
    if (age < 14 * DAY) recent += 1;
    else if (age < 28 * DAY) prior += 1;
  }
  let trend: Trend = "steady";
  if (recent > prior) trend = "up";
  else if (recent < prior) trend = "down";
  return { trend, recent };
}

/** ISO timestamp `days` ago — for the query window. */
export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString();
}
