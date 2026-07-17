import { test, expect } from "@playwright/test";
import {
  signInAs,
  testEmail,
  createWorkspace,
  completeOnboarding,
} from "./helpers";

const runSteps = "[data-testid^='run-step-']";
const playbookSteps = "[data-testid^='step-row-']";

test("a correction saved to Feedback Memory surfaces on the operator's run, then resolves away", async ({
  page,
  browser,
}) => {
  const operatorEmail = testEmail("operator");
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Memory Co");

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
  await completeOnboarding(opPage, workspaceId, operatorEmail);

  // Founder builds a one-step playbook and hands it off.
  await page.goto(`/w/${workspaceId}/playbooks`);
  await page.getByTestId("new-playbook-trigger").click();
  await page.getByTestId("new-playbook-manual").click();
  await page.getByLabel("Name").fill("Edit the podcast");
  await page.getByRole("button", { name: "Create playbook" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/w/${workspaceId}/playbooks/[0-9a-f-]+$`),
  );
  const playbookId = page.url().split("/playbooks/")[1];

  await page.locator("#add-step-title").fill("Export the audio");
  await page.getByTestId("add-step-submit").click();
  await expect(
    page.locator(playbookSteps).filter({ hasText: "Export the audio" }),
  ).toBeVisible();

  await page
    .getByLabel("Who runs it", { exact: true })
    .selectOption({ label: "Runner" });
  await page.getByTestId("hand-off-submit").click();
  await expect(page.getByTestId("hand-off-success")).toBeVisible();

  // Operator runs it and submits — no feedback yet, so no amber panel.
  await opPage.goto(`/w/${workspaceId}`);
  await opPage.getByTestId("my-runs").getByRole("link").first().click();
  await expect(opPage).toHaveURL(
    new RegExp(`/w/${workspaceId}/runs/[0-9a-f-]+$`),
  );
  const runId = opPage.url().split("/runs/")[1];
  await expect(opPage.getByTestId("feedback-panel")).toHaveCount(0);

  await opPage.getByTestId("run-start").click();
  const step = opPage.locator(runSteps).first();
  await step.locator("input[type=checkbox]").check();
  await step.getByRole("button", { name: "Save" }).click();
  await expect(opPage.getByText("1 of 1 steps done")).toBeVisible();
  await opPage.getByTestId("run-submit").click();
  await expect(opPage.getByText("In review")).toBeVisible();

  // Founder reviews and requests changes, saving the correction to Feedback Memory.
  await page.goto(`/w/${workspaceId}/runs/${runId}`);
  await page.getByTestId("run-request-changes").click();
  await page
    .locator("#rc-comment")
    .fill("Add captions before uploading — not after.");
  // "Save to Feedback Memory" is checked by default; send it back.
  await page.getByTestId("request-changes-send").click();
  await expect(page.getByText("Changes requested")).toBeVisible();

  // The operator reopens the run and the amber "Before you start" panel is there.
  await opPage.goto(`/w/${workspaceId}/runs/${runId}`);
  const panel = opPage.getByTestId("feedback-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Add captions before uploading");

  // The note is managed on the playbook — the founder resolves it.
  await page.goto(`/w/${workspaceId}/playbooks/${playbookId}`);
  const memory = page.getByTestId("feedback-memory-list");
  await expect(memory).toContainText("Add captions before uploading");
  await memory.getByRole("button", { name: "Resolve" }).first().click();
  await expect(
    page.getByText("Corrections you save while reviewing a run land here."),
  ).toBeVisible();

  // Resolved — it no longer shows on the operator's run.
  await opPage.goto(`/w/${workspaceId}/runs/${runId}`);
  await expect(opPage.getByTestId("feedback-panel")).toHaveCount(0);
  await opContext.close();
});
