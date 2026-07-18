"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateStep, type PlaybookState } from "../actions";
import type { PlaybookStep } from "@/types/db";
import { StepFields } from "./step-fields";

const initialState: PlaybookState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" /> Saving…
        </>
      ) : (
        <>Save step</>
      )}
    </Button>
  );
}

export function EditStepDialog({
  workspaceId,
  playbookId,
  step,
}: {
  workspaceId: string;
  playbookId: string;
  step: PlaybookStep;
}) {
  const [open, setOpen] = useState(false);
  const bound = updateStep.bind(null, workspaceId, playbookId, step.id);
  const [state, formAction] = useFormState(bound, initialState);
  const lastSuccess = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.success && state.success !== lastSuccess.current) {
      lastSuccess.current = state.success;
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Edit step"
          data-testid={`edit-step-${step.id}`}
        >
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit step</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <StepFields
            idPrefix={`edit-${step.id}`}
            defaultTitle={step.title}
            defaultDetail={step.detail ?? ""}
            defaultLinkUrl={step.link_url ?? ""}
            defaultRequiresProof={step.requires_proof}
          />
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <SaveButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
