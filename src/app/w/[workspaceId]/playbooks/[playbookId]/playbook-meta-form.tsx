"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { updatePlaybookMeta, type PlaybookState } from "../actions";
import type { Playbook } from "@/types/db";
import type { OwnerOption } from "./page";

const initialState: PlaybookState = {};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} data-testid="save-playbook-meta">
      {pending ? (
        <>
          <Loader2 className="animate-spin" /> Saving…
        </>
      ) : (
        <>Save details</>
      )}
    </Button>
  );
}

export function PlaybookMetaForm({
  workspaceId,
  playbookId,
  playbook,
  owners,
}: {
  workspaceId: string;
  playbookId: string;
  playbook: Playbook;
  owners: OwnerOption[];
}) {
  const bound = updatePlaybookMeta.bind(null, workspaceId, playbookId);
  const [state, formAction] = useFormState(bound, initialState);

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <form action={formAction} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pb-name">Name</Label>
            <Input
              id="pb-name"
              name="name"
              defaultValue={playbook.name}
              required
              maxLength={80}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pb-description">Description</Label>
            <textarea
              id="pb-description"
              name="description"
              rows={3}
              maxLength={2000}
              defaultValue={playbook.description ?? ""}
              placeholder="What this playbook is for, and when to run it."
              className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="pb-owner">Owner (who runs it)</Label>
              <select
                id="pb-owner"
                name="ownerMembershipId"
                defaultValue={playbook.owner_membership_id ?? ""}
                className={selectClass}
              >
                <option value="">Unassigned</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="pb-est">Est. minutes to run</Label>
              <Input
                id="pb-est"
                name="estMinutes"
                type="number"
                min={1}
                inputMode="numeric"
                defaultValue={playbook.est_minutes ?? ""}
                placeholder="e.g. 30"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="pb-schedule">Cadence</Label>
              <select
                id="pb-schedule"
                name="schedule"
                defaultValue={
                  playbook.schedule === "custom_rrule"
                    ? "none"
                    : playbook.schedule
                }
                className={selectClass}
              >
                <option value="none">No set cadence</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
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
