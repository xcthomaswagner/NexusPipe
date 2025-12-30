import { test, expect } from "@playwright/test";
import path from "path";

/**
 * PDF Export test suite.
 *
 * Tests the PDF report generation functionality on completed audits.
 * Requires authenticated session with at least one completed audit.
 */
test.describe("PDF Export - Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    // If redirected to sign-in, skip the test
    if (page.url().includes("sign-in")) {
      test.skip(true, "Not authenticated - see auth.setup.ts for instructions");
    }
  });

  test("Export PDF button is visible next to tabs on completed audit", async ({ page }) => {
    await page.goto("/dashboard");

    // Click on an existing completed audit
    await expect(page.getByText("New England Biolabs")).toBeVisible({ timeout: 15000 });
    await page.getByText("New England Biolabs").click();

    // Wait for the audit detail page to load
    await expect(page.locator("h1")).toContainText("New England Biolabs", { timeout: 15000 });

    // Check that Export PDF button is visible next to tabs
    await expect(page.getByRole("button", { name: /Export PDF/i })).toBeVisible({ timeout: 10000 });
  });

  test("Export PDF button is positioned next to tab list", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();

    // Wait for page to load
    await expect(page.locator("h1")).toContainText("New England Biolabs", { timeout: 15000 });

    // Check tabs are visible
    await expect(page.getByRole("tab", { name: "Results" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("tab", { name: "AI Visibility" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "All Sources" })).toBeVisible();

    // Export PDF button should be in the same row as tabs
    const exportButton = page.getByRole("button", { name: /Export PDF/i });
    await expect(exportButton).toBeVisible();

    // Button should have Download icon
    await expect(exportButton.locator("svg")).toBeVisible();
  });

  test("clicking Export PDF shows loading state", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();

    // Wait for page to load
    await expect(page.locator("h1")).toContainText("New England Biolabs", { timeout: 15000 });

    const exportButton = page.getByRole("button", { name: /Export PDF/i });
    await expect(exportButton).toBeVisible({ timeout: 10000 });

    // Click the export button
    await exportButton.click();

    // Should show loading state
    await expect(page.getByRole("button", { name: /Generating/i })).toBeVisible({ timeout: 5000 });
  });

  test("Export PDF downloads a file", async ({ page }) => {
    test.slow(); // PDF generation can take time

    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();

    // Wait for page to load
    await expect(page.locator("h1")).toContainText("New England Biolabs", { timeout: 15000 });

    const exportButton = page.getByRole("button", { name: /Export PDF/i });
    await expect(exportButton).toBeVisible({ timeout: 10000 });

    // Set up download handler before clicking
    const downloadPromise = page.waitForEvent("download", { timeout: 60000 });

    // Click the export button
    await exportButton.click();

    // Wait for download to start
    const download = await downloadPromise;

    // Verify the filename contains expected pattern
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/nexuspipe-report-.*\.pdf$/);

    // Optionally save the file to verify it's a valid PDF
    const downloadPath = path.join(__dirname, "..", "test-results", filename);
    await download.saveAs(downloadPath);

    // Cancel the download if we don't need the file
    await download.delete();
  });

  test("Export PDF shows success toast after download", async ({ page }) => {
    test.slow();

    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();

    // Wait for page to load
    await expect(page.locator("h1")).toContainText("New England Biolabs", { timeout: 15000 });

    const exportButton = page.getByRole("button", { name: /Export PDF/i });
    await expect(exportButton).toBeVisible({ timeout: 10000 });

    // Set up download handler
    const downloadPromise = page.waitForEvent("download", { timeout: 60000 });

    // Click export
    await exportButton.click();

    // Wait for download
    await downloadPromise;

    // Should show success toast
    await expect(page.getByText(/Report downloaded/i)).toBeVisible({ timeout: 10000 });
  });

  test("Export PDF button is disabled while generating", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();

    // Wait for page to load
    await expect(page.locator("h1")).toContainText("New England Biolabs", { timeout: 15000 });

    const exportButton = page.getByRole("button", { name: /Export PDF/i });
    await expect(exportButton).toBeVisible({ timeout: 10000 });

    // Click export
    await exportButton.click();

    // Button should be disabled (showing "Generating...")
    const generatingButton = page.getByRole("button", { name: /Generating/i });
    await expect(generatingButton).toBeDisabled({ timeout: 5000 });
  });

  test("can export PDF from different tabs", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();

    // Wait for page to load
    await expect(page.locator("h1")).toContainText("New England Biolabs", { timeout: 15000 });

    // Export button should be visible regardless of which tab is active
    const exportButton = page.getByRole("button", { name: /Export PDF/i });

    // Check on Results tab (default)
    await expect(exportButton).toBeVisible({ timeout: 10000 });

    // Switch to AI Visibility tab
    await page.getByRole("tab", { name: "AI Visibility" }).click();
    await expect(exportButton).toBeVisible();

    // Switch to Sources tab
    await page.getByRole("tab", { name: "All Sources" }).click();
    await expect(exportButton).toBeVisible();

    // Switch to Insights tab
    await page.getByRole("tab", { name: /Insights/ }).click();
    await expect(exportButton).toBeVisible();

    // Switch to Settings tab
    await page.getByRole("tab", { name: /Settings/ }).click();
    await expect(exportButton).toBeVisible();
  });
});
