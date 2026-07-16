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
 * developed in) and drives the browser through the exact same /auth/callback route a
 * real clicked email link would hit.
 */
export async function signInAs(page: Page, email: string): Promise<void> {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw new Error(`generateLink(${email}): ${error.message}`);

  const url = new URL(data.properties.action_link);
  url.searchParams.set("redirect_to", `${SITE_URL}/auth/callback`);
  await page.goto(url.toString());
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
