import { test, expect } from "@playwright/test";

test.describe("Public routes", () => {
  test("homepage has title and loads correctly", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/NexusPipe/);
  });

  test("homepage contains main content", async ({ page }) => {
    await page.goto("/");
    // Check that the page has rendered content
    await expect(page.locator("body")).toBeVisible();
  });
});
