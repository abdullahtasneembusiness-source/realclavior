"use client";

import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendMagicLink, type MagicLinkState } from "./actions";
import { GoogleSignIn } from "./google-sign-in";

const initialState: MagicLinkState = {};

// Google's rendered sign-in button only appears once its Client ID is configured.
const googleEnabled = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

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

export function LoginForm({
  initialError,
  initialEmail,
}: {
  initialError?: string;
  /** Pre-filled from an invite link (/login?email=…) so invitees don't retype it. */
  initialEmail?: string;
}) {
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
            defaultValue={initialEmail}
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

      {googleEnabled ? (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <GoogleSignIn />
        </>
      ) : null}
    </div>
  );
}
