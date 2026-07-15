import { Target } from "lucide-react";

import { ComingSoon } from "@/components/shell/coming-soon";
import { requireAdmin, requireWorkspaceContext } from "@/lib/workspace";

export default async function GoalsPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const ctx = await requireWorkspaceContext(params.workspaceId);
  requireAdmin(ctx);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your plan at the top, playbooks connected beneath it.
        </p>
      </div>
      <ComingSoon
        icon={Target}
        title="Connect your plan to your team's work"
        description="Set a target, link the playbooks that drive it, and watch progress roll up automatically — no more separate universes for your plan and their tasks."
        phase="Coming in Phase 4"
      />
    </div>
  );
}
