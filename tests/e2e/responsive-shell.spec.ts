import { test, expect } from "@playwright/test";
import {
  signInAs,
  testEmail,
  createWorkspace,
  completeOnboarding,
} from "./helpers";

test.describe("desktop viewport", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("admin sees the sidebar, not the mobile header", async ({ page }) => {
    await signInAs(page, testEmail("founder"));
    await createWorkspace(page, "Desktop Co");

    await expect(page.getByTestId("desktop-sidebar")).toBeVisible();
    await expect(page.getByTestId("mobile-header")).toBeHidden();
    await expect(page.getByTestId("bottom-tab-bar")).toHaveCount(0);
  });
});

test.describe("mobile viewport", () => {
  // A plain viewport override, not a devices["iPhone 13"] preset: that preset sets a
  // worker-level defaultBrowserType (webkit), which Playwright rejects inside a
  // describe-scoped test.use(), and we only install/run chromium in CI anyway. Our
  // shell's responsive behavior is a pure CSS width breakpoint (Tailwind `lg:`), so
  // viewport width alone is what matters here.
  test.use({ viewport: { width: 390, height: 844 } });

  test("admin gets a hamburger drawer that opens, navigates, and closes", async ({
    page,
  }) => {
    await signInAs(page, testEmail("founder"));
    await createWorkspace(page, "Mobile Admin Co");
    const workspaceUrl = page.url();

    await expect(page.getByTestId("desktop-sidebar")).toBeHidden();
    await expect(page.getByTestId("mobile-header")).toBeVisible();
    await expect(page.getByTestId("mobile-drawer")).not.toBeAttached();

    await page.getByTestId("mobile-nav-trigger").click();
    const drawer = page.getByTestId("mobile-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Team" })).toBeVisible();

    await drawer.getByRole("link", { name: "Team" }).click();
    await expect(page).toHaveURL(new RegExp(`${workspaceUrl}/team$`));
    await expect(drawer).not.toBeAttached();
  });

  test("operator gets a bottom tab bar and no drawer at all", async ({
    page,
    browser,
  }) => {
    const founderEmail = testEmail("founder");
    const operatorEmail = testEmail("operator");

    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const desktopPage = await desktopContext.newPage();
    await signInAs(desktopPage, founderEmail);
    const workspaceId = await createWorkspace(
      desktopPage,
      "Mobile Operator Co",
    );

    await desktopPage.goto(`/w/${workspaceId}/team`);
    await desktopPage
      .getByRole("button", { name: "Invite team member" })
      .click();
    await desktopPage.locator("#invite-email").fill(operatorEmail);
    await desktopPage.locator("#invite-role").selectOption("operator");
    await desktopPage.getByRole("button", { name: "Send invite" }).click();
    await expect(desktopPage.getByText("Pending · 1")).toBeVisible();
    await desktopContext.close();

    await signInAs(page, operatorEmail);
    await completeOnboarding(page, workspaceId);
    await expect(page).toHaveURL(new RegExp(`/w/${workspaceId}$`));

    await expect(page.getByTestId("bottom-tab-bar")).toBeVisible();
    await expect(page.getByTestId("operator-mobile-header")).toBeVisible();
    await expect(page.getByTestId("mobile-nav-trigger")).toHaveCount(0);

    const tabBar = page.getByTestId("bottom-tab-bar");
    await expect(
      tabBar.getByRole("link", { name: "My Playbooks" }),
    ).toBeVisible();
    await expect(tabBar.getByRole("link", { name: "Brain" })).toBeVisible();

    await tabBar.getByRole("link", { name: "Brain" }).click();
    await expect(page).toHaveURL(new RegExp(`/w/${workspaceId}/brain$`));
  });
});
