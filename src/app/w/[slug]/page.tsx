import { redirect } from "next/navigation";

import { requireWorkspaceContext } from "@/lib/workspace";
import { MyRuns } from "./runs/my-runs";
import { CommandView } from "./command-view";

export default async function WorkspaceHome({
  params,
}: {
  params: { slug: string };
}) {
  const ctx = await requireWorkspaceContext(params.slug);
  const isAdmin =
    ctx.membership.role === "founder" || ctx.membership.role === "manager";

  // A team member who just joined walks through onboarding first. Founders bootstrap
  // the workspace, so they skip it; everyone else lands here once, then never again.
  if (ctx.membership.role !== "founder" && !ctx.membership.onboarded_at) {
    redirect(`/w/${ctx.workspace.slug}/welcome`);
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            My Playbooks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything handed to you, ready to run.
          </p>
        </div>
        <MyRuns
          workspaceId={ctx.workspace.slug}
          membershipId={ctx.membership.id}
        />
      </div>
    );
  }

  return (
    <CommandView
      workspaceId={ctx.workspace.slug}
      workspaceName={ctx.workspace.name}
    />
  );
}
