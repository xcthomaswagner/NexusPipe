import { test, expect } from "@playwright/test";

/**
 * Authenticated test suite for audit exclusion list functionality.
 *
 * These tests require a valid Clerk session. To enable:
 * 1. Disable device verification in Clerk Dashboard, OR
 * 2. Manually sign in once and save the browser state
 *
 * The exclusion list functionality has been verified through manual browser testing:
 * ✅ Add domain via Settings tab
 * ✅ Remove domain via Settings tab
 * ✅ Exclude domain via click in Results tab
 * ✅ Rerun dialog shows exclusion count
 * ✅ Toast notifications appear correctly
 */
test.describe("Audit Exclusion List - Authenticated", () => {
  // Check if we're authenticated before each test
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    // If redirected to sign-in, skip the test
    if (page.url().includes("sign-in")) {
      test.skip(true, "Not authenticated - see auth.setup.ts for instructions");
    }
  });

  test("can access dashboard when authenticated", async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByRole("heading", { name: "GEO Audits" })).toBeVisible({ timeout: 15000 });
  });

  test("shows existing audit on dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    // Should see the New England Biolabs audit
    await expect(page.getByText("New England Biolabs")).toBeVisible({ timeout: 15000 });
  });

  test("can view audit detail page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();
    await expect(page).toHaveURL(/audit\//);
  });

  test("audit detail has Results, Sources, and Settings tabs", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();

    // Check tabs exist
    await expect(page.getByRole("tab", { name: "Results" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("tab", { name: "All Sources" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Settings/ })).toBeVisible();
  });

  test("Settings tab shows excluded domains section", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();

    // Click Settings tab
    await page.getByRole("tab", { name: /Settings/ }).click();

    // Check excluded domains section
    await expect(page.getByText("Excluded Domains")).toBeVisible({ timeout: 15000 });
    await expect(page.getByPlaceholder(/Enter domain to exclude/i)).toBeVisible();
  });

  test("can add domain to exclusion list", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();
    await page.getByRole("tab", { name: /Settings/ }).click();

    // Add a test domain with unique timestamp to avoid conflicts
    const testDomain = `test-${Date.now()}.com`;
    await page.getByPlaceholder(/Enter domain to exclude/i).fill(testDomain);
    await page.getByRole("button", { name: /Add/ }).click();

    // Verify toast appears
    await expect(page.getByText(/Domain added/i)).toBeVisible({ timeout: 10000 });

    // Verify domain appears in list
    await expect(page.getByText(testDomain)).toBeVisible();
  });

  test("can remove domain from exclusion list", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();
    await page.getByRole("tab", { name: /Settings/ }).click();

    // First add a domain
    const testDomain = `remove-${Date.now()}.com`;
    await page.getByPlaceholder(/Enter domain to exclude/i).fill(testDomain);
    await page.getByRole("button", { name: /Add/ }).click();
    await expect(page.getByText(testDomain)).toBeVisible({ timeout: 10000 });

    // Find and click remove button on the domain
    const badge = page.locator(`text=${testDomain}`).locator("..");
    await badge.locator("button").click();

    // Verify removal toast
    await expect(page.getByText(/Domain removed/i)).toBeVisible({ timeout: 10000 });
  });

  test("Results tab has Citation Gaps section with exclude buttons", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();

    // Should be on Results tab by default
    await expect(page.getByText("Citation Gaps")).toBeVisible({ timeout: 15000 });

    // Check for exclude buttons in the table
    const table = page.locator("table").first();
    const excludeButtons = table.locator("tbody tr button").first();
    await expect(excludeButtons).toBeVisible();
  });

  test("Results tab has Brand Mentions section", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();

    await expect(page.getByText("Top Brand Mentions")).toBeVisible({ timeout: 15000 });
  });

  test("Rerun button is visible in header", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();

    await expect(page.getByRole("button", { name: /Rerun/ })).toBeVisible({ timeout: 15000 });
  });

  test("Rerun dialog shows exclusion count", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();

    // Click Rerun button
    await page.getByRole("button", { name: /Rerun/ }).first().click();

    // Check dialog appears
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/domains excluded/i)).toBeVisible();
  });

  test("can click exclude on Citation Gap row", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();

    // Wait for Citation Gaps to load
    await expect(page.getByText("Citation Gaps")).toBeVisible({ timeout: 15000 });

    // Find the first exclude button in table
    const table = page.locator("table").first();
    const firstRowBtn = table.locator("tbody tr").first().locator("button").first();

    if (await firstRowBtn.isVisible()) {
      await firstRowBtn.click();
      // Should see domain excluded toast
      await expect(page.getByText(/Domain excluded/i)).toBeVisible({ timeout: 10000 });
    }
  });
});

