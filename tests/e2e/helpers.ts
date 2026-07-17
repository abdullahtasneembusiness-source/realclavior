import { createClient } from "@supabase/supabase-js";
import type { EmailOtpType } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

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

/**
 * Fills the onboarding form and creates a workspace, returning its id. If the flow
 * does NOT land on /w/[id] within the timeout, throws with the landed pathname and any
 * visible form-error text — so a failure names its real cause instead of dying at a
 * generic `toHaveURL` mismatch.
 */
export async function createWorkspace(
  page: Page,
  name: string,
): Promise<string> {
  await page.getByLabel("Business name").fill(name);
  await page.getByRole("button", { name: "Create workspace" }).click();

  try {
    await expect(page).toHaveURL(/\/w\/[0-9a-f-]+$/, { timeout: 15000 });
  } catch {
    const alert = await page
      .getByRole("alert")
      .textContent()
      .catch(() => null);
    throw new Error(
      `createWorkspace("${name}") did not reach /w/[id]. Landed on ${new URL(page.url()).pathname}. Form error: ${alert ?? "(none shown)"}`,
    );
  }

  return page.url().split("/w/")[1];
}

/**
 * Clears the onboarding gate for a signed-in operator, then lands them on their home.
 * Since Session 8, a member who hasn't onboarded is redirected from their workspace
 * home to /welcome, so operator-flow tests must clear it before reaching their home.
 *
 * The gate itself (and the full /welcome walkthrough) is covered by onboarding.spec;
 * here we just need it out of the way. We call the real mark_self_onboarded RPC as the
 * operator (their own token), rather than the service-role client — the authenticated
 * role has the table grants the RPC needs, and this exercises the actual function
 * instead of poking the table directly.
 */
export async function completeOnboarding(
  page: Page,
  workspaceId: string,
  email: string,
): Promise<void> {
  const token = await getAccessToken(email);
  const home = `/w/${workspaceId}`;

  // Both the RPC and the landing nav are idempotent, so we retry the whole pair. The
  // nav can throw net::ERR_ABORTED when it races a Server Component redirect() during
  // document navigation — a transient framework race, not a real failure — so we
  // swallow that specific abort and re-check the landed URL instead.
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_self_onboarded`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ p_workspace_id: workspaceId }),
    });
    if (!res.ok) {
      throw new Error(
        `completeOnboarding(${email}): ${res.status} ${await res.text()}`,
      );
    }

    try {
      // Fresh navigation → server re-reads the now-set flag → no /welcome redirect.
      await page.goto(home, { waitUntil: "domcontentloaded" });
    } catch (err) {
      lastError = err;
      // Both manifestations of the same redirect race: Chromium aborts the request
      // (ERR_ABORTED), or Playwright reports the goto was "interrupted by another
      // navigation" (the server's redirect to /welcome). Neither is a real failure —
      // let waitForURL settle the real URL; re-throw anything genuinely unexpected.
      if (!/ERR_ABORTED|interrupted by another navigation/.test(String(err))) {
        throw err;
      }
    }

    // Don't trust an instantaneous page.url(): during a server redirect (or right after
    // an aborted nav) it can transiently read the *requested* /w/{id} before the
    // redirect to /welcome resolves. waitForURL settles on the final URL, and only
    // counts success once we're genuinely under the workspace home and off /welcome.
    try {
      await page.waitForURL(
        (url) =>
          url.pathname.startsWith(home) && !url.pathname.endsWith("/welcome"),
        { timeout: 5000 },
      );
      return;
    } catch (err) {
      lastError = err;
      // Still gated — loop and re-run the idempotent RPC + navigation.
    }
  }

  throw new Error(
    `completeOnboarding(${email}): still on /welcome after retries${
      lastError ? ` (last nav error: ${String(lastError)})` : ""
    }`,
  );
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
