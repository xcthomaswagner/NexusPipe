import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // External APIs
  EXA_API_KEY: z.string().min(1, "EXA_API_KEY is required"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),

  // Scraping provider: "jina" (default) or "firecrawl"
  SCRAPE_PROVIDER: z.enum(["jina", "firecrawl"]).optional().default("jina"),
  JINA_API_KEY: z.string().optional(), // Optional - free tier works without it
  FIRECRAWL_API_KEY: z.string().optional(), // Required if SCRAPE_PROVIDER=firecrawl

  // AI Platform APIs (optional - enable specific platforms)
  ANTHROPIC_API_KEY: z.string().optional(), // For Claude
  PERPLEXITY_API_KEY: z.string().optional(), // For Perplexity
  GOOGLE_AI_API_KEY: z.string().optional(), // For Gemini

  // Clerk (optional - handled by Clerk SDK)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "Invalid environment variables:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

export const env = validateEnv();
