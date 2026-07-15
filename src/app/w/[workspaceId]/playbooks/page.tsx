import { ListChecks } from "lucide-react";

import { ComingSoon } from "@/components/shell/coming-soon";
import { requireAdmin, requireWorkspaceContext } from "@/lib/workspace";

export default async function PlaybooksPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const ctx = await requireWorkspaceContext(params.workspaceId);
  requireAdmin(ctx);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Playbooks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Living, step-by-step workflows your team runs like checklists.
        </p>
      </div>
      <ComingSoon
        icon={ListChecks}
        title="Build your first playbook"
        description="Write steps by hand, or paste a Loom transcript and let Claude draft the whole thing — either way, your team runs it as a checklist that never goes stale."
        phase="Coming in the next build"
      />
    </div>
  );
}
