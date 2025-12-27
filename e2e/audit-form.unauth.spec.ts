import { test, expect } from "@playwright/test";

/**
 * Unauthenticated tests - these run WITHOUT auth state
 * to verify protected routes redirect to sign-in.
 */

test.describe("Protected Routes - Unauthenticated", () => {
  test("dashboard redirects to sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/sign-in/, { timeout: 10000 });
  });

  test("audit new page redirects to sign-in", async ({ page }) => {
    await page.goto("/audit/new");
    await expect(page).toHaveURL(/sign-in/, { timeout: 10000 });
  });

  test("audit detail page redirects to sign-in", async ({ page }) => {
    await page.goto("/audit/test-id");
    await expect(page).toHaveURL(/sign-in/, { timeout: 10000 });
  });
});

test.describe("Public Routes - Unauthenticated", () => {
  test("homepage loads correctly", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/NexusPipe/);
  });

  test("sign-in page renders", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.locator("body")).toBeVisible();
  });
});
