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

  // Confirm the precondition is committed and visible before invoking the cron: this
  // launch is armed and due today. Removes any doubt that the cron's query would miss it.
  const { data: preRow } = await admin
    .from("launches")
    .select("status, start_date")
    .eq("id", launchId)
    .single();
  expect(preRow?.status).toBe("armed");
  expect(preRow?.start_date).toBe(isoDaysFromNow(0));

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
  const body = (await res.json()) as { ok: boolean; spawned: number };
  expect(body.ok).toBe(true);

  // Assert the cron's effect directly in the DB — deterministic, independent of any
  // page-render timing: THIS launch flipped to live and got exactly one run.
  await expect
    .poll(
      async () => {
        const { data } = await admin
          .from("launches")
          .select("status")
          .eq("id", launchId)
          .single();
        return data?.status ?? null;
      },
      { timeout: 5000 },
    )
    .toBe("live");

  const { count: runCount } = await admin
    .from("runs")
    .select("id", { count: "exact", head: true })
    .eq("launch_id", launchId);
  expect(runCount).toBe(1);

  // And the founder's UI reflects it on a fresh load. Retry the navigation so a
  // transient render lag can't flake it — the DB assertion above already proved the
  // cron's effect, this just confirms the surface renders it.
  await expect(async () => {
    await page.goto(`/w/${workspaceId}/launches/${launchId}`);
    await expect(page.getByTestId("live-dashboard")).toBeVisible({
      timeout: 3000,
    });
  }).toPass({ timeout: 15000 });
  await expect(page.getByTestId("launch-percent")).toContainText("0 of 1 done");

  // Idempotent: a second cron run must not double-spawn (the launch is live now).
  const again = await callCron(CRON_SECRET);
  expect(again.status).toBe(200);
  const { count: runCountAfter } = await admin
    .from("runs")
    .select("id", { count: "exact", head: true })
    .eq("launch_id", launchId);
  expect(runCountAfter).toBe(1);
});
