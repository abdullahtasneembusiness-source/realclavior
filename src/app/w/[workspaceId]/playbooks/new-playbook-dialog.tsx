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

export function NewPlaybookDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const boundCreate = createPlaybook.bind(null, workspaceId);
  // createPlaybook redirects into the new playbook's editor on success, so the only
  // state we ever render back here is a validation error.
  const [state, formAction] = useFormState(boundCreate, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="new-playbook-trigger">
          <Plus /> New playbook
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New playbook</DialogTitle>
          <DialogDescription>
            Name it now — you&apos;ll add the steps on the next screen.
          </DialogDescription>
        </DialogHeader>
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

          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
