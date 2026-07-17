import { test, expect } from "@playwright/test";
import { signInAs, testEmail, createWorkspace } from "./helpers";

// These run against tests/e2e/mock-anthropic.mjs (wired in playwright.config.ts), so
// the model output is fixed: a normal description yields the "Publish the weekly
// podcast episode" draft; a description containing "vague" yields a low-confidence one.

test("generate → edit → save produces a playbook matching the edits, not the raw draft", async ({
  page,
}) => {
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Studio Co");

  // Two-path entry: pick "Generate from a description".
  await page.goto(`/w/${workspaceId}/playbooks`);
  await page.getByTestId("new-playbook-trigger").click();
  await page.getByTestId("new-playbook-generate").click();
  await expect(page).toHaveURL(new RegExp(`/w/${workspaceId}/playbooks/new$`));

  // Describe the task and generate.
  await page
    .getByTestId("generate-input")
    .fill(
      "Every week my editor needs to take the finished podcast, put it on our host, and schedule it to go out.",
    );
  await page.getByTestId("generate-submit").click();

  // Draft appears, nothing saved yet.
  const review = page.getByTestId("draft-review");
  await expect(review).toBeVisible();
  await expect(page.getByTestId("draft-name")).toHaveValue(
    "Publish the weekly podcast episode",
  );
  await expect(page.getByTestId("draft-step-0")).toBeVisible();
  await expect(page.getByTestId("draft-step-2")).toBeVisible();

  // Edit the first step's title, then delete the last step (index 2).
  await page.getByTestId("draft-step-title-0").fill("Export the master audio");
  await page.getByTestId("draft-delete-2").click();
  await expect(page.getByTestId("draft-step-2")).toHaveCount(0);

  // Save — lands in the real editor for the persisted playbook.
  await page.getByTestId("draft-save").click();
  await expect(page).toHaveURL(
    new RegExp(`/w/${workspaceId}/playbooks/[0-9a-f-]+$`),
  );

  // The saved playbook reflects the edits: renamed first step present, deleted step gone.
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Publish the weekly podcast episode",
  );
  const steps = page.locator("[data-testid^='step-row-']");
  await expect(steps).toHaveCount(2);
  await expect(
    page.locator("[data-testid^='step-row-']").first(),
  ).toContainText("Export the master audio");
  await expect(page.getByText("Schedule the release")).toHaveCount(0);
});

test("a vague description returns a low-confidence draft instead of a fake process", async ({
  page,
}) => {
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Vague Co");

  await page.goto(`/w/${workspaceId}/playbooks/new`);
  await page
    .getByTestId("generate-input")
    .fill("just do the vague thing with the videos please");
  await page.getByTestId("generate-submit").click();

  await expect(page.getByTestId("draft-review")).toBeVisible();
  await expect(page.getByTestId("draft-low-confidence")).toBeVisible();
});

test("a generation failure shows a clear error and lets the founder retry — never hangs", async ({
  page,
}) => {
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Boom Co");

  await page.goto(`/w/${workspaceId}/playbooks/new`);
  await page
    .getByTestId("generate-input")
    .fill("this one should go boom and fail upstream");
  await page.getByTestId("generate-submit").click();

  // A visible error, and the button settles back to an actionable "Try again" — not a
  // stuck spinner and not a blank draft.
  await expect(page.getByTestId("generate-error")).toBeVisible();
  await expect(page.getByTestId("draft-review")).toHaveCount(0);
  await expect(page.getByTestId("generate-submit")).toBeEnabled();
  await expect(page.getByTestId("generate-submit")).toContainText("Try again");
});

test("the manual path still creates a playbook from the same entry point", async ({
  page,
}) => {
  await signInAs(page, testEmail("founder"));
  const workspaceId = await createWorkspace(page, "Manual Co");

  await page.goto(`/w/${workspaceId}/playbooks`);
  await page.getByTestId("new-playbook-trigger").click();
  await page.getByTestId("new-playbook-manual").click();
  await page.getByLabel("Name").fill("Hand-built playbook");
  await page.getByRole("button", { name: "Create playbook" }).click();

  await expect(page).toHaveURL(
    new RegExp(`/w/${workspaceId}/playbooks/[0-9a-f-]+$`),
  );
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Hand-built playbook",
  );
});
