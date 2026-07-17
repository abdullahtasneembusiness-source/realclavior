"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Archive, Check, CheckCircle2, Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setGoalStatus, updateGoal, type GoalState } from "../actions";
import type { Goal } from "@/types/db";

const initialState: GoalState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} data-testid="save-goal">
      {pending ? (
        <>
          <Loader2 className="animate-spin" /> Saving…
        </>
      ) : (
        <>Save goal</>
      )}
    </Button>
  );
}

export function GoalDetail({
  workspaceId,
  goalId,
  goal,
}: {
  workspaceId: string;
  goalId: string;
  goal: Goal;
}) {
  const bound = updateGoal.bind(null, workspaceId, goalId);
  const [state, formAction] = useFormState(bound, initialState);
  const [progress, setProgress] = useState(goal.progress);

  const [statusPending, startStatus] = useTransition();
  const [statusError, setStatusError] = useState<string | null>(null);

  function changeStatus(status: Goal["status"]) {
    setStatusError(null);
    startStatus(async () => {
      const result = await setGoalStatus(workspaceId, goalId, status);
      if (result?.error) setStatusError(result.error);
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-4 sm:p-6">
        <form action={formAction} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-label">Goal</Label>
            <Input
              id="goal-label"
              name="label"
              defaultValue={goal.label}
              required
              maxLength={120}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-description">Description</Label>
            <textarea
              id="goal-description"
              name="description"
              rows={3}
              maxLength={2000}
              defaultValue={goal.description ?? ""}
              placeholder="What hitting this looks like."
              className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-target">Target date</Label>
              <Input
                id="goal-target"
                name="targetDate"
                type="date"
                defaultValue={goal.target_date ?? ""}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="goal-progress">Progress</Label>
                <span
                  className="text-sm font-medium tabular-nums"
                  data-testid="goal-progress-value"
                >
                  {progress}%
                </span>
              </div>
              <input
                id="goal-progress"
                name="progress"
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SaveButton />
            {state.error ? (
              <span className="text-sm text-destructive" role="alert">
                {state.error}
              </span>
            ) : state.success ? (
              <span className="inline-flex items-center gap-1 text-sm text-clovior-mint">
                <Check className="size-4" /> {state.success}
              </span>
            ) : null}
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          {goal.status === "done" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={statusPending}
              onClick={() => changeStatus("active")}
            >
              <RotateCcw /> Reopen
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={statusPending}
              data-testid="goal-mark-done"
              onClick={() => changeStatus("done")}
            >
              <CheckCircle2 /> Mark done
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={statusPending}
            className="text-muted-foreground hover:text-destructive"
            onClick={() => changeStatus("archived")}
          >
            <Archive /> Archive
          </Button>
          {statusError ? (
            <span className="text-sm text-destructive" role="alert">
              {statusError}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
