"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateLaunch, type LaunchState } from "../actions";

const initialState: LaunchState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} data-testid="save-launch-meta">
      {pending ? <Loader2 className="animate-spin" /> : null} Save
    </Button>
  );
}

export function LaunchMetaForm({
  workspaceId,
  launchId,
  name,
  startDate,
}: {
  workspaceId: string;
  launchId: string;
  name: string;
  startDate: string | null;
}) {
  const bound = updateLaunch.bind(null, workspaceId, launchId);
  const [state, formAction] = useFormState(bound, initialState);

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="lm-name">Name</Label>
              <Input
                id="lm-name"
                name="name"
                defaultValue={name}
                required
                maxLength={120}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lm-start">Start date</Label>
              <Input
                id="lm-start"
                name="startDate"
                type="date"
                defaultValue={startDate ?? ""}
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
      </CardContent>
    </Card>
  );
}
