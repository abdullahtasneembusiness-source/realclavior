import Link from "next/link";
import { AlertTriangle, CalendarClock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MemberAvatar } from "@/components/member-avatar";
import { formatDue, runStatusBadge } from "../../runs/run-format";
import type { RunStatus } from "@/types/db";

export interface LaunchRunView {
  id: string;
  title: string | null;
  assigneeName: string;
  assigneeColor: string | null;
  due_at: string | null;
  status: RunStatus;
}

function isDone(status: RunStatus): boolean {
  return status === "approved" || status === "done";
}

function RunLine({
  workspaceId,
  run,
  overdue,
}: {
  workspaceId: string;
  run: LaunchRunView;
  overdue: boolean;
}) {
  const badge = runStatusBadge(run.status);
  return (
    <Link
      href={`/w/${workspaceId}/runs/${run.id}`}
      className="hover:bg-accent/50 flex items-center gap-3 px-4 py-2.5 transition-colors"
    >
      <MemberAvatar
        name={run.assigneeName}
        color={run.assigneeColor}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {run.title ?? "Playbook"}
          </span>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <span
          className={
            overdue
              ? "text-xs text-clovior-coral"
              : "text-xs text-muted-foreground"
          }
        >
          {run.assigneeName}
          {run.due_at ? ` · ${formatDue(run.due_at)}` : ""}
        </span>
      </div>
    </Link>
  );
}

export function LiveDashboard({
  workspaceId,
  runs,
}: {
  workspaceId: string;
  runs: LaunchRunView[];
}) {
  const total = runs.length;
  const done = runs.filter((r) => isDone(r.status)).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const now = Date.now();
  const in24h = now + 24 * 60 * 60 * 1000;
  const overdue = runs.filter(
    (r) => r.due_at && new Date(r.due_at).getTime() < now && !isDone(r.status),
  );
  const upcoming = runs.filter(
    (r) =>
      r.due_at &&
      new Date(r.due_at).getTime() >= now &&
      new Date(r.due_at).getTime() <= in24h &&
      !isDone(r.status),
  );

  return (
    <section className="flex flex-col gap-4" data-testid="live-dashboard">
      <Card>
        <CardContent className="flex flex-col gap-2 p-4 sm:p-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">Progress</span>
            <span
              className="text-sm font-mono tabular-nums text-muted-foreground"
              data-testid="launch-percent"
            >
              {done} of {total} done · {percent}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="size-4 text-clovior-coral" /> Overdue
            <span className="text-muted-foreground">· {overdue.length}</span>
          </h3>
          {overdue.length > 0 ? (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {overdue.map((r) => (
                <RunLine key={r.id} workspaceId={workspaceId} run={r} overdue />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-4 py-4 text-center text-sm text-muted-foreground">
              Nothing overdue.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <CalendarClock className="size-4 text-primary" /> Next 24 hours
            <span className="text-muted-foreground">· {upcoming.length}</span>
          </h3>
          {upcoming.length > 0 ? (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {upcoming.map((r) => (
                <RunLine
                  key={r.id}
                  workspaceId={workspaceId}
                  run={r}
                  overdue={false}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-4 py-4 text-center text-sm text-muted-foreground">
              Nothing due in the next day.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
