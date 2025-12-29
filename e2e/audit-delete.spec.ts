import { test, expect } from "@playwright/test";

test.describe("Audit Deletion", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    if (page.url().includes("sign-in")) {
      test.skip(true, "Not authenticated - see auth.setup.ts for instructions");
    }
    await expect(page.getByText("GEO Audits")).toBeVisible({ timeout: 15000 });
  });

  test("deleted audit is removed from dashboard", async ({ page }) => {
    test.slow(); // Allow extra time for create + delete flow

    // Step 1: Create a new audit with unique name
    const uniqueBrand = `DeleteTest-${Date.now()}`;

    await page.goto("/audit/new");
    await expect(page.getByText("New GEO Audit")).toBeVisible({ timeout: 15000 });

    await page.getByPlaceholder("Your brand name").fill(uniqueBrand);
    await page.getByRole("button", { name: "Add Competitor" }).click();
    await page.getByRole("textbox", { name: /Competitor 1/i }).fill("Test Competitor");
    await page.getByPlaceholder(/B2B commerce/).fill("What are the best test solutions for deletion testing?");
    await page.getByText("Quick", { exact: true }).click();
    await page.getByRole("button", { name: "Start Audit" }).click();

    // Wait for redirect to audit page
    await expect(page).toHaveURL(/\/audit\/[a-z0-9]+/, { timeout: 60000 });

    // Capture the audit URL so we can navigate directly if needed
    const auditUrl = page.url();

    // Step 2: Verify audit exists on dashboard
    await page.goto("/dashboard");
    // Wait for dashboard to fully load
    await expect(page.getByText("GEO Audits")).toBeVisible({ timeout: 15000 });

    // The newly created audit should appear - if not visible, try reloading
    let brandVisible = await page.getByText(uniqueBrand).isVisible();
    if (!brandVisible) {
      await page.reload();
      await expect(page.getByText("GEO Audits")).toBeVisible({ timeout: 15000 });
    }
    await expect(page.getByText(uniqueBrand)).toBeVisible({ timeout: 15000 });

    // Step 3: Navigate to audit and delete it
    // Use the link selector to be more specific
    await page.locator(`a:has-text("${uniqueBrand}")`).first().click();
    await expect(page).toHaveURL(/\/audit\/[a-z0-9]+/);

    // Click the Delete button directly (no dropdown menu)
    await page.getByRole("button", { name: /delete/i }).first().click();

    // Confirm deletion in dialog
    await expect(page.getByText("Are you sure you want to delete")).toBeVisible();
    await page.getByRole("button", { name: "Delete" }).last().click();

    // Step 4: Verify redirect to dashboard and audit is gone
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });

    // Audit should no longer appear
    await expect(page.getByText(uniqueBrand)).not.toBeVisible({ timeout: 5000 });
  });

  test("delete dialog can be cancelled", async ({ page }) => {
    // Navigate to an existing audit (if any)
    // Exclude /audit/new by using a more specific selector
    const auditCards = page.locator("a[href^='/audit/']:not([href='/audit/new'])");
    const count = await auditCards.count();

    if (count === 0) {
      test.skip(true, "No existing audits to test cancel flow");
    }

    // Click first audit
    await auditCards.first().click();
    await expect(page).toHaveURL(/\/audit\/[a-z0-9]+/);

    // Wait for page to load
    const brandName = await page.locator("h1").first().textContent();
    await expect(page.locator("h1")).toContainText(brandName || "", { timeout: 15000 });

    // Click the Delete button directly (no dropdown menu)
    await page.getByRole("button", { name: /delete/i }).first().click();

    // Cancel the dialog
    await expect(page.getByText("Are you sure you want to delete")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    // Dialog should close, still on same audit page
    await expect(page.getByText("Are you sure you want to delete")).not.toBeVisible();
    await expect(page).toHaveURL(/\/audit\/[a-z0-9]+/);
    await expect(page.locator("h1").first()).toContainText(brandName || "");
  });
});
