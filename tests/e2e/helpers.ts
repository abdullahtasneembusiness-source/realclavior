import { createClient } from "@supabase/supabase-js";
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
 * Signs a Playwright page in as `email` without needing a real inbox — generates a
 * magic link via the Auth Admin API (only reachable because this runs against a
 * local/test Supabase instance with real network access, unlike the sandbox this was
 * developed in) and drives the browser through the real /auth/callback route.
 *
 * We hit the callback with token_hash + type rather than navigating the raw GoTrue
 * action_link: the action_link uses the PKCE code flow, which needs a code-verifier
 * cookie that only exists if signInWithOtp ran in this same browser first. The
 * token_hash / verifyOtp path (which the callback now supports) needs no verifier,
 * so it works from a fresh browser context — exactly what these tests use.
 */
export async function signInAs(page: Page, email: string): Promise<void> {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw new Error(`generateLink(${email}): ${error.message}`);

  const callback = new URL(`${SITE_URL}/auth/callback`);
  callback.searchParams.set("token_hash", data.properties.hashed_token);
  callback.searchParams.set("type", "magiclink");
  await page.goto(callback.toString());
  // Land on the post-auth destination (onboarding, a workspace, /login, or the error
  // page) before the test proceeds.
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
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw new Error(`generateLink(${email}): ${error.message}`);

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: verified, error: verifyError } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
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
