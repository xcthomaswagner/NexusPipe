import { clerkSetup } from "@clerk/testing/playwright";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

export default async function globalSetup() {
  // Initialize Clerk testing mode for Playwright
  // This enables the __clerk_testing_token cookie to bypass 2FA
  await clerkSetup();
  console.log("✅ Clerk testing mode enabled");
}
