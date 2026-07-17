import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireAdmin, requireWorkspaceContext } from "@/lib/workspace";
import { aiPlaybookAvailable } from "@/lib/ai-playbook";
import { GeneratePlaybook } from "./generate-playbook";

export default async function GeneratePlaybookPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const ctx = await requireWorkspaceContext(params.workspaceId);
  requireAdmin(ctx);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={`/w/${ctx.workspace.id}/playbooks`}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All playbooks
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Generate a playbook
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe the task however it comes out — Clovior drafts the steps,
            you edit anything before it&apos;s saved.
          </p>
        </div>
      </div>

      <GeneratePlaybook
        workspaceId={ctx.workspace.id}
        aiAvailable={aiPlaybookAvailable()}
      />
    </div>
  );
}
