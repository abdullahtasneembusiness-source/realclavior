import { test, expect, type Page } from "@playwright/test";
import { signInAs, testEmail, createWorkspace, adminClient } from "./helpers";

// Must match the value the app server is started with (playwright.config.ts webServer).
const CRON_SECRET = "e2e-cron-secret";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const playbookSteps = "[data-testid^='step-row-']";

/** Creates a one-step playbook so a launch item has something to spawn. */
async function createPlaybookWithStep(
  page: Page,
  workspaceId: string,
  name: string,
  step: string,
): Promise<void> {
  await page.goto(`/w/${workspaceId}/playbooks`);
  await page.getByTestId("new-playbook-trigger").click();
  await page.getByTestId("new-playbook-manual").click();
  await page.getByLabel("Name").fill(name);
  await page.getByRole("button", { name: "Create playbook" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/w/${workspaceId}/playbooks/[0-9a-f-]+$`),
  );
  await page.locator("#add-step-title").fill(step);
  await page.getByTestId("add-step-submit").click();
  await expect(
    page.locator(playbookSteps).filter({ hasText: step }),
  ).toBeVisible();
}

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function callCron(secret: string | null) {
  return fetch(`${SITE_URL}/api/cron/launches`, {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

test("the daily cron spawns an armed launch once its start date arrives", async ({
  page,
}) => {
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Cron Launch Co");

  await createPlaybookWithStep(page, workspaceId, "Publish the drop", "Ship it");

  // Arm a launch dated in the FUTURE — arming locks it but does NOT spawn yet.
  await page.goto(`/w/${workspaceId}/launches`);
  await page.getByTestId("new-launch-trigger").click();
  await page.getByLabel("Name").fill("Scheduled launch");
  await page.locator("#launch-start").fill(isoDaysFromNow(3));
  await page.getByTestId("create-launch-submit").click();
  await expect(page).toHaveURL(
    new RegExp(`/w/${workspaceId}/launches/[0-9a-f-]+$`),
  );
  const launchId = page.url().split("/launches/")[1];

  await page.locator("#item-offset").fill("0");
  await page.getByTestId("add-item-submit").click();
  await expect(page.locator("[data-testid^='launch-item-']")).toHaveCount(1);

  await page.getByTestId("arm-launch").click();
  // Future-dated: it's armed and locked, but not live — no dashboard, no runs.
  await expect(page.getByText("Armed and locked")).toBeVisible();
  await expect(page.getByTestId("live-dashboard")).toHaveCount(0);

  // The day arrives: move the start date to today (what real time passing would do).
  const admin = adminClient();
  const { error: updateError } = await admin
    .from("launches")
    .update({ start_date: isoDaysFromNow(0) })
    .eq("id", launchId);
  expect(updateError).toBeNull();

  // An unauthenticated call is rejected and changes nothing.
  const unauth = await callCron(null);
  expect(unauth.status).toBe(401);
  const wrongSecret = await callCron("not-the-secret");
  expect(wrongSecret.status).toBe(401);

  // Still armed, still no runs.
  await page.reload();
  await expect(page.getByText("Armed and locked")).toBeVisible();
  await expect(page.getByTestId("live-dashboard")).toHaveCount(0);

  // The real cron call spawns the run(s) and flips the launch live.
  const res = await callCron(CRON_SECRET);
  expect(res.status).toBe(200);
  const body = (await res.json()) as {
    ok: boolean;
    launched: number;
    spawned: number;
  };
  expect(body.ok).toBe(true);
  // Other suites may leave their own due launches in the shared DB, so assert at-least.
  expect(body.launched).toBeGreaterThanOrEqual(1);
  expect(body.spawned).toBeGreaterThanOrEqual(1);

  // The launch is now live with its spawned run visible on the dashboard.
  await page.reload();
  await expect(page.getByTestId("live-dashboard")).toBeVisible();
  await expect(page.getByTestId("launch-percent")).toContainText("0 of 1 done");

  // Idempotent: a second cron run must not double-spawn this launch (it's live now).
  const again = await callCron(CRON_SECRET);
  expect(again.status).toBe(200);
  await page.reload();
  await expect(page.getByTestId("launch-percent")).toContainText("0 of 1 done");
});
