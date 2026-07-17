import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ListChecks } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "@/components/progress-ring";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireWorkspaceContext } from "@/lib/workspace";
import { formatDate } from "@/lib/time";
import type { Goal, Playbook } from "@/types/db";
import { statusBadge } from "../../playbooks/playbook-format";
import { GoalDetail } from "./goal-detail";

export default async function GoalDetailPage({
  params,
}: {
  params: { workspaceId: string; goalId: string };
}) {
  const ctx = await requireWorkspaceContext(params.workspaceId);
  requireAdmin(ctx);

  const supabase = await createClient();
  const { data: goalRow } = await supabase
    .from("goals")
    .select("*")
    .eq("id", params.goalId)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();

  const goal = goalRow as Goal | null;
  if (!goal) notFound();

  const { data: playbookRows } = await supabase
    .from("playbooks")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .eq("goal_id", goal.id)
    .not("status", "eq", "archived")
    .order("updated_at", { ascending: false });

  const playbooks = (playbookRows ?? []) as Playbook[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={`/w/${ctx.workspace.id}/goals`}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All goals
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {goal.label}
            </h1>
            {goal.target_date ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Target: {formatDate(goal.target_date)}
              </p>
            ) : null}
          </div>
          <ProgressRing value={goal.progress} />
        </div>
      </div>

      <GoalDetail workspaceId={ctx.workspace.id} goalId={goal.id} goal={goal} />

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Connected playbooks
          </h2>
          <span className="text-sm text-muted-foreground">
            {playbooks.length}
          </span>
        </div>

        {playbooks.length > 0 ? (
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {playbooks.map((p) => {
              const badge = statusBadge(p.status);
              return (
                <Link
                  key={p.id}
                  href={`/w/${ctx.workspace.id}/playbooks/${p.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    <ListChecks className="size-4 text-muted-foreground" />
                    {p.name}
                  </span>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-5 text-center text-sm text-muted-foreground">
              No playbooks linked yet. Open a playbook and set{" "}
              <span className="text-foreground">“Goal this drives”</span> to
              this goal.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
