import Link from "next/link";
import { CalendarDays, ListChecks, Rocket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ComingSoon } from "@/components/shell/coming-soon";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireWorkspaceContext } from "@/lib/workspace";
import { formatDate } from "@/lib/time";
import type { Launch, LaunchSummary } from "@/types/db";
import { NewLaunchDialog } from "./new-launch-dialog";
import { DueCheck } from "./due-check";
import { launchStatusBadge } from "./launch-format";

export default async function LaunchesPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const ctx = await requireWorkspaceContext(params.workspaceId);
  requireAdmin(ctx);

  const supabase = await createClient();
  const { data: launchRows } = await supabase
    .from("launches")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false });

  const all = (launchRows ?? []) as Launch[];
  const launches = all.filter((l) => !l.is_template);
  const templates = all.filter((l) => l.is_template);

  const counts = new Map<string, number>();
  if (all.length > 0) {
    const { data: itemRows } = await supabase
      .from("launch_items")
      .select("launch_id")
      .in(
        "launch_id",
        all.map((l) => l.id),
      );
    for (const row of itemRows ?? []) {
      counts.set(row.launch_id, (counts.get(row.launch_id) ?? 0) + 1);
    }
  }

  const summaries: LaunchSummary[] = launches.map((l) => ({
    ...l,
    itemCount: counts.get(l.id) ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <DueCheck workspaceId={ctx.workspace.id} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Launches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pre-built sequences that spin up every task, assignment, and
            deadline in one go.
          </p>
        </div>
        <NewLaunchDialog
          workspaceId={ctx.workspace.id}
          templates={templates.map((t) => ({ id: t.id, name: t.name }))}
        />
      </div>

      {summaries.length === 0 ? (
        <ComingSoon
          icon={Rocket}
          title="Orchestrate a whole launch in one place"
          description="Line up the playbooks, assign owners, set each one's day relative to launch day, then arm it — every run spawns on schedule with the right deadline."
          phase="Start with the New launch button"
        />
      ) : (
        <div
          data-testid="launch-grid"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {summaries.map((l) => {
            const badge = launchStatusBadge(l.status);
            return (
              <Link
                key={l.id}
                href={`/w/${ctx.workspace.id}/launches/${l.id}`}
                data-testid={`launch-card-${l.id}`}
                className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="group-hover:border-primary/40 h-full transition-colors">
                  <CardContent className="flex h-full flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-medium leading-tight">{l.name}</h2>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <ListChecks className="size-3.5" />
                        {l.itemCount} {l.itemCount === 1 ? "item" : "items"}
                      </span>
                      {l.start_date ? (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="size-3.5" />
                          {formatDate(l.start_date)}
                        </span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {templates.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Templates</h2>
          <div
            data-testid="template-list"
            className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card"
          >
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="inline-flex items-center gap-2 font-medium">
                  <Rocket className="size-4 text-muted-foreground" /> {t.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {counts.get(t.id) ?? 0}{" "}
                  {(counts.get(t.id) ?? 0) === 1 ? "item" : "items"}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
