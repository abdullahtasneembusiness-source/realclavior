import { test, expect } from "@playwright/test";
import {
  signInAs,
  testEmail,
  createWorkspace,
  completeOnboarding,
} from "./helpers";

const runSteps = "[data-testid^='run-step-']";
const playbookSteps = "[data-testid^='step-row-']";

test("add Brain entries across categories, then search and filter", async ({
  page,
}) => {
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Brain Co");
  await page.goto(`/w/${workspaceId}/brain`);

  // Entry 1 — Voice.
  await page.getByTestId("new-brain-entry").click();
  await page.getByLabel("Title").fill("Brand voice is punchy and direct");
  await page.locator("#entry-category").selectOption("voice");
  await page
    .getByLabel("Details")
    .fill("Short sentences. No corporate filler.");
  await page.getByTestId("save-brain-entry").click();
  await expect(
    page.getByText("Brand voice is punchy and direct"),
  ).toBeVisible();

  // Entry 2 — Tools.
  await page.getByTestId("new-brain-entry").click();
  await page.getByLabel("Title").fill("Preferred editing tools");
  await page.locator("#entry-category").selectOption("tools");
  await page.getByTestId("save-brain-entry").click();
  await expect(page.getByText("Preferred editing tools")).toBeVisible();

  // Reload so the list is settled (both entries server-rendered, no in-flight
  // revalidation from the last create racing the search input).
  await page.reload();
  const list = page.getByTestId("brain-entry-list");

  // Search by a partial keyword surfaces only the matching entry.
  await page.getByTestId("brain-search").fill("punchy");
  await expect(
    list.getByText("Brand voice is punchy and direct"),
  ).toBeVisible();
  await expect(list.getByText("Preferred editing tools")).toHaveCount(0);

  // Category filter narrows to one category.
  await page.getByTestId("brain-search").fill("");
  await page.getByTestId("brain-filter-tools").click();
  await expect(list.getByText("Preferred editing tools")).toBeVisible();
  await expect(list.getByText("Brand voice is punchy and direct")).toHaveCount(
    0,
  );
});

test("feedback saved while reviewing a run appears in the Corrections mirror", async ({
  page,
  browser,
}) => {
  const operatorEmail = testEmail("operator");
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Corrections Co");

  // Invite an operator, who accepts.
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

  // One-step playbook, handed to the operator.
  await page.goto(`/w/${workspaceId}/playbooks`);
  await page.getByTestId("new-playbook-trigger").click();
  await page.getByTestId("new-playbook-manual").click();
  await page.getByLabel("Name").fill("Publish the newsletter");
  await page.getByRole("button", { name: "Create playbook" }).click();
  await page.locator("#add-step-title").fill("Send the campaign");
  await page.getByTestId("add-step-submit").click();
  await expect(
    page.locator(playbookSteps).filter({ hasText: "Send the campaign" }),
  ).toBeVisible();
  await page
    .getByLabel("Who runs it", { exact: true })
    .selectOption({ label: "Runner" });
  await page.getByTestId("hand-off-submit").click();
  await expect(page.getByTestId("hand-off-success")).toBeVisible();

  // Operator runs and submits.
  await opPage.goto(`/w/${workspaceId}`);
  await opPage.getByTestId("my-runs").getByRole("link").first().click();
  // Wait for the client-side navigation to settle before reading the run id off the
  // URL — otherwise it can still be the list URL and runId comes back undefined.
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

  // Founder requests changes, saving the correction to Feedback Memory.
  await page.goto(`/w/${workspaceId}/runs/${runId}`);
  await page.getByTestId("run-request-changes").click();
  await page
    .locator("#rc-comment")
    .fill("Double-check every link before sending.");
  await page.getByTestId("request-changes-send").click();
  await expect(page.getByText("Changes requested")).toBeVisible();

  // The correction shows up automatically in Brain → Corrections, grouped by playbook.
  await page.goto(`/w/${workspaceId}/brain`);
  await page.getByTestId("brain-filter-corrections").click();
  const corrections = page.getByTestId("brain-corrections");
  await expect(corrections).toBeVisible();
  await expect(corrections).toContainText(
    "Double-check every link before sending",
  );
  await expect(corrections).toContainText("Publish the newsletter");

  await opContext.close();
});
