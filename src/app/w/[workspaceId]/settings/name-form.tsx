"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDisplayName, type SettingsState } from "./actions";

const initialState: SettingsState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? <Loader2 className="animate-spin" /> : <Check />}
      Save
    </Button>
  );
}

export function NameForm({ initialName }: { initialName: string }) {
  const [state, formAction] = useFormState(updateDisplayName, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Label htmlFor="name">Your name</Label>
      <div className="flex gap-2">
        <Input
          id="name"
          name="name"
          defaultValue={initialName}
          maxLength={80}
          className="max-w-xs"
        />
        <SaveButton />
      </div>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : state.success ? (
        <p className="text-sm text-clovior-mint">Saved.</p>
      ) : null}
    </form>
  );
}
