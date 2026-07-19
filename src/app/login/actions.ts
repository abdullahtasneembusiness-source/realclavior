"use server";

import { redirect } from "next/navigation";
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

/** Starts the Google OAuth flow and redirects the browser to Google's consent screen. */
export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect(
      `/login?error=${encodeURIComponent(error?.message ?? "oauth_failed")}`,
    );
  }

  redirect(data.url);
}
