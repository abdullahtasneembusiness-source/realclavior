import Link from "next/link";
import { Clock, ListChecks, Repeat, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ComingSoon } from "@/components/shell/coming-soon";
import { MemberAvatar } from "@/components/member-avatar";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireWorkspaceContext } from "@/lib/workspace";
import type { Membership, Playbook, PlaybookSummary } from "@/types/db";
import { NewPlaybookDialog } from "./new-playbook-dialog";
import { scheduleLabel, statusBadge } from "./playbook-format";

export default async function PlaybooksPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const ctx = await requireWorkspaceContext(params.workspaceId);
  requireAdmin(ctx);

  const supabase = await createClient();

  const [{ data: playbookRows }, { data: memberRows }] = await Promise.all([
    supabase
      .from("playbooks")
      .select("*")
      .eq("workspace_id", ctx.workspace.id)
      .not("status", "eq", "archived")
      .order("updated_at", { ascending: false }),
    supabase
      .from("memberships")
      .select("id, title, color, invited_email")
      .eq("workspace_id", ctx.workspace.id)
      .eq("status", "active"),
  ]);

  const playbooks = (playbookRows ?? []) as Playbook[];
  const members = (memberRows ?? []) as Pick<
    Membership,
    "id" | "title" | "color" | "invited_email"
  >[];

  // One query for every step in the workspace's playbooks, counted in memory —
  // simpler and more predictable than a per-row embedded aggregate.
  const ids = playbooks.map((p) => p.id);
  const stepCounts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: stepRows } = await supabase
      .from("playbook_steps")
      .select("playbook_id")
      .in("playbook_id", ids);
    for (const row of stepRows ?? []) {
      stepCounts.set(
        row.playbook_id,
        (stepCounts.get(row.playbook_id) ?? 0) + 1,
      );
    }
  }

  const memberById = new Map(members.map((m) => [m.id, m]));
  const summaries: PlaybookSummary[] = playbooks.map((p) => {
    const owner = p.owner_membership_id
      ? memberById.get(p.owner_membership_id)
      : undefined;
    return {
      ...p,
      stepCount: stepCounts.get(p.id) ?? 0,
      ownerName: owner?.title || owner?.invited_email || null,
      ownerColor: owner?.color ?? null,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Playbooks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Living, step-by-step workflows your team runs like checklists.
          </p>
        </div>
        <NewPlaybookDialog workspaceId={ctx.workspace.id} />
      </div>

      {summaries.length === 0 ? (
        <ComingSoon
          icon={ListChecks}
          title="Build your first playbook"
          description="Capture how something gets done once — the steps, the links, the proof you expect — and your team runs it the same way every time, without you in the loop."
          phase="Start with the New playbook button"
        />
      ) : (
        <div
          data-testid="playbook-grid"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {summaries.map((p) => {
            const badge = statusBadge(p.status);
            return (
              <Link
                key={p.id}
                href={`/w/${ctx.workspace.id}/playbooks/${p.id}`}
                data-testid={`playbook-card-${p.id}`}
                className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="group-hover:border-primary/40 h-full transition-colors">
                  <CardContent className="flex h-full flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-medium leading-tight">{p.name}</h2>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    {p.description ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {p.description}
                      </p>
                    ) : (
                      <p className="text-muted-foreground/70 text-sm italic">
                        No description yet
                      </p>
                    )}
                    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <ListChecks className="size-3.5" />
                        {p.stepCount} {p.stepCount === 1 ? "step" : "steps"}
                      </span>
                      {p.est_minutes ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="size-3.5" />
                          {p.est_minutes} min
                        </span>
                      ) : null}
                      {p.schedule !== "none" ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Repeat className="size-3.5" />
                          {scheduleLabel(p.schedule)}
                        </span>
                      ) : null}
                      <span className="ml-auto inline-flex items-center gap-1.5">
                        {p.ownerName ? (
                          <>
                            <MemberAvatar
                              name={p.ownerName}
                              color={p.ownerColor}
                              size="sm"
                            />
                            {p.ownerName}
                          </>
                        ) : (
                          <>
                            <User className="size-3.5" /> Unassigned
                          </>
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
