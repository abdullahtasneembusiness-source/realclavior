import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Handles the redirect back from a magic link or Google OAuth, establishes the
 * session, links any pending invites addressed to this user's email, then routes
 * them: into their workspace if they have an active membership, otherwise to
 * workspace creation.
 *
 * Two entry shapes are supported:
 *  - token_hash + type  → verifyOtp(). This is Supabase's recommended SSR magic-link
 *    flow. Unlike the PKCE code exchange it needs no code-verifier cookie, so a magic
 *    link opened on a *different* device than it was requested from still works.
 *  - code               → exchangeCodeForSession(). The PKCE flow, used by Google
 *    OAuth (the verifier cookie is set on this same browser during signInWithOAuth).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const authError =
    searchParams.get("error_description") ?? searchParams.get("error");

  if (authError) {
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?reason=${encodeURIComponent(authError)}`,
    );
  }

  const supabase = await createClient();

  let sessionError: string | null = null;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    sessionError = error?.message ?? null;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    sessionError = error?.message ?? null;
  } else {
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?reason=missing_code`,
    );
  }

  if (sessionError) {
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?reason=${encodeURIComponent(sessionError)}`,
    );
  }

  // Link any invites sent to this email before the account existed. Failure here
  // is non-fatal — the user can still create their own workspace.
  await supabase.rpc("accept_pending_invites");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("workspace_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (membership) {
      return NextResponse.redirect(`${origin}/w/${membership.workspace_id}`);
    }
  }

  return NextResponse.redirect(`${origin}/onboarding`);
}
