import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireAdmin, requireWorkspaceContext } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import type { Membership, Playbook, PlaybookStep } from "@/types/db";
import type { FeedbackNote } from "@/types/db";
import { PlaybookMetaForm } from "./playbook-meta-form";
import { StepsEditor } from "./steps-editor";
import { PlaybookStatusMenu } from "./playbook-status-menu";
import { HandOff } from "./hand-off";
import { FeedbackMemory } from "./feedback-memory";

export interface OwnerOption {
  id: string;
  name: string;
  color: string | null;
}

export interface GoalOption {
  id: string;
  label: string;
}

export default async function PlaybookEditorPage({
  params,
}: {
  params: { workspaceId: string; playbookId: string };
}) {
  const ctx = await requireWorkspaceContext(params.workspaceId);
  requireAdmin(ctx);

  const supabase = await createClient();

  const { data: playbookRow } = await supabase
    .from("playbooks")
    .select("*")
    .eq("id", params.playbookId)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();

  const playbook = playbookRow as Playbook | null;
  if (!playbook) notFound();
  // Archived playbooks live only in history; editing happens on active/paused ones.
  if (playbook.status === "archived") {
    redirect(`/w/${ctx.workspace.id}/playbooks`);
  }

  const [
    { data: stepRows },
    { data: memberRows },
    { data: noteRows },
    { data: goalRows },
  ] = await Promise.all([
    supabase
      .from("playbook_steps")
      .select("*")
      .eq("playbook_id", playbook.id)
      .order("position", { ascending: true }),
    supabase
      .from("memberships")
      .select("id, title, color, invited_email")
      .eq("workspace_id", ctx.workspace.id)
      .eq("status", "active")
      .order("created_at", { ascending: true }),
    supabase
      .from("feedback_notes")
      .select("*")
      .eq("playbook_id", playbook.id)
      .eq("resolved", false)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("goals")
      .select("id, label")
      .eq("workspace_id", ctx.workspace.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  const steps = (stepRows ?? []) as PlaybookStep[];
  const notes = (noteRows ?? []) as FeedbackNote[];
  const goals = (goalRows ?? []) as GoalOption[];
  const members = (memberRows ?? []) as Pick<
    Membership,
    "id" | "title" | "color" | "invited_email"
  >[];
  const owners: OwnerOption[] = members.map((m) => ({
    id: m.id,
    name: m.title || m.invited_email || "Member",
    color: m.color,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={`/w/${ctx.workspace.id}/playbooks`}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All playbooks
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {playbook.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Edit the details and steps. Changes are live the moment you save.
            </p>
          </div>
          <PlaybookStatusMenu
            workspaceId={ctx.workspace.id}
            playbookId={playbook.id}
            status={playbook.status}
          />
        </div>
      </div>

      <PlaybookMetaForm
        workspaceId={ctx.workspace.id}
        playbookId={playbook.id}
        playbook={playbook}
        owners={owners}
        goals={goals}
      />

      <StepsEditor
        workspaceId={ctx.workspace.id}
        playbookId={playbook.id}
        steps={steps}
      />

      <FeedbackMemory
        workspaceId={ctx.workspace.id}
        playbookId={playbook.id}
        notes={notes}
      />

      <HandOff
        workspaceId={ctx.workspace.id}
        playbookId={playbook.id}
        owners={owners}
        defaultOwnerId={playbook.owner_membership_id}
        hasSteps={steps.length > 0}
      />
    </div>
  );
}
