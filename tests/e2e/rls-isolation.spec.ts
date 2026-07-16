import { test, expect } from "@playwright/test";
import { signInAs, testEmail, getAccessToken, restGet } from "./helpers";

/**
 * The DB-level RLS checks (Session 1's BUILD_LOG) proved policies work via JWT
 * impersonation over SQL. This proves the same thing through the real HTTP path the
 * browser actually uses — the anon key + PostgREST — with a real browser session
 * establishing the workspace first.
 */
test("an unrelated signed-in user cannot read another workspace's data", async ({
  page,
}) => {
  const founderEmail = testEmail("founder");
  const outsiderEmail = testEmail("outsider");

  await signInAs(page, founderEmail);
  await page.getByLabel("Business name").fill("Private Co");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/w\/[0-9a-f-]+$/);
  const workspaceId = page.url().split("/w/")[1];

  const outsiderToken = await getAccessToken(outsiderEmail);

  const workspaces = await restGet(
    `workspaces?id=eq.${workspaceId}`,
    outsiderToken,
  );
  expect(workspaces.status).toBe(200);
  expect(workspaces.body).toEqual([]);

  const memberships = await restGet(
    `memberships?workspace_id=eq.${workspaceId}`,
    outsiderToken,
  );
  expect(memberships.status).toBe(200);
  expect(memberships.body).toEqual([]);
});

test("an unauthenticated request reads nothing at all", async ({ page }) => {
  const founderEmail = testEmail("founder");
  await signInAs(page, founderEmail);
  await page.getByLabel("Business name").fill("Anon Test Co");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/w\/[0-9a-f-]+$/);
  const workspaceId = page.url().split("/w/")[1];

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/workspaces?id=eq.${workspaceId}`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
  );
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual([]);
});
