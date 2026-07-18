import Link from "next/link";
import { CalendarDays, ListChecks, Target } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { ComingSoon } from "@/components/shell/coming-soon";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireWorkspaceContext } from "@/lib/workspace";
import { formatDate } from "@/lib/time";
import type { Goal, GoalSummary } from "@/types/db";
import { NewGoalDialog } from "./new-goal-dialog";

export default async function GoalsPage({
  params,
}: {
  params: { slug: string };
}) {
  const ctx = await requireWorkspaceContext(params.slug);
  requireAdmin(ctx);

  const supabase = await createClient();
  const { data: goalRows } = await supabase
    .from("goals")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .not("status", "eq", "archived")
    .order("created_at", { ascending: false });

  const goals = (goalRows ?? []) as Goal[];

  // One query for every linked playbook, counted in memory — same shape as the
  // playbooks list's step count.
  const counts = new Map<string, number>();
  if (goals.length > 0) {
    const { data: linked } = await supabase
      .from("playbooks")
      .select("goal_id")
      .eq("workspace_id", ctx.workspace.id)
      .in(
        "goal_id",
        goals.map((g) => g.id),
      );
    for (const row of linked ?? []) {
      if (row.goal_id)
        counts.set(row.goal_id, (counts.get(row.goal_id) ?? 0) + 1);
    }
  }

  const summaries: GoalSummary[] = goals.map((g) => ({
    ...g,
    playbookCount: counts.get(g.id) ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Goals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your plan at the top, playbooks connected beneath it.
          </p>
        </div>
        <NewGoalDialog workspaceId={ctx.workspace.slug} />
      </div>

      {summaries.length === 0 ? (
        <ComingSoon
          icon={Target}
          title="Connect your plan to your team's work"
          description="Set a target, link the playbooks that drive it, and track progress in one place — no more separate universes for your plan and their tasks."
          phase="Start with the New goal button"
        />
      ) : (
        <div
          data-testid="goal-grid"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {summaries.map((g) => (
            <Link
              key={g.id}
              href={`/w/${ctx.workspace.slug}/goals/${g.id}`}
              data-testid={`goal-card-${g.id}`}
              className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="group-hover:border-primary/40 h-full transition-colors">
                <CardContent className="flex h-full flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-medium leading-tight">{g.label}</h2>
                    {g.status === "done" ? (
                      <span className="bg-clovior-mint/15 rounded-full px-2 py-0.5 text-xs font-medium text-clovior-mint">
                        Done
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-auto flex flex-col gap-2 pt-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono tabular-nums">{g.progress}%</span>
                      {g.target_date ? (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="size-3.5" />
                          {formatDate(g.target_date)}
                        </span>
                      ) : null}
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-500"
                        style={{ width: `${g.progress}%` }}
                      />
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ListChecks className="size-3.5" />
                      {g.playbookCount}{" "}
                      {g.playbookCount === 1 ? "playbook" : "playbooks"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
