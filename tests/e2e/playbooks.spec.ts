import { test, expect } from "@playwright/test";
import { signInAs, testEmail, createWorkspace } from "./helpers";

const stepRows = "[data-testid^='step-row-']";

test("founder builds a playbook: create, add steps, reorder, edit, delete", async ({
  page,
}) => {
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Playbook Co");

  await page.goto(`/w/${workspaceId}/playbooks`);
  await expect(
    page.getByRole("heading", { name: "Build your first playbook" }),
  ).toBeVisible();

  // Create a playbook — the dialog collects a name, then drops us into the editor.
  await page.getByTestId("new-playbook-trigger").click();
  await page.getByTestId("new-playbook-manual").click();
  await page.getByLabel("Name").fill("Publish a YouTube video");
  await page.getByRole("button", { name: "Create playbook" }).click();

  await expect(page).toHaveURL(
    new RegExp(`/w/${workspaceId}/playbooks/[0-9a-f-]+$`),
  );
  await expect(
    page.getByRole("heading", { name: "Publish a YouTube video" }),
  ).toBeVisible();

  // Add three steps in order.
  for (const title of [
    "Write the script",
    "Record the video",
    "Edit the cut",
  ]) {
    await page.locator("#add-step-title").fill(title);
    await page.getByTestId("add-step-submit").click();
    await expect(
      page.locator(stepRows).filter({ hasText: title }),
    ).toBeVisible();
  }

  await expect(page.getByTestId("step-count")).toHaveText("3 steps");

  const rows = page.locator(stepRows);
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("Write the script");
  await expect(rows.nth(2)).toContainText("Edit the cut");

  // Move the last step to the top: two "move up" clicks.
  await rows.nth(2).getByLabel("Move step up").click();
  await expect(page.locator(stepRows).nth(1)).toContainText("Edit the cut");
  await page.locator(stepRows).nth(1).getByLabel("Move step up").click();
  await expect(page.locator(stepRows).nth(0)).toContainText("Edit the cut");

  // Edit a step's title via its dialog. Scope to the dialog — the "Step" label also
  // exists on the always-present add-step form below.
  const scriptRow = page
    .locator(stepRows)
    .filter({ hasText: "Write the script" });
  await scriptRow.getByLabel("Edit step").click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Step", { exact: true })
    .fill("Write and approve the script");
  await dialog.getByRole("button", { name: "Save step" }).click();
  await expect(
    page.locator(stepRows).filter({ hasText: "Write and approve the script" }),
  ).toBeVisible();

  // Delete the "Record" step.
  await page
    .locator(stepRows)
    .filter({ hasText: "Record the video" })
    .getByLabel("Delete step")
    .click();
  await expect(page.getByTestId("step-count")).toHaveText("2 steps");
  await expect(
    page.locator(stepRows).filter({ hasText: "Record the video" }),
  ).toHaveCount(0);
});

test("hand a playbook to an operator: details save, list reflects it, then pause", async ({
  page,
  browser,
}) => {
  const operatorEmail = testEmail("operator");
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Details Co");

  // Invite an operator and have them accept, so they're an *active* member and can
  // actually be handed ownership (the owner picker only lists active members).
  await page.goto(`/w/${workspaceId}/team`);
  await page.getByRole("button", { name: "Invite team member" }).click();
  await page.locator("#invite-email").fill(operatorEmail);
  await page.locator("#invite-role").selectOption("operator");
  await page.locator("#invite-title").fill("Video Operator");
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText("Pending · 1")).toBeVisible();

  const operatorContext = await browser.newContext();
  const operatorPage = await operatorContext.newPage();
  await signInAs(operatorPage, operatorEmail);
  await expect(operatorPage).toHaveURL(new RegExp(`/w/${workspaceId}$`));
  await operatorContext.close();

  await page.goto(`/w/${workspaceId}/playbooks`);
  await page.getByTestId("new-playbook-trigger").click();
  await page.getByTestId("new-playbook-manual").click();
  await page.getByLabel("Name").fill("Weekly newsletter");
  await page.getByRole("button", { name: "Create playbook" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/w/${workspaceId}/playbooks/[0-9a-f-]+$`),
  );

  // Fill in the details and save.
  await page
    .getByLabel("Owner (who runs it)")
    .selectOption({ label: "Video Operator" });
  await page.getByLabel("Est. minutes to run").fill("45");
  await page.getByLabel("Cadence").selectOption("weekly");
  await page.getByTestId("save-playbook-meta").click();
  await expect(page.getByText("Saved.")).toBeVisible();

  // Back on the list, the card reflects owner + cadence.
  await page.goto(`/w/${workspaceId}/playbooks`);
  const card = page.getByTestId("playbook-grid");
  await expect(card).toContainText("Weekly newsletter");
  await expect(card).toContainText("Video Operator");
  await expect(card).toContainText("Weekly");
  await expect(card).toContainText("Active");

  // Pause it from the editor's status menu.
  await page.getByText("Weekly newsletter").click();
  await expect(page).toHaveURL(
    new RegExp(`/w/${workspaceId}/playbooks/[0-9a-f-]+$`),
  );
  await page.getByTestId("playbook-status-trigger").click();
  await page.getByRole("menuitem", { name: "Pause" }).click();
  await expect(page.getByTestId("playbook-status-trigger")).toContainText(
    "Paused",
  );
});

test("a step's proof flag and link persist across a reload", async ({
  page,
}) => {
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Proof Co");

  await page.goto(`/w/${workspaceId}/playbooks`);
  await page.getByTestId("new-playbook-trigger").click();
  await page.getByTestId("new-playbook-manual").click();
  await page.getByLabel("Name").fill("Ship a release");
  await page.getByRole("button", { name: "Create playbook" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/w/${workspaceId}/playbooks/[0-9a-f-]+$`),
  );

  // Add a step that requires proof and carries a reference link.
  await page.locator("#add-step-title").fill("Upload the final build");
  await page.locator("#add-step-link").fill("https://example.com/guide");
  await page.locator("#add-step-proof").check();
  await page.getByTestId("add-step-submit").click();

  const row = page
    .locator(stepRows)
    .filter({ hasText: "Upload the final build" });
  await expect(row).toBeVisible();
  await expect(row.getByText("Proof")).toBeVisible();
  await expect(
    row.getByRole("link", { name: /example\.com\/guide/ }),
  ).toBeVisible();

  // The whole point of a playbook is that it stays put — reload and re-check.
  await page.reload();
  const reloaded = page
    .locator(stepRows)
    .filter({ hasText: "Upload the final build" });
  await expect(reloaded.getByText("Proof")).toBeVisible();
  await expect(
    reloaded.getByRole("link", { name: /example\.com\/guide/ }),
  ).toBeVisible();
});

test("validation blocks bad input, and archiving removes the playbook", async ({
  page,
}) => {
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Validation Co");

  await page.goto(`/w/${workspaceId}/playbooks`);

  // A too-short name is rejected server-side; the dialog stays open with the error.
  await page.getByTestId("new-playbook-trigger").click();
  await page.getByTestId("new-playbook-manual").click();
  await page.getByLabel("Name").fill("a");
  await page.getByRole("button", { name: "Create playbook" }).click();
  await expect(
    page.getByText("Give your playbook a name (at least 2 characters)."),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/w/${workspaceId}/playbooks$`));

  // Fix it and land in the editor.
  await page.getByLabel("Name").fill("Onboarding flow");
  await page.getByRole("button", { name: "Create playbook" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/w/${workspaceId}/playbooks/[0-9a-f-]+$`),
  );

  // A malformed link is rejected and no step is created. The link field is a
  // native type="url" input, so the browser's own constraint validation blocks
  // the submit before it even reaches the server (zod is the backstop behind it);
  // either way the guarantee we care about holds — no step gets created.
  await page.locator("#add-step-title").fill("Send the welcome email");
  await page.locator("#add-step-link").fill("notaurl");
  await page.getByTestId("add-step-submit").click();
  await expect(page.getByTestId("step-count")).toHaveText("0 steps");

  // Clearing the bad link lets the same step save.
  await page.locator("#add-step-link").fill("");
  await page.getByTestId("add-step-submit").click();
  await expect(page.getByTestId("step-count")).toHaveText("1 step");

  // Archiving sends us back to the list, where the playbook is gone.
  await page.getByTestId("playbook-status-trigger").click();
  await page.getByRole("menuitem", { name: "Archive playbook" }).click();
  await expect(page).toHaveURL(new RegExp(`/w/${workspaceId}/playbooks$`));
  await expect(page.getByText("Onboarding flow")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Build your first playbook" }),
  ).toBeVisible();
});
