import { test, expect } from "@playwright/test";
import {
  signInAs,
  testEmail,
  createWorkspace,
  completeOnboarding,
} from "./helpers";

test("founder builds the manual via the AI interview, edits, and it displays", async ({
  page,
}) => {
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Manual Co");

  // The pinned card on Team Brain leads to the manual; it's empty to start.
  await page.goto(`/w/${workspaceId}/brain`);
  const card = page.getByTestId("manual-card");
  await expect(card).toContainText("Not set up yet");
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/w/${workspaceId}/brain/manual$`));

  // Start the interview.
  await page.getByTestId("manual-interview-cta").click();
  await expect(page).toHaveURL(
    new RegExp(`/w/${workspaceId}/brain/manual/interview$`),
  );

  // Answer every question, then generate.
  for (let i = 0; ; i++) {
    await page.getByTestId("interview-answer").fill(`Answer ${i + 1}`);
    const next = page.getByTestId("interview-next");
    if (await next.isVisible().catch(() => false)) {
      await next.click();
    } else {
      break;
    }
  }
  await page.getByTestId("interview-generate").click();

  // The synthesized draft appears (from the deterministic mock), editable.
  const review = page.getByTestId("manual-review");
  await expect(review).toBeVisible();
  await expect(page.getByTestId("review-communication")).toHaveValue(
    /blunt but never personal/,
  );

  // Edit one section, save → lands back on the manual view showing the edit.
  await page
    .getByTestId("review-standard")
    .fill("Great means I would ship it under my own name.");
  await page.getByTestId("manual-save").click();
  await expect(page).toHaveURL(new RegExp(`/w/${workspaceId}/brain/manual$`));
  await expect(page.getByTestId("manual-section-standard")).toContainText(
    "ship it under my own name",
  );
});

test("the manual is read-only for operators and leads their onboarding", async ({
  page,
  browser,
}) => {
  const operatorEmail = testEmail("operator");
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Onboard Manual Co");

  // Founder writes one section by hand (no AI needed) so the manual has content.
  await page.goto(`/w/${workspaceId}/brain/manual`);
  await page.getByTestId("edit-section-communication").click();
  await page
    .getByTestId("section-input-communication")
    .fill("I like it blunt and in the open.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("manual-section-communication")).toContainText(
    "blunt and in the open",
  );

  // Invite an operator.
  await page.goto(`/w/${workspaceId}/team`);
  await page.getByRole("button", { name: "Invite team member" }).click();
  await page.locator("#invite-email").fill(operatorEmail);
  await page.locator("#invite-role").selectOption("operator");
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText("Pending · 1")).toBeVisible();

  // Operator's first login lands in onboarding with the manual as the lead item.
  const opContext = await browser.newContext();
  const opPage = await opContext.newPage();
  await signInAs(opPage, operatorEmail);
  await expect(opPage).toHaveURL(new RegExp(`/w/${workspaceId}/welcome$`));
  const item = opPage.getByTestId("onboarding-item");
  await expect(item).toContainText("Founder's Manual");
  await expect(item).toContainText("blunt and in the open");

  // Past onboarding, the operator can read the manual but can't edit it.
  await completeOnboarding(opPage, workspaceId, operatorEmail);
  await opPage.goto(`/w/${workspaceId}/brain/manual`);
  await expect(
    opPage.getByTestId("manual-section-communication"),
  ).toContainText("blunt and in the open");
  await expect(opPage.getByTestId("edit-section-communication")).toHaveCount(0);

  await opContext.close();
});
