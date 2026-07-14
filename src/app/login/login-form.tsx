"use client";

import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  sendMagicLink,
  signInWithGoogle,
  type MagicLinkState,
} from "./actions";

const initialState: MagicLinkState = {};

function MagicLinkButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" /> Sending link…
        </>
      ) : (
        <>
          <Mail /> Send magic link
        </>
      )}
    </Button>
  );
}

function GoogleButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      className="w-full"
      disabled={pending}
    >
      {pending ? <Loader2 className="animate-spin" /> : <GoogleGlyph />}
      Continue with Google
    </Button>
  );
}

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, formAction] = useFormState(sendMagicLink, initialState);

  if (state.sentTo) {
    return (
      <div className="border-clovior-mint/25 bg-clovior-mint/10 flex flex-col items-center gap-3 rounded-xl border p-6 text-center">
        <CheckCircle2 className="size-6 text-clovior-mint" />
        <div>
          <p className="font-medium">Check your inbox</p>
          <p className="text-sm text-muted-foreground">
            We sent a sign-in link to{" "}
            <span className="text-foreground">{state.sentTo}</span>. It expires
            in a few minutes.
          </p>
        </div>
      </div>
    );
  }

  const error = state.error ?? initialError;

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@yourbusiness.com"
            required
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <MagicLinkButton />
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={signInWithGoogle}>
        <GoogleButton />
      </form>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.1 14.7 2 12 2 6.9 2 2.8 6.1 2.8 12S6.9 22 12 22c5.4 0 9-3.8 9-9.1 0-.6-.06-1.1-.15-1.6H12z"
      />
    </svg>
  );
}
