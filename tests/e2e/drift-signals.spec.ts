import { test, expect } from "@playwright/test";
import {
  signInAs,
  testEmail,
  createWorkspace,
  completeOnboarding,
} from "./helpers";

const runSteps = "[data-testid^='run-step-']";
const playbookSteps = "[data-testid^='step-row-']";

test("recurring corrections surface as a coaching check-in; operators never see it", async ({
  page,
  browser,
}) => {
  const operatorEmail = testEmail("operator");
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Drift Co");

  // Invite an operator, who accepts and onboards.
  await page.goto(`/w/${workspaceId}/team`);
  await page.getByRole("button", { name: "Invite team member" }).click();
  await page.locator("#invite-email").fill(operatorEmail);
  await page.locator("#invite-role").selectOption("operator");
  await page.locator("#invite-title").fill("Editor");
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText("Pending · 1")).toBeVisible();

  const opContext = await browser.newContext();
  const opPage = await opContext.newPage();
  await signInAs(opPage, operatorEmail);
  await completeOnboarding(opPage, workspaceId, operatorEmail);

  // A one-step playbook, handed to the operator.
  await page.goto(`/w/${workspaceId}/playbooks`);
  await page.getByTestId("new-playbook-trigger").click();
  await page.getByTestId("new-playbook-manual").click();
  await page.getByLabel("Name").fill("Edit the reel");
  await page.getByRole("button", { name: "Create playbook" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/w/${workspaceId}/playbooks/[0-9a-f-]+$`),
  );
  const playbookId = page.url().split("/playbooks/")[1];
  await page.locator("#add-step-title").fill("Cut the intro");
  await page.getByTestId("add-step-submit").click();
  await expect(
    page.locator(playbookSteps).filter({ hasText: "Cut the intro" }),
  ).toBeVisible();
  await page
    .getByLabel("Who runs it", { exact: true })
    .selectOption({ label: "Editor" });
  await page.getByTestId("hand-off-submit").click();
  await expect(page.getByTestId("hand-off-success")).toBeVisible();

  // Operator runs and submits it.
  await opPage.goto(`/w/${workspaceId}`);
  await opPage.getByTestId("my-runs").getByRole("link").first().click();
  await expect(opPage).toHaveURL(
    new RegExp(`/w/${workspaceId}/runs/[0-9a-f-]+$`),
  );
  const runId = opPage.url().split("/runs/")[1];
  await opPage.getByTestId("run-start").click();
  const step = opPage.locator(runSteps).first();
  await step.locator("input[type=checkbox]").check();
  await step.getByRole("button", { name: "Save" }).click();
  await opPage.getByTestId("run-submit").click();
  await expect(opPage.getByText("In review")).toBeVisible();

  // Three rounds of changes → three run-tied corrections for this operator.
  for (let i = 0; i < 3; i++) {
    await page.goto(`/w/${workspaceId}/runs/${runId}`);
    await page.getByTestId("run-request-changes").click();
    await page.locator("#rc-comment").fill(`Fix pass ${i + 1}`);
    await page.getByTestId("save-to-memory").uncheck();
    await page.getByTestId("request-changes-send").click();
    await expect(page.getByText("Changes requested")).toBeVisible();
    if (i < 2) {
      await opPage.goto(`/w/${workspaceId}/runs/${runId}`);
      await opPage.getByTestId("run-submit").click();
      await expect(opPage.getByText("In review")).toBeVisible();
    }
  }

  // The recurring flag shows on the playbook, named and counted, coaching-toned.
  await page.goto(`/w/${workspaceId}/playbooks/${playbookId}`);
  const callout = page.getByTestId("drift-checkin");
  await expect(callout).toBeVisible();
  await expect(callout).toContainText("Editor");
  await expect(callout).toContainText("3 times");
  await expect(callout).toContainText("Worth a check-in");

  // And a compact version on Command View.
  await page.goto(`/w/${workspaceId}`);
  await expect(page.getByTestId("drift-checkin")).toBeVisible();

  // The Team page shows an up trend for the operator.
  await page.goto(`/w/${workspaceId}/team`);
  await expect(page.getByTestId("trend-up")).toBeVisible();

  // The operator never sees drift signals about themselves.
  await opPage.goto(`/w/${workspaceId}`);
  await expect(opPage.getByTestId("drift-checkin")).toHaveCount(0);

  await opContext.close();
});
