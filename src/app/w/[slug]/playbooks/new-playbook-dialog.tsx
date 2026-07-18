"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { ArrowLeft, Loader2, PencilLine, Plus, Sparkles } from "lucide-react";

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
import { createPlaybook, type PlaybookState } from "./actions";

const initialState: PlaybookState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" /> Creating…
        </>
      ) : (
        <>Create playbook</>
      )}
    </Button>
  );
}

/** The two-way fork: draft with AI, or fill in the name and build by hand. */
function ChoiceStep({
  workspaceId,
  onManual,
}: {
  workspaceId: string;
  onManual: () => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Link
        href={`/w/${workspaceId}/playbooks/new`}
        data-testid="new-playbook-generate"
        className="border-primary/30 bg-primary/5 hover:border-primary/60 group flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="bg-primary/15 flex size-9 items-center justify-center rounded-lg text-primary">
          <Sparkles className="size-5" />
        </span>
        <span className="font-medium">Generate from a description</span>
        <span className="text-sm text-muted-foreground">
          Paste a transcript or just describe the task — get an editable draft
          in seconds.
        </span>
      </Link>

      <button
        type="button"
        onClick={onManual}
        data-testid="new-playbook-manual"
        className="hover:border-foreground/30 group flex flex-col gap-2 rounded-xl border border-border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
          <PencilLine className="size-5" />
        </span>
        <span className="font-medium">Build manually</span>
        <span className="text-sm text-muted-foreground">
          Start from a blank playbook and add each step yourself.
        </span>
      </button>
    </div>
  );
}

export function NewPlaybookDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"choose" | "manual">("choose");
  const boundCreate = createPlaybook.bind(null, workspaceId);
  // createPlaybook redirects into the new playbook's editor on success, so the only
  // state we ever render back here is a validation error.
  const [state, formAction] = useFormState(boundCreate, initialState);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Reset to the fork each time the dialog closes, so it never reopens mid-form.
    if (!next) setMode("choose");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="new-playbook-trigger">
          <Plus /> New playbook
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New playbook</DialogTitle>
          <DialogDescription>
            {mode === "choose"
              ? "Draft it with AI, or build it by hand — your call."
              : "Name it now — you'll add the steps on the next screen."}
          </DialogDescription>
        </DialogHeader>

        {mode === "choose" ? (
          <ChoiceStep
            workspaceId={workspaceId}
            onManual={() => setMode("manual")}
          />
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="playbook-name">Name</Label>
              <Input
                id="playbook-name"
                name="name"
                placeholder="e.g. Publish a YouTube video"
                autoFocus
                required
                maxLength={80}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="playbook-description">
                Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="playbook-description"
                name="description"
                placeholder="What this playbook is for"
                maxLength={200}
              />
            </div>

            {state.error ? (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            ) : null}

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode("choose")}
              >
                <ArrowLeft /> Back
              </Button>
              <SubmitButton />
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
