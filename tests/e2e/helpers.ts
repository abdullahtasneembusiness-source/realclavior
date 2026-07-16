import { createClient } from "@supabase/supabase-js";
import type { EmailOtpType } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Unique per-test-run email so parallel/retried tests never collide. */
export function testEmail(label: string): string {
  return `e2e-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/**
 * Ensures a confirmed auth user exists for `email`, then generates a magic-link
 * token for them and returns the token_hash + the verification type GoTrue actually
 * assigned.
 *
 * Both details matter, and getting them wrong is what made earlier CI runs fail with
 * "Email link is invalid or has expired":
 *  - Pre-creating a *confirmed* user means generateLink issues a plain magic-link
 *    token, not a signup-confirmation token for an unconfirmed new user.
 *  - Verifying with the returned `verification_type` (rather than a hardcoded
 *    "magiclink") guarantees the type matches what GoTrue stored, so verifyOtp finds
 *    the token.
 */
async function prepareMagicVerification(
  email: string,
): Promise<{ tokenHash: string; type: EmailOtpType }> {
  const admin = adminClient();

  // Idempotent: a second sign-in for the same email (e.g. an operator accepting an
  // invite, then signing in again after promotion) will hit "already registered",
  // which is fine — we just need the user to exist and be confirmed.
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (
    createError &&
    !/already.*registered|already been registered|already exists/i.test(
      createError.message,
    )
  ) {
    throw new Error(`createUser(${email}): ${createError.message}`);
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw new Error(`generateLink(${email}): ${error.message}`);

  return {
    tokenHash: data.properties.hashed_token,
    type: data.properties.verification_type as EmailOtpType,
  };
}

/**
 * Signs a Playwright page in as `email` without needing a real inbox, driving the
 * browser through the real /auth/callback route (so accept_pending_invites and the
 * post-auth routing all run exactly as in production).
 *
 * We hit the callback with token_hash + type rather than the raw GoTrue action_link:
 * the action_link uses the PKCE code flow, which needs a code-verifier cookie that
 * only exists if signInWithOtp ran in this same browser first. The token_hash /
 * verifyOtp path needs no verifier, so it works from a fresh browser context.
 */
export async function signInAs(page: Page, email: string): Promise<void> {
  const { tokenHash, type } = await prepareMagicVerification(email);

  const callback = new URL(`${SITE_URL}/auth/callback`);
  callback.searchParams.set("token_hash", tokenHash);
  callback.searchParams.set("type", type);
  await page.goto(callback.toString());
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/callback"));

  // Surface the real reason if the callback didn't establish a session, instead of
  // letting the test die later with a generic "getByLabel timed out".
  const landed = new URL(page.url());
  if (landed.pathname.startsWith("/auth/auth-code-error")) {
    throw new Error(
      `signInAs(${email}): callback failed — ${landed.searchParams.get("reason") ?? "unknown"}`,
    );
  }
  if (landed.pathname === "/login") {
    throw new Error(
      `signInAs(${email}): session did not persist — landed on /login`,
    );
  }
}

/** A signed-in access token for `email`, without a browser — for direct REST/RLS checks. */
export async function getAccessToken(email: string): Promise<string> {
  const { tokenHash, type } = await prepareMagicVerification(email);

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: verified, error: verifyError } = await anon.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });
  if (verifyError || !verified.session) {
    throw new Error(
      `verifyOtp(${email}): ${verifyError?.message ?? "no session"}`,
    );
  }
  return verified.session.access_token;
}

/** Raw PostgREST GET as a specific user's access token — exercises real RLS. */
export async function restGet(
  path: string,
  accessToken: string,
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${accessToken}` },
  });
  return { status: res.status, body: await res.json() };
}
