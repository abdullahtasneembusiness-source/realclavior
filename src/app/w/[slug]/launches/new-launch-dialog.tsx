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
import { createLaunch, createFromTemplate, type LaunchState } from "./actions";

const initialState: LaunchState = {};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} data-testid="create-launch-submit">
      {pending ? <Loader2 className="animate-spin" /> : null} {label}
    </Button>
  );
}

export function NewLaunchDialog({
  workspaceId,
  templates,
}: {
  workspaceId: string;
  templates: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"scratch" | "template">("scratch");

  const scratch = createLaunch.bind(null, workspaceId);
  const fromTemplate = createFromTemplate.bind(null, workspaceId);
  const [scratchState, scratchAction] = useFormState(scratch, initialState);
  const [tplState, tplAction] = useFormState(fromTemplate, initialState);
  const state = mode === "scratch" ? scratchState : tplState;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="new-launch-trigger">
          <Plus /> New launch
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New launch</DialogTitle>
          <DialogDescription>
            A sequence of playbooks that spawn as dated runs when you arm it.
          </DialogDescription>
        </DialogHeader>

        {templates.length > 0 ? (
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="launch-mode-scratch"
              onClick={() => setMode("scratch")}
              className={
                mode === "scratch"
                  ? "rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
                  : "rounded-full border border-border px-3 py-1 text-sm text-muted-foreground"
              }
            >
              From scratch
            </button>
            <button
              type="button"
              data-testid="launch-mode-template"
              onClick={() => setMode("template")}
              className={
                mode === "template"
                  ? "rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
                  : "rounded-full border border-border px-3 py-1 text-sm text-muted-foreground"
              }
            >
              From a template
            </button>
          </div>
        ) : null}

        <form
          action={mode === "scratch" ? scratchAction : tplAction}
          className="flex flex-col gap-4"
        >
          {mode === "template" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="launch-template">Template</Label>
              <select
                id="launch-template"
                name="templateId"
                required
                className={selectClass}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="launch-name">Name</Label>
            <Input
              id="launch-name"
              name="name"
              placeholder="e.g. Course launch — March"
              autoFocus
              required
              maxLength={120}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="launch-start">
              Start date{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input id="launch-start" name="startDate" type="date" />
          </div>

          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <div className="flex justify-end">
            <SubmitButton
              label={
                mode === "scratch" ? "Create launch" : "Create from template"
              }
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
