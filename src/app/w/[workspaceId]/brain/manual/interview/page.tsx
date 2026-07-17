import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireAdmin, requireWorkspaceContext } from "@/lib/workspace";
import { ManualInterview } from "./manual-interview";

export default async function ManualInterviewPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const ctx = await requireWorkspaceContext(params.workspaceId);
  requireAdmin(ctx);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={`/w/${ctx.workspace.id}/brain/manual`}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Founder&apos;s Manual
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            A few quick questions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Answer casually — Clovior turns your answers into a clean manual in
            your voice. You&apos;ll review it before anything saves.
          </p>
        </div>
      </div>

      <ManualInterview workspaceId={ctx.workspace.id} />
    </div>
  );
}
