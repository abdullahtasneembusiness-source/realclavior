import { test, expect } from "@playwright/test";
import {
  signInAs,
  testEmail,
  createWorkspace,
  completeOnboarding,
  getAccessToken,
  restGet,
} from "./helpers";

const runSteps = "[data-testid^='run-step-']";
const playbookSteps = "[data-testid^='step-row-']";

test("hand off a playbook, operator runs and submits it, founder approves", async ({
  page,
  browser,
}) => {
  const operatorEmail = testEmail("operator");
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Runs Co");

  // Invite an operator and have them accept so they're an active member.
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

  // Founder builds a two-step playbook — the second step requires proof.
  await page.goto(`/w/${workspaceId}/playbooks`);
  await page.getByTestId("new-playbook-trigger").click();
  await page.getByTestId("new-playbook-manual").click();
  await page.getByLabel("Name").fill("Publish blog post");
  await page.getByRole("button", { name: "Create playbook" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/w/${workspaceId}/playbooks/[0-9a-f-]+$`),
  );

  await page.locator("#add-step-title").fill("Draft the post");
  await page.getByTestId("add-step-submit").click();
  await expect(
    page.locator(playbookSteps).filter({ hasText: "Draft the post" }),
  ).toBeVisible();

  await page.locator("#add-step-title").fill("Publish and share");
  await page.locator("#add-step-proof").check();
  await page.getByTestId("add-step-submit").click();
  await expect(
    page.locator(playbookSteps).filter({ hasText: "Publish and share" }),
  ).toBeVisible();

  // Hand it off to the operator (who does NOT own the playbook — the RLS path that
  // matters most).
  // exact: the meta form above also has an "Owner (who runs it)" select.
  await page
    .getByLabel("Who runs it", { exact: true })
    .selectOption({ label: "Runner" });
  await page.getByTestId("hand-off-submit").click();
  await expect(page.getByTestId("hand-off-success")).toBeVisible();

  // The operator sees the run on their home and opens it.
  await opPage.goto(`/w/${workspaceId}`);
  const myRuns = opPage.getByTestId("my-runs");
  await expect(myRuns).toContainText("Publish blog post");
  await myRuns.getByRole("link").first().click();
  await expect(opPage).toHaveURL(
    new RegExp(`/w/${workspaceId}/runs/[0-9a-f-]+$`),
  );
  const runId = opPage.url().split("/runs/")[1];

  // RLS: an unrelated signed-in user cannot read this run over the API.
  const outsiderToken = await getAccessToken(testEmail("outsider"));
  const outsiderRead = await restGet(`runs?id=eq.${runId}`, outsiderToken);
  expect(outsiderRead.status).toBe(200);
  expect(outsiderRead.body).toEqual([]);

  // Start the run — steps become tickable.
  await opPage.getByTestId("run-start").click();

  const step1 = opPage.locator(runSteps).filter({ hasText: "Draft the post" });
  await step1.locator("input[type=checkbox]").check();
  await step1.getByRole("button", { name: "Save" }).click();
  await expect(opPage.getByText("1 of 2 steps done")).toBeVisible();

  // Submitting now is blocked — step 2 isn't done.
  await opPage.getByTestId("run-submit").click();
  await expect(opPage.getByText(/still to go/)).toBeVisible();

  // Finish step 2 with its required proof.
  const step2 = opPage
    .locator(runSteps)
    .filter({ hasText: "Publish and share" });
  await step2.locator("input[type=checkbox]").check();
  await step2.locator("input[type=url]").fill("https://example.com/post");
  await step2.getByRole("button", { name: "Save" }).click();
  await expect(opPage.getByText("2 of 2 steps done")).toBeVisible();

  // Now it submits.
  await opPage.getByTestId("run-submit").click();
  await expect(opPage.getByText("In review")).toBeVisible();
  await opContext.close();

  // Founder reviews and approves.
  await page.goto(`/w/${workspaceId}/runs/${runId}`);
  await expect(page.getByText("In review")).toBeVisible();
  await page.getByTestId("run-approve").click();
  await expect(page.getByText("Approved")).toBeVisible();
});
