/**
 * Unified scraper interface that delegates to configured provider (Jina or Firecrawl).
 * Default: Jina (free tier, simpler API)
 */

import * as jina from "./jina";
import * as firecrawl from "./firecrawl";

import type { ScrapeResult, ScrapeOptions } from "./jina";

// Re-export types for consumers
export type { ScrapeResult, ScrapeOptions };

type ScrapeProvider = "jina" | "firecrawl";

function getProvider(): ScrapeProvider {
  const provider = process.env.SCRAPE_PROVIDER?.toLowerCase();
  if (provider === "firecrawl") {
    return "firecrawl";
  }
  return "jina"; // Default to Jina
}

function getJinaApiKey(): string | undefined {
  return process.env.JINA_API_KEY;
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

  return jina.scrapeToMarkdown(url, { ...options, apiKey: getJinaApiKey() });
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

  return jina.scrapeBatch(urls, { ...options, apiKey: getJinaApiKey() });
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
