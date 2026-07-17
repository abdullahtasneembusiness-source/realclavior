import Link from "next/link";
import { ChevronRight, User } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole, requireWorkspaceContext } from "@/lib/workspace";
import type { BrainEntry, ManualSection } from "@/types/db";
import { BrainBoard, type CorrectionItem } from "./brain-board";

interface FeedbackRow {
  id: string;
  body: string;
  playbook_id: string;
  created_at: string;
  playbooks: { name: string } | { name: string }[] | null;
}

function playbookName(row: FeedbackRow): string {
  const p = row.playbooks;
  if (!p) return "A playbook";
  return (Array.isArray(p) ? p[0]?.name : p.name) ?? "A playbook";
}

/** Open to every active member — Brain is the onboarding surface, not admin-only. */
export default async function BrainPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const ctx = await requireWorkspaceContext(params.workspaceId);
  const isAdmin = isAdminRole(ctx.membership.role);

  const supabase = await createClient();

  const [{ data: entryRows }, { data: feedbackRows }, { data: manualRows }] =
    await Promise.all([
      supabase
        .from("brain_entries")
        .select("*")
        .eq("workspace_id", ctx.workspace.id)
        .not("category", "eq", "corrections")
        .order("updated_at", { ascending: false }),
      // Corrections mirror: live feedback_notes across the workspace's playbooks.
      // RLS still applies — an operator only sees notes for playbooks they own or ran.
      supabase
        .from("feedback_notes")
        .select("id, body, playbook_id, created_at, playbooks!inner(name)")
        .eq("playbooks.workspace_id", ctx.workspace.id)
        .eq("resolved", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("founder_manual_sections")
        .select("*")
        .eq("workspace_id", ctx.workspace.id),
    ]);

  const manualSections = (manualRows ?? []) as ManualSection[];
  const manualStarted = manualSections.some(
    (s) => (s.body ?? "").trim().length > 0,
  );

  const entries = (entryRows ?? []) as BrainEntry[];
  const corrections: CorrectionItem[] = (
    (feedbackRows ?? []) as FeedbackRow[]
  ).map((row) => ({
    id: row.id,
    body: row.body,
    playbookId: row.playbook_id,
    playbookName: playbookName(row),
    createdAt: row.created_at,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team Brain</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Standards, voice, tools, and context — externalized, so it survives
          turnover.
        </p>
      </div>
      <Link
        href={`/w/${ctx.workspace.id}/brain/manual`}
        data-testid="manual-card"
        className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Card className="border-primary/30 bg-primary/5 group-hover:border-primary/60 transition-colors">
          <CardContent className="flex items-center gap-4 p-4 sm:p-5">
            <span className="bg-primary/15 flex size-11 shrink-0 items-center justify-center rounded-xl text-primary">
              <User className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Founder&apos;s Manual</h2>
              <p className="text-sm text-muted-foreground">
                {manualStarted
                  ? "How the founder thinks and expects to be worked with."
                  : isAdmin
                    ? "Not set up yet — the #1 thing a new operator needs. Build it in a few minutes."
                    : "How the founder works — coming soon."}
              </p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      <BrainBoard
        workspaceId={ctx.workspace.id}
        isAdmin={isAdmin}
        entries={entries}
        corrections={corrections}
      />
    </div>
  );
}
