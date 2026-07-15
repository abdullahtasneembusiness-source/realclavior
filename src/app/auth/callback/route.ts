import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Handles the redirect back from a magic link or Google OAuth. Exchanges the code
 * for a session, links any pending invites addressed to this user's email, then
 * routes them: into the app if they now have an active membership, otherwise to
 * workspace creation.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const authError =
    searchParams.get("error_description") ?? searchParams.get("error");

  if (authError) {
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?reason=${encodeURIComponent(authError)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?reason=missing_code`,
    );
  }

  const supabase = await createClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?reason=${encodeURIComponent(exchangeError.message)}`,
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
