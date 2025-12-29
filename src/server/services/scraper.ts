/**
 * Unified scraper interface that delegates to configured provider (Jina or Firecrawl).
 * Default: Jina (free tier, simpler API)
 */

import * as jina from "./jina";
import * as firecrawl from "./firecrawl";
import { env } from "@/server/env";

import type { ScrapeResult, ScrapeOptions } from "./jina";

// Re-export types for consumers
export type { ScrapeResult, ScrapeOptions };

type ScrapeProvider = "jina" | "firecrawl";

// Cache the provider to avoid repeated env access and logging
let cachedProvider: ScrapeProvider | null = null;

function getProvider(): ScrapeProvider {
  if (cachedProvider === null) {
    cachedProvider = env.SCRAPE_PROVIDER;
    console.log("[Scraper] Using provider:", cachedProvider);
  }
  return cachedProvider;
}

/**
 * Scrapes a single URL and returns clean markdown content.
 * Uses the configured provider (SCRAPE_PROVIDER env var).
 */
export async function scrapeToMarkdown(
  url: string,
  options?: ScrapeOptions
): Promise<ScrapeResult> {
  const provider = getProvider();

  if (provider === "firecrawl") {
    return firecrawl.scrapeToMarkdown(url, options);
  }

  return jina.scrapeToMarkdown(url, { ...options, apiKey: env.JINA_API_KEY });
}

/**
 * Scrapes multiple URLs efficiently.
 * - Jina: Parallel individual requests (no batch API)
 * - Firecrawl: Batch API with fallback to parallel
 */
export async function scrapeBatch(
  urls: string[],
  options?: ScrapeOptions
): Promise<ScrapeResult[]> {
  const provider = getProvider();

  if (provider === "firecrawl") {
    return firecrawl.scrapeBatch(urls, options);
  }

  return jina.scrapeBatch(urls, { ...options, apiKey: env.JINA_API_KEY });
}

/**
 * Alias for scrapeBatch - used by pipeline processor.
 */
export async function scrapeForTick(
  urls: string[],
  options?: ScrapeOptions
): Promise<ScrapeResult[]> {
  return scrapeBatch(urls, options);
}

/**
 * Returns the currently configured scrape provider.
 */
export function getActiveProvider(): ScrapeProvider {
  return getProvider();
}
