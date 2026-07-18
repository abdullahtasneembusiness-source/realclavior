import Link from "next/link";
import { CalendarClock, ListChecks } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ComingSoon } from "@/components/shell/coming-soon";
import { createClient } from "@/lib/supabase/server";
import type { Run } from "@/types/db";
import { formatDue, runStatusBadge } from "./run-format";

const ACTIVE_STATUSES = [
  "queued",
  "in_progress",
  "changes_requested",
  "submitted",
];

/**
 * The operator's own work: every run currently handed to them, newest-due first,
 * each showing live progress. Server-rendered so it's correct on first paint and
 * reflects RLS exactly (an operator only ever sees their own runs).
 */
export async function MyRuns({
  workspaceId,
  membershipId,
}: {
  workspaceId: string;
  membershipId: string;
}) {
  const supabase = await createClient();

  const { data: runRows } = await supabase
    .from("runs")
    .select("*")
    .eq("membership_id", membershipId)
    .in("status", ACTIVE_STATUSES)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const runs = (runRows ?? []) as Run[];

  const progress = new Map<string, { total: number; done: number }>();
  if (runs.length > 0) {
    const { data: stepRows } = await supabase
      .from("run_steps")
      .select("run_id, done")
      .in(
        "run_id",
        runs.map((r) => r.id),
      );
    for (const s of stepRows ?? []) {
      const p = progress.get(s.run_id) ?? { total: 0, done: 0 };
      p.total += 1;
      if (s.done) p.done += 1;
      progress.set(s.run_id, p);
    }
  }

  if (runs.length === 0) {
    return (
      <ComingSoon
        icon={ListChecks}
        title="Nothing handed to you yet"
        description="When a teammate hands you a playbook, it lands here as a checklist — ready to run, mobile-friendly, fast even on a weak connection."
        phase="You're all caught up"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="my-runs">
      {runs.map((run) => {
        const badge = runStatusBadge(run.status);
        const p = progress.get(run.id) ?? { total: 0, done: 0 };
        const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
        const due = formatDue(run.due_at);
        return (
          <Link
            key={run.id}
            href={`/w/${workspaceId}/runs/${run.id}`}
            data-testid={`run-card-${run.id}`}
            className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="hover:border-primary/40 transition-colors">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-medium leading-tight">
                    {run.title ?? "Playbook"}
                  </h2>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {p.done}/{p.total} steps
                  </span>
                </div>
                {due ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock className="size-3.5" /> {due}
                  </span>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
