import { Brain as BrainIcon } from "lucide-react";

import { ComingSoon } from "@/components/shell/coming-soon";
import { requireWorkspaceContext } from "@/lib/workspace";

/** Open to every active member — Brain is the onboarding surface, not admin-only. */
export default async function BrainPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  await requireWorkspaceContext(params.workspaceId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team Brain</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Standards, voice, tools, and context — externalized, so it survives
          turnover.
        </p>
      </div>
      <ComingSoon
        icon={BrainIcon}
        title="Institutional memory that isn't just in your head"
        description="Voice, standards, tools, contacts, preferences — searchable, and the first thing a new team member walks through on day one."
        phase="Coming in Phase 4"
        accent="mint"
      />
    </div>
  );
}
