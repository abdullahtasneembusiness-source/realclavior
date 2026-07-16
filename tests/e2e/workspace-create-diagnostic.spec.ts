import { test, expect } from "@playwright/test";
import { testEmail, getAccessToken, restGet } from "./helpers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Exercises the exact backend path the onboarding action now uses — the
 * create_workspace SECURITY DEFINER RPC — over real HTTP with a real authenticated
 * user token (no browser, no cookies). This is the regression guard for workspace
 * creation: if the RPC or its grants ever break, this fails fast with the precise
 * PostgREST error, independent of any browser flakiness.
 */
test("REST: a signed-in user can create a workspace + founder membership via RPC", async () => {
  const email = testEmail("diag");
  const token = await getAccessToken(email);
  const sub = JSON.parse(
    Buffer.from(token.split(".")[1], "base64").toString("utf8"),
  ).sub as string;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_workspace`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_name: "Diag Co", p_color: "#7C6AF7" }),
  });
  const text = await res.text();
  // eslint-disable-next-line no-console
  console.log("RPC create_workspace →", res.status, text);
  expect(res.status, `create_workspace failed: ${text}`).toBe(200);

  const workspaceId = JSON.parse(text) as string;
  expect(workspaceId, "no workspace id returned").toMatch(/^[0-9a-f-]{36}$/);

  // The founder membership must exist and be readable by the creator (memberships_select
  // allows user_id = auth.uid()).
  const memberships = await restGet(
    `memberships?workspace_id=eq.${workspaceId}&select=role,status,user_id`,
    token,
  );
  // eslint-disable-next-line no-console
  console.log(
    "MEMBERSHIPS READ →",
    memberships.status,
    JSON.stringify(memberships.body),
  );
  expect(
    memberships.status,
    `membership read failed: ${JSON.stringify(memberships.body)}`,
  ).toBe(200);
  expect(memberships.body).toEqual([
    { role: "founder", status: "active", user_id: sub },
  ]);
});
