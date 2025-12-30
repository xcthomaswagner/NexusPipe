import { test, expect, Route } from "@playwright/test";
import fs from "fs";
import path from "path";

// Dynamic import for pdf-parse (CommonJS module)
async function parsePdf(buffer: Buffer): Promise<{ text: string; numpages: number }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  return pdfParse(buffer);
}

// Helper to create tRPC error response for route interception
function createTrpcErrorResponse(): string {
  return JSON.stringify([{
    error: {
      json: {
        message: "Forced error for testing client-side fallback",
        code: -32603,
        data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500, path: "audit.generateReport" },
      },
    },
  }]);
}

// Helper to intercept and fail the generateReport request
async function interceptGenerateReport(route: Route): Promise<void> {
  await route.fulfill({
    status: 200, // tRPC returns 200 with error in body
    contentType: "application/json",
    body: createTrpcErrorResponse(),
  });
}

/**
 * PDF Comparison tests.
 *
 * Verifies that client-side and server-side PDF generation produce
 * similar reports with the same key data.
 */

const TEST_RESULTS_DIR = path.join(__dirname, "..", "test-results", "pdf-comparison");

// Ensure test results directory exists
test.beforeAll(async () => {
  if (!fs.existsSync(TEST_RESULTS_DIR)) {
    fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
  }
});

test.describe("PDF Comparison - Server vs Client", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    if (page.url().includes("sign-in")) {
      test.skip(true, "Not authenticated - see auth.setup.ts for instructions");
    }
  });

  test("server-side PDF contains expected content", async ({ page }) => {
    test.slow(); // PDF generation takes time

    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();
    await expect(page.locator("h1")).toContainText("New England Biolabs", { timeout: 15000 });

    const exportButton = page.getByRole("button", { name: /Export PDF/i });
    await expect(exportButton).toBeVisible({ timeout: 10000 });

    // Set up download handler
    const downloadPromise = page.waitForEvent("download", { timeout: 120000 });
    await exportButton.click();

    const download = await downloadPromise;
    const filename = download.suggestedFilename();

    // Save the PDF
    const serverPdfPath = path.join(TEST_RESULTS_DIR, `server-${filename}`);
    await download.saveAs(serverPdfPath);

    // Parse and verify PDF content
    const pdfBuffer = fs.readFileSync(serverPdfPath);
    const pdfData = await parsePdf(pdfBuffer);

    // Verify key content is present (case-insensitive due to PDF text extraction)
    const text = pdfData.text.toUpperCase();
    expect(text).toContain("NEXUSPIPE");
    expect(text).toContain("NEW ENGLAND BIOLABS");
    expect(text).toContain("EXECUTIVE SUMMARY");
    expect(text).toContain("COMBINED");
    expect(text).toContain("VISIBILITY");
    expect(text).toContain("WEB VISIBILITY");
    expect(text).toContain("AI SHARE OF");
    expect(text).toContain("VOICE");
    expect(text).toContain("SOURCES");
    expect(text).toContain("ANALYZED");
    expect(text).toContain("CITATION GAPS");

    // Verify sentiment section
    expect(text).toContain("SENTIMENT");

    // Cleanup
    fs.unlinkSync(serverPdfPath);
  });

  test("client-side PDF contains expected content", async ({ page }) => {
    test.slow();

    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();
    await expect(page.locator("h1")).toContainText("New England Biolabs", { timeout: 15000 });

    // Wait for results data to load (needed for client-side PDF)
    await expect(page.getByText("Combined Visibility")).toBeVisible({ timeout: 15000 });

    // Force client-side generation by intercepting the server request
    await page.route("**/api/trpc/audit.generateReport**", interceptGenerateReport);

    const exportButton = page.getByRole("button", { name: /Export PDF/i });
    await expect(exportButton).toBeVisible({ timeout: 10000 });

    // Set up download handler before clicking
    const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
    await exportButton.click();

    // Should see fallback toast
    await expect(page.getByText(/Generating PDF locally/i)).toBeVisible({ timeout: 15000 });

    const download = await downloadPromise;
    const filename = download.suggestedFilename();

    // Save the PDF
    const clientPdfPath = path.join(TEST_RESULTS_DIR, `client-${filename}`);
    await download.saveAs(clientPdfPath);

    // Parse and verify PDF content
    const pdfBuffer = fs.readFileSync(clientPdfPath);
    const pdfData = await parsePdf(pdfBuffer);

    // Verify key content is present (case-insensitive due to PDF text extraction)
    const text = pdfData.text.toUpperCase();
    expect(text).toContain("NEXUSPIPE");
    expect(text).toContain("NEW ENGLAND BIOLABS");
    expect(text).toContain("EXECUTIVE SUMMARY");
    expect(text).toContain("COMBINED");
    expect(text).toContain("VISIBILITY");
    expect(text).toContain("WEB VISIBILITY");
    expect(text).toContain("AI SHARE OF");
    expect(text).toContain("VOICE");
    expect(text).toContain("SOURCES");
    expect(text).toContain("ANALYZED");
    expect(text).toContain("CITATION GAPS");

    // Verify sentiment section
    expect(text).toContain("SENTIMENT");

    // Cleanup
    fs.unlinkSync(clientPdfPath);
  });

  test("client PDF fallback shows correct toast messages", async ({ page }) => {
    test.slow();

    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();
    await expect(page.locator("h1")).toContainText("New England Biolabs", { timeout: 15000 });

    // Wait for results to load
    await expect(page.getByText("Combined Visibility")).toBeVisible({ timeout: 15000 });

    // Force client-side generation
    await page.route("**/api/trpc/audit.generateReport**", interceptGenerateReport);

    const exportButton = page.getByRole("button", { name: /Export PDF/i });

    // Set up download handler BEFORE clicking
    const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
    await exportButton.click();

    // Should show info toast about local generation
    await expect(page.getByText(/Generating PDF locally/i)).toBeVisible({ timeout: 15000 });

    // Wait for download to complete
    await downloadPromise;

    // Should show success toast
    await expect(page.getByText(/Report downloaded/i)).toBeVisible({ timeout: 10000 });
  });

  test("PDF file sizes are reasonable", async ({ page }) => {
    test.slow();

    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();
    await expect(page.locator("h1")).toContainText("New England Biolabs", { timeout: 15000 });

    // Wait for results to load
    await expect(page.getByText("Combined Visibility")).toBeVisible({ timeout: 15000 });

    // Generate client PDF (more reliable for this test)
    await page.route("**/api/trpc/audit.generateReport**", interceptGenerateReport);

    const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
    await page.getByRole("button", { name: /Export PDF/i }).click();

    const download = await downloadPromise;
    const pdfPath = path.join(TEST_RESULTS_DIR, "size-test.pdf");
    await download.saveAs(pdfPath);

    const stats = fs.statSync(pdfPath);

    // PDF should be reasonable size (between 1KB and 5MB)
    expect(stats.size).toBeGreaterThan(1024); // At least 1KB
    expect(stats.size).toBeLessThan(5 * 1024 * 1024); // Less than 5MB

    // Cleanup
    fs.unlinkSync(pdfPath);
  });

  test("PDF has correct number of pages", async ({ page }) => {
    test.slow();

    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();
    await expect(page.locator("h1")).toContainText("New England Biolabs", { timeout: 15000 });

    // Wait for results to load
    await expect(page.getByText("Combined Visibility")).toBeVisible({ timeout: 15000 });

    // Force client-side for reliability
    await page.route("**/api/trpc/audit.generateReport**", interceptGenerateReport);

    const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
    await page.getByRole("button", { name: /Export PDF/i }).click();

    const download = await downloadPromise;
    const pdfPath = path.join(TEST_RESULTS_DIR, "pages-test.pdf");
    await download.saveAs(pdfPath);

    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await parsePdf(pdfBuffer);

    // Client-side simple PDF should be 1 page
    // Server-side full PDF could be 2-3 pages
    expect(pdfData.numpages).toBeGreaterThanOrEqual(1);
    expect(pdfData.numpages).toBeLessThanOrEqual(5);

    // Cleanup
    fs.unlinkSync(pdfPath);
  });
});

test.describe("PDF Visual Structure", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    if (page.url().includes("sign-in")) {
      test.skip(true, "Not authenticated");
    }
  });

  test("client PDF has proper header section", async ({ page }) => {
    test.slow();

    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();
    await expect(page.locator("h1")).toContainText("New England Biolabs", { timeout: 15000 });
    await expect(page.getByText("Combined Visibility")).toBeVisible({ timeout: 15000 });

    await page.route("**/api/trpc/audit.generateReport**", interceptGenerateReport);

    const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
    await page.getByRole("button", { name: /Export PDF/i }).click();

    const download = await downloadPromise;
    const pdfPath = path.join(TEST_RESULTS_DIR, "header-test.pdf");
    await download.saveAs(pdfPath);

    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await parsePdf(pdfBuffer);

    // Check header content
    expect(pdfData.text).toContain("NexusPipe GEO Audit Report");
    expect(pdfData.text).toContain("New England Biolabs");

    // Should have a date
    expect(pdfData.text).toMatch(/\d{4}|January|February|March|April|May|June|July|August|September|October|November|December/);

    // Cleanup
    fs.unlinkSync(pdfPath);
  });

  test("client PDF has all metric sections", async ({ page }) => {
    test.slow();

    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();
    await expect(page.locator("h1")).toContainText("New England Biolabs", { timeout: 15000 });
    await expect(page.getByText("Combined Visibility")).toBeVisible({ timeout: 15000 });

    await page.route("**/api/trpc/audit.generateReport**", interceptGenerateReport);

    const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
    await page.getByRole("button", { name: /Export PDF/i }).click();

    const download = await downloadPromise;
    const pdfPath = path.join(TEST_RESULTS_DIR, "sections-test.pdf");
    await download.saveAs(pdfPath);

    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await parsePdf(pdfBuffer);

    // Check all required sections (case-insensitive)
    const text = pdfData.text.toUpperCase();
    expect(text).toContain("EXECUTIVE SUMMARY");
    expect(text).toContain("COMBINED VISIBILITY");
    expect(text).toContain("WEB VISIBILITY");
    expect(text).toContain("AI SHARE OF VOICE");
    expect(text).toContain("SOURCES ANALYZED");
    expect(text).toContain("CITATION GAPS");
    expect(text).toContain("SENTIMENT");
    expect(text).toContain("POSITIVE");
    expect(text).toContain("NEGATIVE");
    expect(text).toContain("NEUTRAL");
    expect(text).toContain("MIXED");

    // Cleanup
    fs.unlinkSync(pdfPath);
  });

  test("client PDF has footer with generation info", async ({ page }) => {
    test.slow();

    await page.goto("/dashboard");
    await page.getByText("New England Biolabs").click();
    await expect(page.locator("h1")).toContainText("New England Biolabs", { timeout: 15000 });
    await expect(page.getByText("Combined Visibility")).toBeVisible({ timeout: 15000 });

    await page.route("**/api/trpc/audit.generateReport**", interceptGenerateReport);

    const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
    await page.getByRole("button", { name: /Export PDF/i }).click();

    const download = await downloadPromise;
    const pdfPath = path.join(TEST_RESULTS_DIR, "footer-test.pdf");
    await download.saveAs(pdfPath);

    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await parsePdf(pdfBuffer);

    // Check footer content
    expect(pdfData.text).toContain("Generated by NexusPipe");

    // Cleanup
    fs.unlinkSync(pdfPath);
  });
});
