import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Handles the redirect back from a magic link or Google OAuth, establishes the
 * session, links any pending invites addressed to this user's email, then routes
 * them: into their workspace if they have an active membership, otherwise to
 * workspace creation.
 *
 * Two entry shapes are supported:
 *  - token_hash + type  → verifyOtp(). Supabase's recommended SSR magic-link flow.
 *    Unlike the PKCE code exchange it needs no code-verifier cookie, so a magic link
 *    opened on a *different* device than it was requested from still works.
 *  - code               → exchangeCodeForSession(). The PKCE flow, used by Google
 *    OAuth (the verifier cookie is set on this same browser during signInWithOAuth).
 *
 * The Supabase client here writes refreshed auth cookies onto the exact NextResponse
 * we return, rather than via next/headers cookies(): cookies set through next/headers
 * inside a Route Handler do not reliably attach to a manually-built
 * NextResponse.redirect, which would leave the browser unauthenticated after a
 * successful verify. Binding the cookie writes to the response object is the
 * bulletproof pattern (the same one the middleware uses).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const authError =
    searchParams.get("error_description") ?? searchParams.get("error");

  const errorRedirect = (reason: string) =>
    NextResponse.redirect(
      `${origin}/auth/auth-code-error?reason=${encodeURIComponent(reason)}`,
    );

  if (authError) {
    return errorRedirect(authError);
  }

  // Collect cookie writes from the auth call so we can replay them onto whichever
  // redirect response we ultimately return.
  const pendingCookies: {
    name: string;
    value: string;
    options: Record<string, unknown>;
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            pendingCookies.push({ name, value, options: options ?? {} }),
          );
        },
      },
    },
  );

  let userId: string | null = null;
  let sessionError: string | null = null;

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    sessionError = error?.message ?? null;
    userId = data.user?.id ?? null;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    sessionError = error?.message ?? null;
    userId = data.user?.id ?? null;
  } else {
    return errorRedirect("missing_code");
  }

  if (sessionError) {
    return errorRedirect(sessionError);
  }

  // Link any invites sent to this email before the account existed. Non-fatal —
  // the user can still create their own workspace.
  await supabase.rpc("accept_pending_invites");

  let destination = `${origin}/onboarding`;
  if (userId) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("workspace:workspaces(slug)")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const ws = (
      membership as { workspace: { slug: string } | { slug: string }[] } | null
    )?.workspace;
    const slug = ws ? (Array.isArray(ws) ? ws[0]?.slug : ws.slug) : null;
    if (slug) {
      destination = `${origin}/w/${slug}`;
    }
  }

  const response = NextResponse.redirect(destination);
  pendingCookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  return response;
}
