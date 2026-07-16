import { test, expect } from "@playwright/test";
import { testEmail, getAccessToken } from "./helpers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function restInsert(
  table: string,
  row: unknown,
  accessToken: string,
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

/**
 * Reproduces exactly what the createWorkspace server action does, but through the raw
 * PostgREST path with a real authenticated user token — no browser, no cookies. If
 * this fails, the bug is in RLS / the DB; if it passes while the browser flow fails,
 * the bug is in the app's session/redirect layer. Either way the exact PostgREST
 * error (code + message + details + hint) is printed, so the true cause is named.
 */
test("REST repro: a signed-in user can insert their own workspace + founder membership", async () => {
  const email = testEmail("diag");
  const token = await getAccessToken(email);
  const sub = JSON.parse(
    Buffer.from(token.split(".")[1], "base64").toString("utf8"),
  ).sub as string;

  const ws = await restInsert(
    "workspaces",
    { name: "Diag Co", owner_id: sub },
    token,
  );
  // eslint-disable-next-line no-console
  console.log("WORKSPACE INSERT →", ws.status, JSON.stringify(ws.body));
  expect(
    ws.status,
    `workspace insert failed: ${JSON.stringify(ws.body)}`,
  ).toBe(201);

  const workspaceId = (ws.body as Array<{ id: string }>)[0]?.id;
  expect(workspaceId, "no workspace id returned").toBeTruthy();

  const mem = await restInsert(
    "memberships",
    {
      workspace_id: workspaceId,
      user_id: sub,
      role: "founder",
      title: "Founder",
      color: "#7C6AF7",
      status: "active",
    },
    token,
  );
  // eslint-disable-next-line no-console
  console.log("MEMBERSHIP INSERT →", mem.status, JSON.stringify(mem.body));
  expect(
    mem.status,
    `membership insert failed: ${JSON.stringify(mem.body)}`,
  ).toBe(201);
});
