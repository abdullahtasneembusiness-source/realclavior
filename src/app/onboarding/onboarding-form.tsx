"use client";

import { useFormState, useFormStatus } from "react-dom";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkspace, type CreateWorkspaceState } from "./actions";

const initialState: CreateWorkspaceState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" /> Creating…
        </>
      ) : (
        <>
          Create workspace <ArrowRight />
        </>
      )}
    </Button>
  );
}

export function OnboardingForm() {
  const [state, formAction] = useFormState(createWorkspace, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Business name</Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Alexei's Academy"
          autoFocus
          required
          maxLength={80}
        />
        <p className="text-xs text-muted-foreground">
          This is what your team will see. You can change it later.
        </p>
      </div>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
