"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Info, Loader2, UserPlus } from "lucide-react";

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
import { inviteMember, type InviteState } from "./actions";

const initialState: InviteState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" /> Sending…
        </>
      ) : (
        <>
          <UserPlus /> Send invite
        </>
      )}
    </Button>
  );
}

export function InviteDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const boundInvite = inviteMember.bind(null, workspaceId);
  const [state, formAction] = useFormState(boundInvite, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  // Track the last success we acted on so the effect doesn't re-close on re-render.
  const lastSuccess = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.success && state.success !== lastSuccess.current) {
      lastSuccess.current = state.success;
      formRef.current?.reset();
      // Keep the dialog open only if there's a warning worth reading.
      if (!state.emailWarning) {
        setOpen(false);
      }
    }
  }, [state.success, state.emailWarning]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus /> Invite team member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>
            They&apos;ll join the moment they sign in with this email.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              placeholder="operator@email.com"
              required
              autoComplete="off"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                name="role"
                defaultValue="operator"
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="operator">Operator</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-title">Title (optional)</Label>
              <Input
                id="invite-title"
                name="title"
                placeholder="Content Operator"
                maxLength={60}
              />
            </div>
          </div>

          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.emailWarning ? (
            <p className="flex items-start gap-1.5 rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              {state.emailWarning}
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
