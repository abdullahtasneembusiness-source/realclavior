import { requireWorkspaceContext } from "@/lib/workspace";
import { MyRuns } from "./runs/my-runs";
import { CommandView } from "./command-view";

export default async function WorkspaceHome({
  params,
}: {
  params: { workspaceId: string };
}) {
  const ctx = await requireWorkspaceContext(params.workspaceId);
  const isAdmin =
    ctx.membership.role === "founder" || ctx.membership.role === "manager";

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            My Playbooks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything handed to you, ready to run.
          </p>
        </div>
        <MyRuns
          workspaceId={ctx.workspace.id}
          membershipId={ctx.membership.id}
        />
      </div>
    );
  }

  return (
    <CommandView
      workspaceId={ctx.workspace.id}
      workspaceName={ctx.workspace.name}
    />
  );
}
