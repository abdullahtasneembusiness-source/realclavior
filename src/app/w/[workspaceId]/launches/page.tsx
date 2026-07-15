import { Rocket } from "lucide-react";

import { ComingSoon } from "@/components/shell/coming-soon";
import { requireAdmin, requireWorkspaceContext } from "@/lib/workspace";

export default async function LaunchesPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const ctx = await requireWorkspaceContext(params.workspaceId);
  requireAdmin(ctx);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Launches</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pre-built sequences that spin up every task, assignment, and deadline
          in one click.
        </p>
      </div>
      <ComingSoon
        icon={Rocket}
        title="Launch week, without the chaos"
        description="Build a sequence once, save it as a template, and arm it for the next launch — every playbook, owner, and due date spun up automatically."
        phase="Coming in Phase 5"
        accent="coral"
      />
    </div>
  );
}
