import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Clock,
  Target,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MemberAvatar } from "@/components/member-avatar";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/time";
import { attributedFeedback, daysAgoIso, recurringSignals } from "@/lib/drift";
import { CheckInCallout } from "@/components/drift";
import type { Activity, ActivityVerb, Goal, Membership, Run } from "@/types/db";
import { formatDue, runStatusBadge } from "./runs/run-format";

type MemberLite = Pick<Membership, "id" | "title" | "color" | "invited_email">;

function memberName(m: MemberLite | undefined): string {
  return m?.title || m?.invited_email || "Someone";
}

function verbPhrase(verb: ActivityVerb): string {
  switch (verb) {
    case "started":
      return "started";
    case "completed_step":
      return "completed a step in";
    case "submitted":
      return "submitted";
    case "approved":
      return "approved";
    case "requested_changes":
      return "requested changes on";
    case "added_note":
      return "left a note on";
    case "launched":
      return "launched";
  }
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "review" | "warn";
}) {
  const valueClass =
    tone === "warn"
      ? "text-clovior-coral"
      : tone === "review"
        ? "text-primary"
        : "text-foreground";
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-5">
        <span className="section-label">{label}</span>
        <span
          className={`font-display text-5xl font-bold leading-none tabular-nums sm:text-6xl ${valueClass}`}
        >
          {value}
        </span>
      </CardContent>
    </Card>
  );
}

function RunRow({
  workspaceId,
  run,
  assignee,
  done,
  total,
  overdue,
}: {
  workspaceId: string;
  run: Run;
  assignee: MemberLite | undefined;
  done: number;
  total: number;
  overdue: boolean;
}) {
  const badge = runStatusBadge(run.status);
  const due = formatDue(run.due_at);
  return (
    <Link
      href={`/w/${workspaceId}/runs/${run.id}`}
      data-testid={`cv-run-${run.id}`}
      className="hover:bg-accent/50 flex items-center gap-3 px-4 py-3 transition-colors"
    >
      <MemberAvatar
        name={memberName(assignee)}
        color={assignee?.color ?? null}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {run.title ?? "Playbook"}
          </span>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          <span>{memberName(assignee)}</span>
          <span>
            {done}/{total} steps
          </span>
          {due ? (
            <span
              className={
                overdue
                  ? "inline-flex items-center gap-1 text-clovior-coral"
                  : "inline-flex items-center gap-1"
              }
            >
              <Clock className="size-3" /> {due}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

/**
 * Command View — the founder/manager answer to "is my team moving?". Server-rendered
 * so it's correct on first paint and reflects RLS exactly (admins already have full
 * read on runs / run_steps / memberships / activities within their workspace, so this
 * needs no new policy). Runs that need a human — submitted for review, sent back, or
 * overdue — surface first; the rest show live progress; the Live Feed is the pulse.
 */
export async function CommandView({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const supabase = await createClient();

  const [
    { data: pbRows },
    { data: memberRows },
    { data: activityRows },
    { data: goalRows },
  ] = await Promise.all([
    supabase.from("playbooks").select("id").eq("workspace_id", workspaceId),
    supabase
      .from("memberships")
      .select("id, title, color, invited_email")
      .eq("workspace_id", workspaceId)
      .eq("status", "active"),
    supabase
      .from("activities")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("goals")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const goals = (goalRows ?? []) as Goal[];

  const members = (memberRows ?? []) as MemberLite[];
  const memberById = new Map(members.map((m) => [m.id, m]));
  const pbIds = (pbRows ?? []).map((p) => p.id);

  let runs: Run[] = [];
  if (pbIds.length > 0) {
    const { data } = await supabase
      .from("runs")
      .select("*")
      .in("playbook_id", pbIds)
      .in("status", ["queued", "in_progress", "submitted", "changes_requested"])
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    runs = (data ?? []) as Run[];
  }

  const runIds = runs.map((r) => r.id);
  const progress = new Map<string, { total: number; done: number }>();
  if (runIds.length > 0) {
    const { data } = await supabase
      .from("run_steps")
      .select("run_id, done")
      .in("run_id", runIds);
    for (const s of data ?? []) {
      const p = progress.get(s.run_id) ?? { total: 0, done: 0 };
      p.total += 1;
      if (s.done) p.done += 1;
      progress.set(s.run_id, p);
    }
  }

  const activities = (activityRows ?? []) as Activity[];
  const activityRunIds = Array.from(
    new Set(
      activities.filter((a) => a.target_type === "run").map((a) => a.target_id),
    ),
  );
  const runTitle = new Map<string, string>();
  if (activityRunIds.length > 0) {
    const { data } = await supabase
      .from("runs")
      .select("id, title")
      .in("id", activityRunIds);
    for (const r of data ?? []) runTitle.set(r.id, r.title ?? "a run");
  }

  const now = Date.now();
  const isOverdue = (r: Run) =>
    !!r.due_at &&
    new Date(r.due_at).getTime() < now &&
    r.status !== "submitted";

  const needsAttention = runs.filter(
    (r) =>
      r.status === "submitted" ||
      r.status === "changes_requested" ||
      isOverdue(r),
  );
  const inFlight = runs.filter((r) => !needsAttention.includes(r));

  const stats = {
    active: runs.length,
    review: runs.filter((r) => r.status === "submitted").length,
    overdue: runs.filter(isOverdue).length,
  };

  const prog = (id: string) => progress.get(id) ?? { total: 0, done: 0 };

  // Drift: recurring corrections worth a coaching check-in. Hidden entirely when quiet.
  const attributed = await attributedFeedback(
    supabase,
    workspaceId,
    daysAgoIso(30),
  );
  const checkInSignals = recurringSignals(attributed).map((s) => ({
    operatorName: memberName(memberById.get(s.operatorId)),
    playbookId: s.playbookId,
    playbookName: s.playbookName,
    count: s.count,
  }));

  return (
    <div className="flex flex-col gap-6" data-testid="command-view">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Command View</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Is {workspaceName} moving? Everything that needs you, in one place.
        </p>
      </div>

      {members.length <= 1 ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-4 text-primary" />
              Bring your operators in — they&apos;ll run the playbooks you hand
              them.
            </div>
            <Button asChild size="sm">
              <Link href={`/w/${workspaceId}/team`}>
                Invite team <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Active runs" value={stats.active} tone="default" />
        <StatTile label="Awaiting review" value={stats.review} tone="review" />
        <StatTile label="Overdue" value={stats.overdue} tone="warn" />
      </div>

      <CheckInCallout workspaceId={workspaceId} signals={checkInSignals} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <span aria-hidden className="h-4 w-0.5 rounded-full bg-primary" />
              <AlertTriangle className="size-4 text-clovior-coral" />
              Needs your attention
              <span className="text-muted-foreground">
                · {needsAttention.length}
              </span>
            </h2>
            {needsAttention.length > 0 ? (
              <div
                data-testid="cv-needs-attention"
                className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card"
              >
                {needsAttention.map((run) => {
                  const p = prog(run.id);
                  return (
                    <RunRow
                      key={run.id}
                      workspaceId={workspaceId}
                      run={run}
                      assignee={memberById.get(run.membership_id)}
                      done={p.done}
                      total={p.total}
                      overdue={isOverdue(run)}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
                Nothing waiting on you. Nice.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <span aria-hidden className="h-4 w-0.5 rounded-full bg-primary" />
              <ClipboardList className="size-4 text-primary" />
              In progress
              <span className="text-muted-foreground">· {inFlight.length}</span>
            </h2>
            {inFlight.length > 0 ? (
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {inFlight.map((run) => {
                  const p = prog(run.id);
                  return (
                    <RunRow
                      key={run.id}
                      workspaceId={workspaceId}
                      run={run}
                      assignee={memberById.get(run.membership_id)}
                      done={p.done}
                      total={p.total}
                      overdue={false}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
                No active runs yet. Open a playbook and hand it off to get your
                team moving.
              </p>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          {goals.length > 0 ? (
            <section className="flex flex-col gap-2" data-testid="cv-goals">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <span aria-hidden className="h-4 w-0.5 rounded-full bg-primary" />
                <Target className="size-4 text-primary" />
                Goals
                <span className="text-muted-foreground">· {goals.length}</span>
              </h2>
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
                {goals.map((g) => (
                  <Link
                    key={g.id}
                    href={`/w/${workspaceId}/goals/${g.id}`}
                    data-testid={`cv-goal-${g.id}`}
                    className="flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{g.label}</span>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {g.progress}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${g.progress}%` }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <span aria-hidden className="h-4 w-0.5 rounded-full bg-primary" />
              Live Feed
            </h2>
            {activities.length > 0 ? (
              <ol
                data-testid="live-feed"
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
              >
                {activities.map((a) => {
                  const actor = a.membership_id
                    ? memberById.get(a.membership_id)
                    : undefined;
                  const target =
                    a.target_type === "run"
                      ? (runTitle.get(a.target_id) ?? "a run")
                      : "";
                  return (
                    <li key={a.id} className="flex items-start gap-2.5 text-sm">
                      <MemberAvatar
                        name={memberName(actor)}
                        color={actor?.color ?? null}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="leading-snug">
                          <span className="font-medium">
                            {memberName(actor)}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {verbPhrase(a.verb)}
                          </span>{" "}
                          <span className="font-medium">{target}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(a.created_at)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
                Your team&apos;s activity will show up here as they run
                playbooks.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
