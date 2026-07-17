import { createClient } from "@/lib/supabase/server";
import { isAdminRole, requireWorkspaceContext } from "@/lib/workspace";
import type { BrainEntry } from "@/types/db";
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

  const [{ data: entryRows }, { data: feedbackRows }] = await Promise.all([
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
  ]);

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
      <BrainBoard
        workspaceId={ctx.workspace.id}
        isAdmin={isAdmin}
        entries={entries}
        corrections={corrections}
      />
    </div>
  );
}
