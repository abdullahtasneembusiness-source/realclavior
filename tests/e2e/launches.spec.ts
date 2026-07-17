import { test, expect, type Page } from "@playwright/test";
import { signInAs, testEmail, createWorkspace } from "./helpers";

const runSteps = "[data-testid^='run-step-']";
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

const todayStr = new Date().toISOString().slice(0, 10);

test("build a launch, arm it for today, and runs spawn into a live dashboard", async ({
  page,
}) => {
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Launch Co");

  await createPlaybookWithStep(page, workspaceId, "Email the list", "Send it");

  // Create a launch starting today.
  await page.goto(`/w/${workspaceId}/launches`);
  await page.getByTestId("new-launch-trigger").click();
  await page.getByLabel("Name").fill("Spring launch");
  await page.locator("#launch-start").fill(todayStr);
  await page.getByTestId("create-launch-submit").click();
  await expect(page).toHaveURL(
    new RegExp(`/w/${workspaceId}/launches/[0-9a-f-]+$`),
  );

  // Two items on different days (owner defaults to the only member — the founder).
  await page.locator("#item-offset").fill("0");
  await page.getByTestId("add-item-submit").click();
  await expect(page.locator("[data-testid^='launch-item-']")).toHaveCount(1);
  await page.locator("#item-offset").fill("1");
  await page.getByTestId("add-item-submit").click();
  await expect(page.locator("[data-testid^='launch-item-']")).toHaveCount(2);

  // The timeline renders.
  await expect(page.getByTestId("launch-timeline")).toBeVisible();

  // Arm it — start date is today, so it goes live immediately and spawns 2 runs.
  await page.getByTestId("arm-launch").click();
  await expect(page.getByTestId("live-dashboard")).toBeVisible();
  await expect(page.getByTestId("launch-percent")).toContainText("0 of 2 done");

  // Complete one spawned run → percent reflects it.
  await page.getByTestId("live-dashboard").getByRole("link").first().click();
  await expect(page).toHaveURL(
    new RegExp(`/w/${workspaceId}/runs/[0-9a-f-]+$`),
  );
  await page.getByTestId("run-start").click();
  const step = page.locator(runSteps).first();
  await step.locator("input[type=checkbox]").check();
  await step.getByRole("button", { name: "Save" }).click();
  await page.getByTestId("run-submit").click();
  await page.getByTestId("run-approve").click();
  await expect(page.getByText("Approved")).toBeVisible();

  // Back on the launch, progress is now 1 of 2.
  await page.goto(`/w/${workspaceId}/launches`);
  await page.getByTestId("launch-grid").getByRole("link").first().click();
  await expect(page.getByTestId("launch-percent")).toContainText("1 of 2 done");
});

test("save a launch as a template, then start a new launch from it", async ({
  page,
}) => {
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Template Co");

  await createPlaybookWithStep(
    page,
    workspaceId,
    "Record the video",
    "Film it",
  );

  // A draft launch with one item.
  await page.goto(`/w/${workspaceId}/launches`);
  await page.getByTestId("new-launch-trigger").click();
  await page.getByLabel("Name").fill("Course drop");
  await page.getByTestId("create-launch-submit").click();
  await expect(page).toHaveURL(
    new RegExp(`/w/${workspaceId}/launches/[0-9a-f-]+$`),
  );
  await page.locator("#item-offset").fill("2");
  await page.getByTestId("add-item-submit").click();
  await expect(page.locator("[data-testid^='launch-item-']")).toHaveCount(1);

  // Save it as a template.
  await page.getByTestId("save-template-trigger").click();
  await page.getByTestId("save-template-submit").click();

  // New launch from that template carries the item over.
  await page.goto(`/w/${workspaceId}/launches`);
  await expect(page.getByTestId("template-list")).toContainText(
    "Course drop template",
  );
  await page.getByTestId("new-launch-trigger").click();
  await page.getByTestId("launch-mode-template").click();
  await page.getByLabel("Name").fill("Course drop — round 2");
  await page.getByTestId("create-launch-submit").click();
  await expect(page).toHaveURL(
    new RegExp(`/w/${workspaceId}/launches/[0-9a-f-]+$`),
  );
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Course drop — round 2",
  );
  await expect(page.locator("[data-testid^='launch-item-']")).toHaveCount(1);
  await expect(
    page.locator("[data-testid^='launch-item-']").first(),
  ).toContainText("Record the video");
});
