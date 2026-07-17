import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireWorkspaceContext } from "@/lib/workspace";
import { formatDate } from "@/lib/time";
import type {
  Launch,
  LaunchItem,
  LaunchItemView,
  Membership,
  Playbook,
  Run,
} from "@/types/db";
import { launchStatusBadge } from "../launch-format";
import { LaunchBuilder } from "./launch-builder";
import { LaunchTimeline } from "./timeline";
import { LaunchControls } from "./launch-controls";
import { LaunchMetaForm } from "./launch-meta-form";
import { LiveDashboard, type LaunchRunView } from "./live-dashboard";

type MemberLite = Pick<Membership, "id" | "title" | "color" | "invited_email">;

function memberName(m: MemberLite | undefined): string {
  return m?.title || m?.invited_email || "Member";
}

export default async function LaunchDetailPage({
  params,
}: {
  params: { workspaceId: string; launchId: string };
}) {
  const ctx = await requireWorkspaceContext(params.workspaceId);
  requireAdmin(ctx);

  const supabase = await createClient();
  const { data: launchRow } = await supabase
    .from("launches")
    .select("*")
    .eq("id", params.launchId)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();

  const launch = launchRow as Launch | null;
  if (!launch) notFound();

  const [{ data: itemRows }, { data: playbookRows }, { data: memberRows }] =
    await Promise.all([
      supabase
        .from("launch_items")
        .select("*")
        .eq("launch_id", launch.id)
        .order("offset_days", { ascending: true }),
      supabase
        .from("playbooks")
        .select("id, name, owner_membership_id")
        .eq("workspace_id", ctx.workspace.id)
        .not("status", "eq", "archived")
        .order("name", { ascending: true }),
      supabase
        .from("memberships")
        .select("id, title, color, invited_email")
        .eq("workspace_id", ctx.workspace.id)
        .eq("status", "active")
        .order("created_at", { ascending: true }),
    ]);

  const items = (itemRows ?? []) as LaunchItem[];
  const playbooks = (playbookRows ?? []) as Pick<
    Playbook,
    "id" | "name" | "owner_membership_id"
  >[];
  const members = (memberRows ?? []) as MemberLite[];
  const memberById = new Map(members.map((m) => [m.id, m]));
  const playbookById = new Map(playbooks.map((p) => [p.id, p]));

  const itemViews: LaunchItemView[] = items.map((item) => {
    const pb = playbookById.get(item.playbook_id);
    const ownerId = item.membership_id ?? pb?.owner_membership_id ?? null;
    const owner = ownerId ? memberById.get(ownerId) : undefined;
    return {
      ...item,
      membership_id: ownerId,
      playbookName: pb?.name ?? "Removed playbook",
      ownerName: owner ? memberName(owner) : null,
      ownerColor: owner?.color ?? null,
    };
  });

  // Live/complete launches show their spawned runs.
  let runs: LaunchRunView[] = [];
  if (launch.status === "live" || launch.status === "complete") {
    const { data: runRows } = await supabase
      .from("runs")
      .select("*")
      .eq("launch_id", launch.id)
      .order("due_at", { ascending: true, nullsFirst: false });
    runs = ((runRows ?? []) as Run[]).map((r) => {
      const assignee = memberById.get(r.membership_id);
      return {
        id: r.id,
        title: r.title,
        assigneeName: memberName(assignee),
        assigneeColor: assignee?.color ?? null,
        due_at: r.due_at,
        status: r.status,
      };
    });
  }

  const badge = launchStatusBadge(launch.status);
  const isDraft = launch.status === "draft";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={`/w/${ctx.workspace.id}/launches`}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All launches
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {launch.name}
              </h1>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="size-4" />
              {launch.start_date
                ? `Starts ${formatDate(launch.start_date)}`
                : "No start date set"}
            </p>
          </div>
          <LaunchControls
            workspaceId={ctx.workspace.id}
            launchId={launch.id}
            status={launch.status}
            launchName={launch.name}
          />
        </div>
      </div>

      {launch.status === "live" || launch.status === "complete" ? (
        <LiveDashboard workspaceId={ctx.workspace.id} runs={runs} />
      ) : null}

      {isDraft ? (
        <LaunchMetaForm
          workspaceId={ctx.workspace.id}
          launchId={launch.id}
          name={launch.name}
          startDate={launch.start_date}
        />
      ) : null}

      {!isDraft && launch.status === "armed" ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0" />
          <span>
            Armed and locked. It goes live on{" "}
            <span className="text-foreground">
              {launch.start_date
                ? formatDate(launch.start_date)
                : "its start date"}
            </span>
            , spawning a run for every item. Un-arm to make changes.
          </span>
        </div>
      ) : null}

      <LaunchTimeline items={itemViews} />

      {isDraft ? (
        <LaunchBuilder
          workspaceId={ctx.workspace.id}
          launchId={launch.id}
          items={itemViews}
          playbooks={playbooks.map((p) => ({
            id: p.id,
            name: p.name,
            ownerMembershipId: p.owner_membership_id,
          }))}
          members={members.map((m) => ({
            id: m.id,
            name: memberName(m),
            color: m.color,
          }))}
        />
      ) : null}
    </div>
  );
}
