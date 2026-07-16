"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Check, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { handOffPlaybook, type RunState } from "../../runs/actions";
import type { OwnerOption } from "./page";

const initialState: RunState = {};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function HandOffButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={disabled || pending}
      data-testid="hand-off-submit"
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin" /> Handing off…
        </>
      ) : (
        <>
          <Send /> Hand off
        </>
      )}
    </Button>
  );
}

export function HandOff({
  workspaceId,
  playbookId,
  owners,
  defaultOwnerId,
  hasSteps,
}: {
  workspaceId: string;
  playbookId: string;
  owners: OwnerOption[];
  defaultOwnerId: string | null;
  hasSteps: boolean;
}) {
  const bound = handOffPlaybook.bind(null, workspaceId, playbookId);
  const [state, formAction] = useFormState(bound, initialState);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Hand it off</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Send this playbook to a teammate as a live checklist they run and
            submit back to you.
          </p>
        </div>

        {hasSteps ? (
          <form
            action={formAction}
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
          >
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="handoff-member">Who runs it</Label>
              <select
                id="handoff-member"
                name="membershipId"
                defaultValue={defaultOwnerId ?? ""}
                required
                className={selectClass}
              >
                <option value="" disabled>
                  Pick a teammate
                </option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="handoff-due">
                Due <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input id="handoff-due" name="dueAt" type="date" />
            </div>
            <HandOffButton disabled={false} />
          </form>
        ) : (
          <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
            Add at least one step above before you can hand this off.
          </p>
        )}

        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : state.success ? (
          <p
            className="inline-flex items-center gap-1 text-sm text-clovior-mint"
            data-testid="hand-off-success"
          >
            <Check className="size-4" /> {state.success}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
