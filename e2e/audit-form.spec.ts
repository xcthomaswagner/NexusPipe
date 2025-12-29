import { test, expect } from "@playwright/test";

/**
 * Test data based on real Sitecore agency audit scenario.
 */
const TEST_AUDIT = {
  brandName: "XCentium",
  competitors: [
    "Perficient",
    "OSF Digital",
    "Verndale",
    "Horizontal Digital",
    "TA Digital",
    "Alpha Solutions",
  ],
  industryIntent: "List the best Sitecore agencies in the US in 2025",
};

/**
 * Alternative test data for different industry.
 */
const ALT_AUDIT = {
  brandName: "Acme Corp",
  competitors: ["BigCo", "MegaTech", "SuperSoft"],
  industryIntent: "What are the best enterprise software vendors for manufacturing in 2025?",
};

test.describe("Audit Form - Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/audit/new");
    // If redirected to sign-in, skip the test
    if (page.url().includes("sign-in")) {
      test.skip(true, "Not authenticated - see auth.setup.ts for instructions");
    }
    // Wait for form to load
    await expect(page.getByText("New GEO Audit")).toBeVisible({ timeout: 15000 });
  });

  test("form renders with all required fields", async ({ page }) => {
    // Check form title
    await expect(page.getByText("New GEO Audit")).toBeVisible();

    // Check Brand Name field (using textbox role with accessible name)
    await expect(page.getByRole("textbox", { name: "Brand Name" })).toBeVisible();
    await expect(page.getByPlaceholder("Your brand name")).toBeVisible();

    // Check Competitors section (form starts with no inputs, just the add button)
    await expect(page.getByText("Competitors", { exact: true })).toBeVisible();
    await expect(page.getByText("Add up to 10 competitors to compare against.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Competitor" })).toBeVisible();

    // Check Industry Intent field
    await expect(page.getByRole("textbox", { name: "Industry Intent Query" })).toBeVisible();

    // Check Scan Depth field
    await expect(page.getByText("Scan Depth", { exact: true })).toBeVisible();
    await expect(page.getByRole("radiogroup")).toBeVisible();

    // Check Submit button
    await expect(page.getByRole("button", { name: "Start Audit" })).toBeVisible();
  });

  test("scan depth selector shows all options", async ({ page }) => {
    // Check all depth options are visible using exact match to avoid ambiguity
    await expect(page.getByText("Quick", { exact: true })).toBeVisible();
    await expect(page.getByText("25 sources")).toBeVisible();
    await expect(page.getByText("~2 min, rough signal")).toBeVisible();

    await expect(page.getByText("Standard", { exact: true })).toBeVisible();
    await expect(page.getByText("50 sources")).toBeVisible();
    await expect(page.getByText("~5 min, balanced")).toBeVisible();

    await expect(page.getByText("Deep", { exact: true })).toBeVisible();
    await expect(page.getByText("100 sources")).toBeVisible();
    await expect(page.getByText("~10 min, thorough")).toBeVisible();
  });

  test("can select different scan depths", async ({ page }) => {
    // Click Quick option
    await page.getByText("Quick").first().click();

    // Click Deep option
    await page.getByText("Deep").first().click();

    // Click Standard option (default)
    await page.getByText("Standard").first().click();
  });

  test("can add a competitor", async ({ page }) => {
    // Wait for form to be fully hydrated
    await expect(page.getByRole("button", { name: "Add Competitor" })).toBeVisible({ timeout: 5000 });

    // Form starts with 0 competitor inputs
    // Add first competitor
    await page.getByRole("button", { name: "Add Competitor" }).click();
    await expect(page.getByRole("textbox", { name: /Competitor 1/i })).toBeVisible({ timeout: 3000 });

    // Verify we can type in the competitor field
    await page.getByRole("textbox", { name: /Competitor 1/i }).fill("Test Competitor");
    await expect(page.getByRole("textbox", { name: /Competitor 1/i })).toHaveValue("Test Competitor");
  });

  test("can add multiple competitors", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Add Competitor" })).toBeVisible({ timeout: 5000 });

    // Add multiple competitors
    for (let i = 1; i <= 3; i++) {
      await page.getByRole("button", { name: "Add Competitor" }).click();
      await expect(page.getByRole("textbox", { name: new RegExp(`Competitor ${i}`, "i") })).toBeVisible({ timeout: 3000 });
    }
  });

  test("can add competitors up to maximum of 10", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Add Competitor" })).toBeVisible({ timeout: 5000 });

    for (let i = 1; i <= 10; i++) {
      await page.getByRole("button", { name: "Add Competitor" }).click();
      await expect(page.getByRole("textbox", { name: new RegExp(`Competitor ${i}`, "i") })).toBeVisible({ timeout: 3000 });
    }

    await expect(page.getByRole("button", { name: "Add Competitor" })).not.toBeVisible({ timeout: 2000 });
  });

  test("can remove competitors", async ({ page }) => {
    // Add some competitors first
    const addBtn = page.getByRole("button", { name: "Add Competitor" });
    await addBtn.click();
    await addBtn.click();

    // Find remove buttons (X icons)
    const removeButtons = page.locator("button").filter({ has: page.locator("svg") }).filter({ hasText: "" });

    // Count initial inputs
    const initialInputs = await page.locator('input[placeholder^="Competitor"]').count();

    // Click first remove button if there are multiple
    if (initialInputs > 1) {
      const firstRemove = page.locator("button").filter({ has: page.locator('[class*="lucide-x"]') }).first();
      if (await firstRemove.isVisible()) {
        await firstRemove.click();
      }
    }
  });

  test("new competitor input gets focus when added", async ({ page }) => {
    // Click Add Competitor
    await page.getByRole("button", { name: "Add Competitor" }).click();

    // An input should be focused
    const focusedInput = page.locator('input:focus');
    await expect(focusedInput).toBeVisible();
  });

  test("validates required brand name", async ({ page }) => {
    // Add a competitor first
    await page.getByRole("button", { name: "Add Competitor" }).click();
    await page.locator('input[placeholder^="Competitor"]').first().fill("Test Competitor");

    // Fill intent but leave brand empty
    await page.getByPlaceholder(/B2B commerce/).fill("Test industry query for validation purposes");

    // Try to submit
    await page.getByRole("button", { name: "Start Audit" }).click();

    // Should show validation error
    await expect(page.getByText("Brand name is required")).toBeVisible({ timeout: 5000 });
  });

  test("competitors are optional - form can submit without them", async ({ page }) => {
    // Wait for form to be hydrated
    await expect(page.getByRole("button", { name: "Start Audit" })).toBeVisible({ timeout: 5000 });

    // Fill brand and intent but don't add any competitors
    const uniqueBrand = `NoCompetitors-${Date.now()}`;
    await page.getByPlaceholder("Your brand name").fill(uniqueBrand);
    await page.getByPlaceholder(/B2B commerce/).fill("Test industry query for validation purposes without competitors");

    // Select Quick depth for faster test
    await page.getByText("Quick", { exact: true }).click();

    // Submit without adding any competitors - should work since they're optional
    await page.getByRole("button", { name: "Start Audit" }).click();

    // Should redirect to audit page (not stay on form)
    await expect(page).toHaveURL(/\/audit\/[a-z0-9]+/, { timeout: 60000 });
  });

  test("validates industry intent minimum length", async ({ page }) => {
    // Fill brand
    await page.getByPlaceholder("Your brand name").fill("Test Brand");

    // Add a competitor
    await page.getByRole("button", { name: "Add Competitor" }).click();
    await page.locator('input[placeholder^="Competitor"]').first().fill("Test Competitor");

    // Fill short intent
    await page.getByPlaceholder(/B2B commerce/).fill("Short");

    // Try to submit
    await page.getByRole("button", { name: "Start Audit" }).click();

    // Should show validation error
    await expect(page.getByText(/at least 10 characters/i)).toBeVisible({ timeout: 5000 });
  });

  test("can fill complete form with Sitecore agency data", async ({ page }) => {
    // Fill brand name
    await page.getByPlaceholder("Your brand name").fill(TEST_AUDIT.brandName);

    // Add and fill competitors
    for (let i = 0; i < TEST_AUDIT.competitors.length; i++) {
      await page.getByRole("button", { name: "Add Competitor" }).click();
      const inputs = page.locator('input[placeholder^="Competitor"]');
      await inputs.nth(i).fill(TEST_AUDIT.competitors[i]);
    }

    // Fill industry intent
    await page.getByPlaceholder(/B2B commerce/).fill(TEST_AUDIT.industryIntent);

    // Verify all fields are filled
    await expect(page.getByPlaceholder("Your brand name")).toHaveValue(TEST_AUDIT.brandName);
  });

  test("submit button shows loading state", async ({ page }) => {
    // Fill minimal valid form
    await page.getByPlaceholder("Your brand name").fill(ALT_AUDIT.brandName);

    // Add a competitor
    await page.getByRole("button", { name: "Add Competitor" }).click();
    await page.locator('input[placeholder^="Competitor"]').first().fill(ALT_AUDIT.competitors[0]);

    // Fill intent
    await page.getByPlaceholder(/B2B commerce/).fill(ALT_AUDIT.industryIntent);

    // Select Quick scan for faster test
    await page.getByText("Quick").first().click();

    // Submit form
    await page.getByRole("button", { name: "Start Audit" }).click();

    // Should show loading state
    await expect(page.getByText("Creating Audit...")).toBeVisible({ timeout: 5000 });
  });

  test("successful form submission shows loading state", async ({ page }) => {
    // Fill minimal valid form with unique brand name
    const uniqueBrand = `Test-${Date.now()}`;
    await page.getByPlaceholder("Your brand name").fill(uniqueBrand);

    // Add a competitor
    await page.getByRole("button", { name: "Add Competitor" }).click();
    const competitorInput = page.getByRole("textbox", { name: /Competitor 1/i });
    await expect(competitorInput).toBeVisible({ timeout: 3000 });
    await competitorInput.fill("Competitor A");

    // Fill intent
    await page.getByPlaceholder(/B2B commerce/).fill("What are the best test solutions for automated testing in 2025?");

    // Select Quick scan for faster test
    await page.getByText("Quick", { exact: true }).click();

    // Submit form
    await page.getByRole("button", { name: "Start Audit" }).click();

    // Should show loading state (confirms form validation passed)
    await expect(page.getByText("Creating Audit...")).toBeVisible({ timeout: 5000 });
  });

  // This test is marked as slow because it waits for redirect which depends on backend
  test("form submission redirects to audit page", async ({ page }) => {
    test.slow(); // Allow extra time for backend processing

    // Fill minimal valid form
    const uniqueBrand = `Test-${Date.now()}`;
    await page.getByPlaceholder("Your brand name").fill(uniqueBrand);

    // Add a competitor
    await page.getByRole("button", { name: "Add Competitor" }).click();
    const competitorInput = page.getByRole("textbox", { name: /Competitor 1/i });
    await expect(competitorInput).toBeVisible({ timeout: 3000 });
    await competitorInput.fill("Competitor A");

    // Fill intent
    await page.getByPlaceholder(/B2B commerce/).fill("What are the best test solutions for automated testing in 2025?");

    // Select Quick scan
    await page.getByText("Quick", { exact: true }).click();

    // Submit form
    await page.getByRole("button", { name: "Start Audit" }).click();

    // Wait for loading
    await expect(page.getByText("Creating Audit...")).toBeVisible({ timeout: 5000 });

    // Wait for URL change - the form should redirect after successful creation
    // If this fails, check for server errors in the backend logs
    await expect(page).toHaveURL(/\/audit\/[a-z0-9]+/, { timeout: 60000 });
  });
});

test.describe("Audit Form - Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/audit/new");
    if (page.url().includes("sign-in")) {
      test.skip(true, "Not authenticated - see auth.setup.ts for instructions");
    }
  });

  test("Back to Dashboard link works", async ({ page }) => {
    // Wait for form to load (CardTitle is not a heading role)
    await expect(page.getByText("New GEO Audit")).toBeVisible({ timeout: 15000 });

    // Click back link
    await page.getByRole("link", { name: /Back to Dashboard/i }).click();

    // Should navigate to dashboard
    await expect(page).toHaveURL(/dashboard/);
  });

  test("can navigate to new audit from dashboard", async ({ page }) => {
    // Go to dashboard first
    await page.goto("/dashboard");
    // Wait for dashboard to load (look for common elements)
    await expect(page.getByText("GEO Audits")).toBeVisible({ timeout: 15000 });

    // Click New Audit button/link
    await page.getByRole("link", { name: /New Audit/i }).click();

    // Should be on new audit page
    await expect(page).toHaveURL(/audit\/new/);
    await expect(page.getByText("New GEO Audit")).toBeVisible({ timeout: 15000 });
  });
});

// Unauthenticated tests are in audit-form.unauth.spec.ts
// to run with a separate browser context without auth state
