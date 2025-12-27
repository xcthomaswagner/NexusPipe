import { test as setup } from "@playwright/test";
import path from "path";
import fs from "fs";

const authFile = path.join(__dirname, ".auth/user.json");

/**
 * Authentication setup for e2e tests.
 *
 * Clerk's device verification cannot be disabled via dashboard for existing users.
 * To run authenticated tests, manually sign in once:
 *
 * 1. Run: pnpm test:e2e --ui
 * 2. Sign in manually in the browser
 * 3. The auth state will be saved for subsequent test runs
 *
 * Or run tests without auth (they'll be skipped):
 * pnpm test:e2e
 */
setup("authenticate", async () => {
  // Check if auth file already exists from manual sign-in
  if (fs.existsSync(authFile)) {
    const stats = fs.statSync(authFile);
    const fileContent = fs.readFileSync(authFile, 'utf-8');
    const authState = JSON.parse(fileContent);

    // Check if it has real cookies (not empty)
    if (authState.cookies && authState.cookies.length > 0) {
      console.log("✅ Using existing auth state from manual sign-in");
      return;
    }
  }

  // Create empty auth state - authenticated tests will be skipped
  const emptyState = { cookies: [], origins: [] };
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  fs.writeFileSync(authFile, JSON.stringify(emptyState));
  console.log("⚠️  No auth state. Run 'pnpm test:e2e --ui' to sign in manually.");
});
