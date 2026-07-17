import { test, expect } from "@playwright/test";
import { signInAs, testEmail, createWorkspace } from "./helpers";

test("a new operator is walked through onboarding on first login, then lands home", async ({
  page,
  browser,
}) => {
  const operatorEmail = testEmail("operator");
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Onboard Co");

  // Two Brain entries → a two-step walkthrough.
  await page.goto(`/w/${workspaceId}/brain`);
  for (const title of ["How we talk to customers", "Where the assets live"]) {
    await page.getByTestId("new-brain-entry").click();
    await page.getByLabel("Title").fill(title);
    await page.getByTestId("save-brain-entry").click();
    await expect(page.getByText(title)).toBeVisible();
  }

  // Invite an operator.
  await page.goto(`/w/${workspaceId}/team`);
  await page.getByRole("button", { name: "Invite team member" }).click();
  await page.locator("#invite-email").fill(operatorEmail);
  await page.locator("#invite-role").selectOption("operator");
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText("Pending · 1")).toBeVisible();

  // Operator signs in → auto-routed into onboarding, not their home.
  const opContext = await browser.newContext();
  const opPage = await opContext.newPage();
  await signInAs(opPage, operatorEmail);
  await expect(opPage).toHaveURL(new RegExp(`/w/${workspaceId}/welcome$`));

  await expect(opPage.getByTestId("onboarding-item")).toBeVisible();
  await expect(opPage.getByTestId("onboarding-progress")).toHaveText("1 of 2");

  // Step through the walkthrough.
  await opPage.getByTestId("onboarding-next").click();
  await expect(opPage.getByTestId("onboarding-progress")).toHaveText("2 of 2");
  await opPage.getByTestId("onboarding-next").click();

  // Completion screen, then route into the normal operator home.
  await expect(opPage.getByTestId("onboarding-complete")).toBeVisible();
  await opPage.getByTestId("onboarding-finish").click();
  await expect(opPage).toHaveURL(new RegExp(`/w/${workspaceId}$`));
  await expect(
    opPage.getByRole("heading", { name: "My Playbooks" }),
  ).toBeVisible();

  // Onboarding doesn't re-trigger on a later visit — completion persisted.
  await opPage.goto(`/w/${workspaceId}`);
  await expect(opPage).toHaveURL(new RegExp(`/w/${workspaceId}$`));
  await expect(
    opPage.getByRole("heading", { name: "My Playbooks" }),
  ).toBeVisible();

  await opContext.close();
});
