import { test, expect } from "@playwright/test";
import {
  signInAs,
  testEmail,
  createWorkspace,
  completeOnboarding,
} from "./helpers";

const runSteps = "[data-testid^='run-step-']";
const playbookSteps = "[data-testid^='step-row-']";

test("Command View surfaces active runs and the Live Feed tracks activity", async ({
  page,
  browser,
}) => {
  const operatorEmail = testEmail("operator");
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Command Co");

  // Invite an operator and have them accept.
  await page.goto(`/w/${workspaceId}/team`);
  await page.getByRole("button", { name: "Invite team member" }).click();
  await page.locator("#invite-email").fill(operatorEmail);
  await page.locator("#invite-role").selectOption("operator");
  await page.locator("#invite-title").fill("Runner");
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText("Pending · 1")).toBeVisible();

  const opContext = await browser.newContext();
  const opPage = await opContext.newPage();
  await signInAs(opPage, operatorEmail);
  await completeOnboarding(opPage, workspaceId);

  // Founder builds a one-step playbook and hands it off.
  await page.goto(`/w/${workspaceId}/playbooks`);
  await page.getByTestId("new-playbook-trigger").click();
  await page.getByTestId("new-playbook-manual").click();
  await page.getByLabel("Name").fill("Weekly report");
  await page.getByRole("button", { name: "Create playbook" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/w/${workspaceId}/playbooks/[0-9a-f-]+$`),
  );
  await page.locator("#add-step-title").fill("Compile the numbers");
  await page.getByTestId("add-step-submit").click();
  await expect(
    page.locator(playbookSteps).filter({ hasText: "Compile the numbers" }),
  ).toBeVisible();

  await page
    .getByLabel("Who runs it", { exact: true })
    .selectOption({ label: "Runner" });
  await page.getByTestId("hand-off-submit").click();
  await expect(page.getByTestId("hand-off-success")).toBeVisible();

  // Operator opens and starts the run.
  await opPage.goto(`/w/${workspaceId}`);
  const myRuns = opPage.getByTestId("my-runs");
  await expect(myRuns).toContainText("Weekly report");
  await myRuns.getByRole("link").first().click();
  await expect(opPage).toHaveURL(
    new RegExp(`/w/${workspaceId}/runs/[0-9a-f-]+$`),
  );
  await opPage.getByTestId("run-start").click();
  await expect(
    opPage.locator(runSteps).first().locator("input[type=checkbox]"),
  ).toBeVisible();

  // Founder's Command View shows the in-progress run, and the Live Feed logs the start.
  await page.goto(`/w/${workspaceId}`);
  const cv = page.getByTestId("command-view");
  await expect(cv).toContainText("Weekly report");
  const feed = page.getByTestId("live-feed");
  await expect(feed).toContainText("Runner");
  await expect(feed).toContainText("started");
  await expect(feed).toContainText("Weekly report");

  // Operator finishes the step and submits.
  const step = opPage.locator(runSteps).first();
  await step.locator("input[type=checkbox]").check();
  await step.getByRole("button", { name: "Save" }).click();
  await expect(opPage.getByText("1 of 1 steps done")).toBeVisible();
  await opPage.getByTestId("run-submit").click();
  await expect(opPage.getByText("In review")).toBeVisible();
  await opContext.close();

  // Now the run needs the founder's attention, and the feed logs the submission.
  await page.goto(`/w/${workspaceId}`);
  await expect(page.getByTestId("cv-needs-attention")).toContainText(
    "Weekly report",
  );
  await expect(page.getByTestId("live-feed")).toContainText("submitted");
});
