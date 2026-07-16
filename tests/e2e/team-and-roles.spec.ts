import { test, expect } from "@playwright/test";
import { signInAs, testEmail, createWorkspace } from "./helpers";

async function createWorkspaceAs(
  page: import("@playwright/test").Page,
  email: string,
) {
  await signInAs(page, email);
  return createWorkspace(page, "Team Test Co");
}

test("founder invites an operator, pending row appears immediately", async ({
  page,
}) => {
  const founderEmail = testEmail("founder");
  const operatorEmail = testEmail("operator");
  const workspaceId = await createWorkspaceAs(page, founderEmail);

  await page.goto(`/w/${workspaceId}/team`);
  await page.getByRole("button", { name: "Invite team member" }).click();
  await page.locator("#invite-email").fill(operatorEmail);
  await page.locator("#invite-role").selectOption("operator");
  await page.locator("#invite-title").fill("Content Operator");
  await page.getByRole("button", { name: "Send invite" }).click();

  await expect(page.getByText("Pending · 1")).toBeVisible();
  await expect(page.getByText(operatorEmail)).toBeVisible();
});

test("operator sees the simplified shell and can't reach admin routes by URL", async ({
  page,
  browser,
}) => {
  const founderEmail = testEmail("founder");
  const operatorEmail = testEmail("operator");
  const workspaceId = await createWorkspaceAs(page, founderEmail);

  await page.goto(`/w/${workspaceId}/team`);
  await page.getByRole("button", { name: "Invite team member" }).click();
  await page.locator("#invite-email").fill(operatorEmail);
  await page.locator("#invite-role").selectOption("operator");
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText("Pending · 1")).toBeVisible();

  // Fresh browser context: the operator signing in for the first time.
  const operatorContext = await browser.newContext();
  const operatorPage = await operatorContext.newPage();
  await signInAs(operatorPage, operatorEmail);

  // accept_pending_invites() links them straight into the same workspace.
  await expect(operatorPage).toHaveURL(new RegExp(`/w/${workspaceId}$`));
  await expect(
    operatorPage.getByRole("heading", { name: "My Playbooks" }),
  ).toBeVisible();

  const sidebar = operatorPage.getByTestId("desktop-sidebar");
  await expect(
    sidebar.getByRole("link", { name: "My Playbooks" }),
  ).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Brain" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Team" })).not.toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Goals" })).not.toBeVisible();

  // Typing an admin-only URL directly bounces them home, not to an error page.
  await operatorPage.goto(`/w/${workspaceId}/team`);
  await expect(operatorPage).toHaveURL(new RegExp(`/w/${workspaceId}$`));
  await operatorPage.goto(`/w/${workspaceId}/goals`);
  await expect(operatorPage).toHaveURL(new RegExp(`/w/${workspaceId}$`));
  await operatorPage.goto(`/w/${workspaceId}/launches`);
  await expect(operatorPage).toHaveURL(new RegExp(`/w/${workspaceId}$`));

  await operatorContext.close();
});

test("founder can promote an operator to manager, and it takes effect", async ({
  page,
  browser,
}) => {
  const founderEmail = testEmail("founder");
  const operatorEmail = testEmail("operator");
  const workspaceId = await createWorkspaceAs(page, founderEmail);

  await page.goto(`/w/${workspaceId}/team`);
  await page.getByRole("button", { name: "Invite team member" }).click();
  await page.locator("#invite-email").fill(operatorEmail);
  await page.locator("#invite-role").selectOption("operator");
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText("Pending · 1")).toBeVisible();

  // Operator accepts the invite in a separate session first.
  const operatorContext = await browser.newContext();
  const operatorPage = await operatorContext.newPage();
  await signInAs(operatorPage, operatorEmail);
  await expect(operatorPage).toHaveURL(new RegExp(`/w/${workspaceId}$`));
  await operatorContext.close();

  // Founder promotes them to manager.
  await page.reload();
  const activeRow = page.getByTestId(`member-row-${operatorEmail}`);
  await activeRow.getByRole("button", { name: "Member actions" }).click();
  // Hover the submenu trigger to open it (Radix opens sub-content on hover), then
  // pick Manager.
  await page.getByRole("menuitem", { name: "Change role" }).hover();
  await page.getByRole("menuitem", { name: "Manager" }).click();

  // Wait for the change to actually commit + revalidate (the role badge flips to
  // Manager) before signing in as the promoted member — otherwise the next sign-in
  // can race ahead of the server action and still see the old role.
  await expect(activeRow.getByText("Manager")).toBeVisible();

  // Sign back in as that member — they should now get the full admin shell.
  const promotedContext = await browser.newContext();
  const promotedPage = await promotedContext.newPage();
  await signInAs(promotedPage, operatorEmail);
  await expect(promotedPage).toHaveURL(new RegExp(`/w/${workspaceId}$`));
  const sidebar = promotedPage.getByTestId("desktop-sidebar");
  await expect(sidebar.getByRole("link", { name: "Team" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Goals" })).toBeVisible();
  await promotedContext.close();
});
