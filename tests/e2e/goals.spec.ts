import { test, expect, type Page } from "@playwright/test";
import { signInAs, testEmail, createWorkspace } from "./helpers";

async function createPlaybook(
  page: Page,
  workspaceId: string,
  name: string,
): Promise<void> {
  await page.goto(`/w/${workspaceId}/playbooks`);
  await page.getByTestId("new-playbook-trigger").click();
  await page.getByTestId("new-playbook-manual").click();
  await page.getByLabel("Name").fill(name);
  await page.getByRole("button", { name: "Create playbook" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/w/${workspaceId}/playbooks/[0-9a-f-]+$`),
  );
}

test("create a goal, link two playbooks, set progress — Command View reflects it", async ({
  page,
}) => {
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Goals Co");

  // Create a goal → lands on its detail page.
  await page.goto(`/w/${workspaceId}/goals`);
  await page.getByTestId("new-goal-trigger").click();
  // exact: the dialog's own accessible name is "New goal", which also contains "Goal".
  await page
    .getByLabel("Goal", { exact: true })
    .fill("10k newsletter subscribers");
  await page.getByTestId("create-goal-submit").click();
  await expect(page).toHaveURL(
    new RegExp(`/w/${workspaceId}/goals/[0-9a-f-]+$`),
  );
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "10k newsletter subscribers",
  );

  // Two playbooks, each linked to the goal from the playbook meta form.
  for (const name of ["Weekly newsletter", "Lead magnet funnel"]) {
    await createPlaybook(page, workspaceId, name);
    await page
      .getByTestId("pb-goal-select")
      .selectOption({ label: "10k newsletter subscribers" });
    await page.getByTestId("save-playbook-meta").click();
    await expect(page.getByText("Saved.")).toBeVisible();
  }

  // Goal detail now shows both linked playbooks.
  await page.goto(`/w/${workspaceId}/goals`);
  await page.getByTestId("goal-grid").getByRole("link").first().click();
  // Scope to the content region: the admin sidebar now lists recent playbooks
  // by name, so a bare getByText would match both it and the goal detail.
  const goalMain = page.getByRole("main");
  await expect(goalMain.getByText("Connected playbooks")).toBeVisible();
  await expect(goalMain.getByText("Weekly newsletter")).toBeVisible();
  await expect(goalMain.getByText("Lead magnet funnel")).toBeVisible();

  // Move the progress slider and save.
  const slider = page.locator("#goal-progress");
  await slider.fill("60");
  await expect(page.getByTestId("goal-progress-value")).toHaveText("60%");
  await page.getByTestId("save-goal").click();
  await expect(page.getByText("Saved.")).toBeVisible();

  // Command View's Goals rollup reflects the saved progress.
  await page.goto(`/w/${workspaceId}`);
  const cvGoals = page.getByTestId("cv-goals");
  await expect(cvGoals).toBeVisible();
  await expect(cvGoals).toContainText("10k newsletter subscribers");
  await expect(cvGoals).toContainText("60%");
});
