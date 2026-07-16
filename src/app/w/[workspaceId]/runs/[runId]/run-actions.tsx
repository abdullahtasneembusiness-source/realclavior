"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Play, RotateCcw, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  approveRun,
  requestChangesRun,
  startRun,
  submitRun,
  type RunState,
} from "../actions";
import type { RunStatus } from "@/types/db";

export function RunActions({
  workspaceId,
  runId,
  status,
  isAdmin,
  isAssignee,
  canStart,
  runnable,
}: {
  workspaceId: string;
  runId: string;
  status: RunStatus;
  isAdmin: boolean;
  isAssignee: boolean;
  canStart: boolean;
  runnable: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<RunState>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
    });
  }

  const spinner = isPending ? <Loader2 className="animate-spin" /> : null;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {canStart ? (
          <Button
            disabled={isPending}
            data-testid="run-start"
            onClick={() => run(() => startRun(workspaceId, runId))}
          >
            {spinner ?? <Play />} Start
          </Button>
        ) : null}

        {runnable ? (
          <Button
            disabled={isPending}
            data-testid="run-submit"
            onClick={() => run(() => submitRun(workspaceId, runId))}
          >
            {spinner ?? <Send />} Submit for review
          </Button>
        ) : null}

        {status === "submitted" && isAdmin ? (
          <>
            <Button
              variant="outline"
              disabled={isPending}
              data-testid="run-request-changes"
              onClick={() => run(() => requestChangesRun(workspaceId, runId))}
            >
              {spinner ?? <RotateCcw />} Request changes
            </Button>
            <Button
              disabled={isPending}
              data-testid="run-approve"
              onClick={() => run(() => approveRun(workspaceId, runId))}
            >
              {spinner ?? <Check />} Approve
            </Button>
          </>
        ) : null}

        {status === "submitted" && !isAdmin && isAssignee ? (
          <span className="text-sm text-muted-foreground">
            Submitted — waiting on review.
          </span>
        ) : null}
      </div>

      {error ? (
        <span className="text-sm text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
