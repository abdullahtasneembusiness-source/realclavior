"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  BookmarkPlus,
  CheckCircle2,
  Loader2,
  Lock,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  armLaunch,
  completeLaunch,
  deleteLaunch,
  disarmLaunch,
  saveAsTemplate,
  type LaunchState,
} from "../actions";
import type { LaunchStatus } from "@/types/db";

const initialState: LaunchState = {};

function SaveTemplateButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} data-testid="save-template-submit">
      {pending ? <Loader2 className="animate-spin" /> : null} Save template
    </Button>
  );
}

function SaveTemplateDialog({
  workspaceId,
  launchId,
  defaultName,
}: {
  workspaceId: string;
  launchId: string;
  defaultName: string;
}) {
  const [open, setOpen] = useState(false);
  const bound = saveAsTemplate.bind(null, workspaceId, launchId);
  const [state, formAction] = useFormState(bound, initialState);
  const last = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.success && state.success !== last.current) {
      last.current = state.success;
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="save-template-trigger">
          <BookmarkPlus /> Save as template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as template</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="template-name">Template name</Label>
            <Input
              id="template-name"
              name="name"
              defaultValue={`${defaultName} template`}
              autoFocus
              required
              maxLength={120}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Saves the playbooks, owners, and day offsets — without the dates —
            so you can reuse this structure for the next launch.
          </p>
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          <div className="flex justify-end">
            <SaveTemplateButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LaunchControls({
  workspaceId,
  launchId,
  status,
  launchName,
}: {
  workspaceId: string;
  launchId: string;
  status: LaunchStatus;
  launchName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<LaunchState>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <SaveTemplateDialog
          workspaceId={workspaceId}
          launchId={launchId}
          defaultName={launchName}
        />

        {status === "draft" ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              className="text-muted-foreground hover:text-destructive"
              data-testid="delete-launch"
              onClick={() => run(() => deleteLaunch(workspaceId, launchId))}
            >
              <Trash2 /> Delete
            </Button>
            <Button
              size="sm"
              disabled={isPending}
              data-testid="arm-launch"
              onClick={() => run(() => armLaunch(workspaceId, launchId))}
            >
              {isPending ? <Loader2 className="animate-spin" /> : <Lock />} Arm
              launch
            </Button>
          </>
        ) : null}

        {status === "armed" ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            data-testid="disarm-launch"
            onClick={() => run(() => disarmLaunch(workspaceId, launchId))}
          >
            <RotateCcw /> Un-arm
          </Button>
        ) : null}

        {status === "live" ? (
          <Button
            size="sm"
            disabled={isPending}
            data-testid="complete-launch"
            onClick={() => run(() => completeLaunch(workspaceId, launchId))}
          >
            <CheckCircle2 /> Mark complete
          </Button>
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
