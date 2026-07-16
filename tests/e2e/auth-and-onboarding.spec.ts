import { test, expect } from "@playwright/test";
import { signInAs, testEmail, createWorkspace } from "./helpers";

test.describe("unauthenticated access", () => {
  for (const path of [
    "/app",
    "/onboarding",
    "/w/00000000-0000-0000-0000-000000000000",
  ]) {
    test(`${path} redirects to /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    });
  }
});

test("magic link sign-in for a brand new user lands on workspace creation", async ({
  page,
}) => {
  const email = testEmail("founder");
  await signInAs(page, email);

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole("heading", { name: "Name your business" }),
  ).toBeVisible();
});

test("creating a workspace lands on Command View with the full admin sidebar", async ({
  page,
}) => {
  const email = testEmail("founder");
  await signInAs(page, email);
  await expect(page).toHaveURL(/\/onboarding$/);

  await createWorkspace(page, "Acme Creator Co");
  await expect(
    page.getByRole("heading", { name: "Welcome to Acme Creator Co" }),
  ).toBeVisible();

  const sidebar = page.getByTestId("desktop-sidebar");
  await expect(sidebar.getByText("Acme Creator Co")).toBeVisible();
  for (const label of [
    "Command View",
    "Playbooks",
    "Team",
    "Goals",
    "Brain",
    "Launches",
  ]) {
    await expect(sidebar.getByRole("link", { name: label })).toBeVisible();
  }
});

test("returning to / after already having a workspace redirects straight into it", async ({
  page,
}) => {
  const email = testEmail("founder");
  await signInAs(page, email);
  await createWorkspace(page, "Repeat Visit Co");
  const workspaceUrl = page.url();

  await page.goto("/app");
  await expect(page).toHaveURL(workspaceUrl);
});
