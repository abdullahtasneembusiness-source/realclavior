import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { requireWorkspaceContext, isAdminRole } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import type { FeedbackNote, Membership, Run, RunStep } from "@/types/db";
import { formatDue, runStatusBadge } from "../run-format";
import { RunChecklist } from "./run-checklist";
import { RunActions } from "./run-actions";
import { FeedbackPanel } from "./feedback-panel";

export default async function RunPage({
  params,
}: {
  params: { slug: string; runId: string };
}) {
  const ctx = await requireWorkspaceContext(params.slug);
  const supabase = await createClient();

  const { data: runRow } = await supabase
    .from("runs")
    .select("*")
    .eq("id", params.runId)
    .maybeSingle();

  const run = runRow as Run | null;
  // RLS already scopes this to the assignee or an admin; anything else reads as absent.
  if (!run) notFound();

  const { data: stepRows } = await supabase
    .from("run_steps")
    .select("*")
    .eq("run_id", run.id)
    .order("position", { ascending: true });
  const steps = (stepRows ?? []) as RunStep[];

  // Feedback Memory: standing notes (run_id null) plus any tied to this run, still
  // unresolved. This is what the amber "Before you start" panel renders.
  const { data: noteRows } = await supabase
    .from("feedback_notes")
    .select("*")
    .eq("playbook_id", run.playbook_id)
    .eq("resolved", false)
    .or(`run_id.is.null,run_id.eq.${run.id}`)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  const notes = (noteRows ?? []) as FeedbackNote[];

  const isAdmin = isAdminRole(ctx.membership.role);
  const isAssignee = run.membership_id === ctx.membership.id;

  // Only show who it's assigned to on the admin side (an operator already knows).
  let assignee: Pick<Membership, "title" | "invited_email" | "color"> | null =
    null;
  if (isAdmin && !isAssignee) {
    const { data } = await supabase
      .from("memberships")
      .select("title, invited_email, color")
      .eq("id", run.membership_id)
      .maybeSingle();
    assignee = data ?? null;
  }

  const total = steps.length;
  const done = steps.filter((s) => s.done).length;
  const badge = runStatusBadge(run.status);
  const due = formatDue(run.due_at);

  const runnable =
    (run.status === "in_progress" || run.status === "changes_requested") &&
    (isAssignee || isAdmin);
  const canStart = run.status === "queued" && (isAssignee || isAdmin);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={`/w/${ctx.workspace.slug}`}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {run.title ?? "Run"}
              </h1>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>
                {done} of {total} steps done
              </span>
              {due ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="size-3.5" /> {due}
                </span>
              ) : null}
              {assignee ? (
                <span>
                  Run by{" "}
                  {assignee.title || assignee.invited_email || "teammate"}
                </span>
              ) : null}
            </p>
          </div>
          <RunActions
            workspaceId={ctx.workspace.slug}
            runId={run.id}
            status={run.status}
            isAdmin={isAdmin}
            isAssignee={isAssignee}
            canStart={canStart}
            runnable={runnable}
            hasDistiller={!!process.env.ANTHROPIC_API_KEY}
          />
        </div>
      </div>

      <FeedbackPanel notes={notes} />

      <RunChecklist
        workspaceId={ctx.workspace.slug}
        runId={run.id}
        steps={steps}
        editable={runnable}
      />
    </div>
  );
}
