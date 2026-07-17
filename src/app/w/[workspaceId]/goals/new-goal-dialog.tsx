"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGoal, type GoalState } from "./actions";

const initialState: GoalState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} data-testid="create-goal-submit">
      {pending ? (
        <>
          <Loader2 className="animate-spin" /> Creating…
        </>
      ) : (
        <>Create goal</>
      )}
    </Button>
  );
}

export function NewGoalDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const bound = createGoal.bind(null, workspaceId);
  // createGoal redirects to the new goal's detail page on success — only errors
  // ever render back here.
  const [state, formAction] = useFormState(bound, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="new-goal-trigger">
          <Plus /> New goal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New goal</DialogTitle>
          <DialogDescription>
            The outcome you&apos;re driving toward. Link the playbooks that move
            it on the next screen.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-label">Goal</Label>
            <Input
              id="goal-label"
              name="label"
              placeholder="e.g. 10k newsletter subscribers"
              autoFocus
              required
              maxLength={120}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-description">
              Description{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <textarea
              id="goal-description"
              name="description"
              rows={2}
              maxLength={2000}
              placeholder="What hitting this looks like."
              className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-target">
              Target date{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input id="goal-target" name="targetDate" type="date" />
          </div>

          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
