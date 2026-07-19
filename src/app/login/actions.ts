"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";

const emailSchema = z.string().trim().email("Enter a valid email address.");

export type MagicLinkState = {
  error?: string;
  sentTo?: string;
};

/** Sends a magic-link sign-in email. */
export async function sendMagicLink(
  _prev: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error) {
    // Log the real provider error (e.g. an SMTP auth failure) server-side, but never
    // surface it raw — some GoTrue errors serialize to an unhelpful "{}". Show the user
    // a clean, actionable message instead.
    console.error(
      `[login] signInWithOtp failed (status ${error.status ?? "?"}): ${error.message}`,
    );
    if (error.status === 429) {
      return {
        error: "That was quick — wait a moment before requesting another link.",
      };
    }
    return {
      error:
        "We couldn't send your magic link right now. Please try again in a moment.",
    };
  }

  return { sentTo: parsed.data };
}

/**
 * Finishes a Google sign-in started client-side with Google Identity Services.
 *
 * The browser has already exchanged Google's ID token for a Supabase session (see
 * google-sign-in.tsx / signInWithIdToken), so the auth cookies are set by the time this
 * runs. This mirrors the tail of /auth/callback for the redirect flow: link any invites
 * addressed to this email before the account existed. It deliberately does NOT redirect —
 * the client navigates to /app itself with a full page load, which reliably applies the
 * new session cookies (a server-action redirect invoked imperatively doesn't always move
 * the browser). /app then resolves the workspace or sends the user to onboarding.
 *
 * Doing Google sign-in on our own domain — rather than redirecting through Supabase —
 * is what makes Google's account screen read "clovior.com" instead of the raw Supabase
 * project URL.
 */
export async function completeGoogleSignIn(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Link any invites addressed to this email before the account existed. Best-effort —
  // the user still reaches the app (and can create their own workspace) if this no-ops.
  await supabase.rpc("accept_pending_invites");
}
