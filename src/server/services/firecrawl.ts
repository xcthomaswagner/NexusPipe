import Firecrawl from "@mendable/firecrawl-js";

import { getCached, setCache } from "@/server/services/url-cache";

// Lazy initialization - only create client when needed
let firecrawlClient: Firecrawl | null = null;

function getFirecrawl(): Firecrawl {
  if (!firecrawlClient) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY is required when using Firecrawl provider");
    }
    firecrawlClient = new Firecrawl({ apiKey });
  }
  return firecrawlClient;
}

const SCRAPE_TIMEOUT_MS = 30000; // 30 seconds max per URL
const BATCH_TIMEOUT_MS = 120000; // 2 minutes max for entire batch
const BATCH_POLL_INTERVAL_MS = 2000; // Poll every 2 seconds for batch status
const PARALLEL_CONCURRENCY = 3; // Reduced concurrency to avoid rate limits
const RATE_LIMIT_DELAY_MS = 2000; // Delay between retries on rate limit

export interface ScrapeResult {
  url: string;
  success: boolean;
  markdown?: string;
  error?: string;
  fromCache?: boolean;
}

export interface ScrapeOptions {
  skipCache?: boolean;
  ttlDays?: number;
}

/**
 * Scrapes a single URL and returns clean markdown content.
 * Uses cache to avoid redundant scraping across audits.
 */
export async function scrapeToMarkdown(
  url: string,
  options?: ScrapeOptions
): Promise<ScrapeResult> {
  // 1. Check cache first (unless skipCache)
  if (!options?.skipCache) {
    const cached = await getCached(url, options?.ttlDays);
    if (cached.hit) {
      return {
        url,
        success: !cached.error,
        markdown: cached.markdown,
        error: cached.error,
        fromCache: true,
      };
    }
  }

  // 2. Scrape with timeout
  try {
    const scrapePromise = getFirecrawl().scrape(url, {
      formats: ["markdown"],
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Scrape timeout (30s)")), SCRAPE_TIMEOUT_MS);
    });

    const doc = await Promise.race([scrapePromise, timeoutPromise]);

    const result: ScrapeResult = {
      url,
      success: true,
      markdown: doc.markdown ?? "",
      fromCache: false,
    };

    // 3. Store in cache
    await setCache(url, {
      url,
      success: true,
      markdown: result.markdown,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const result: ScrapeResult = {
      url,
      success: false,
      error: errorMessage,
      fromCache: false,
    };

    // Cache failures too (to avoid retrying immediately)
    await setCache(url, {
      url,
      success: false,
      error: errorMessage,
    });

    return result;
  }
}

/**
 * Helper to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Scrapes multiple URLs in parallel with concurrency limit.
 * Used as a fallback when batch API fails or times out.
 * Includes delays between chunks to respect rate limits.
 */
async function scrapeParallel(
  urls: string[],
  options?: ScrapeOptions
): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];

  // Process in chunks to limit concurrency
  for (let i = 0; i < urls.length; i += PARALLEL_CONCURRENCY) {
    const chunk = urls.slice(i, i + PARALLEL_CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map((url) => scrapeToMarkdown(url, options))
    );
    results.push(...chunkResults);

    // Add delay between chunks to avoid hitting rate limits
    if (i + PARALLEL_CONCURRENCY < urls.length) {
      await delay(RATE_LIMIT_DELAY_MS);
    }
  }

  return results;
}

/**
 * Wraps a promise with a timeout.
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]);
}

/**
 * Scrapes multiple URLs using Firecrawl's batch endpoint.
 * Falls back to parallel individual scrapes if batch fails or times out.
 */
export async function scrapeBatchWithApi(
  urls: string[],
  options?: ScrapeOptions
): Promise<ScrapeResult[]> {
  if (urls.length === 0) {
    return [];
  }

  // 1. Check cache for all URLs first
  const results: Map<string, ScrapeResult> = new Map();
  const urlsToScrape: string[] = [];

  if (!options?.skipCache) {
    await Promise.all(
      urls.map(async (url) => {
        const cached = await getCached(url, options?.ttlDays);
        if (cached.hit) {
          results.set(url, {
            url,
            success: !cached.error,
            markdown: cached.markdown,
            error: cached.error,
            fromCache: true,
          });
        } else {
          urlsToScrape.push(url);
        }
      })
    );
  } else {
    urlsToScrape.push(...urls);
  }

  // 2. If all URLs were cached, return early
  if (urlsToScrape.length === 0) {
    return urls.map((url) => results.get(url)!);
  }

  // 3. Try batch endpoint with timeout, fall back to parallel scrapes
  let batchSucceeded = false;

  try {
    const batchPromise = getFirecrawl().batchScrape(urlsToScrape, {
      options: { formats: ["markdown"] },
      pollInterval: BATCH_POLL_INTERVAL_MS,
      ignoreInvalidURLs: true,
    });

    const batchJob = await withTimeout(
      batchPromise,
      BATCH_TIMEOUT_MS,
      `Batch scrape timeout after ${BATCH_TIMEOUT_MS / 1000}s`
    );

    if (batchJob.status === "failed" || batchJob.status === "cancelled") {
      // Batch failed - will fall back to parallel scrapes
      console.warn(`Batch scrape ${batchJob.status}, falling back to parallel scrapes`);
    } else {
      // Process successful batch results
      batchSucceeded = true;
      const scrapedUrls = new Set<string>();

      for (const doc of batchJob.data) {
        const docUrl = doc.metadata?.sourceURL || doc.metadata?.url;
        if (!docUrl) continue;

        scrapedUrls.add(docUrl);
        const scrapeResult: ScrapeResult = {
          url: docUrl,
          success: true,
          markdown: doc.markdown ?? "",
          fromCache: false,
        };
        results.set(docUrl, scrapeResult);

        // Cache the result
        await setCache(docUrl, {
          url: docUrl,
          success: true,
          markdown: doc.markdown ?? "",
        });
      }

      // Handle URLs that weren't in the response (failed or invalid)
      for (const url of urlsToScrape) {
        if (!scrapedUrls.has(url)) {
          const errorResult: ScrapeResult = {
            url,
            success: false,
            error: "URL not in batch response",
            fromCache: false,
          };
          results.set(url, errorResult);
          await setCache(url, { url, success: false, error: "URL not in batch response" });
        }
      }
    }
  } catch (error) {
    // Batch failed or timed out - log and fall back
    const errorMessage = error instanceof Error ? error.message : "Batch request failed";
    console.warn(`Batch scrape failed: ${errorMessage}, falling back to parallel scrapes`);

    // If rate limited, parse the wait time and delay before fallback
    const rateLimitMatch = errorMessage.match(/retry after (\d+)s/i);
    if (rateLimitMatch) {
      const waitSeconds = parseInt(rateLimitMatch[1], 10);
      if (waitSeconds > 0 && waitSeconds <= 120) {
        console.log(`[Scraper] Rate limited, waiting ${waitSeconds}s before retry...`);
        await delay(waitSeconds * 1000);
      }
    }
  }

  // 4. Fall back to parallel individual scrapes if batch didn't succeed
  if (!batchSucceeded) {
    const remainingUrls = urlsToScrape.filter((url) => !results.has(url));
    if (remainingUrls.length > 0) {
      console.log(`[Scraper] Processing ${remainingUrls.length} URLs individually...`);
      const fallbackResults = await scrapeParallel(remainingUrls, options);
      for (const result of fallbackResults) {
        results.set(result.url, result);
      }
    }
  }

  // 5. Return results in original URL order
  return urls.map((url) => results.get(url) ?? {
    url,
    success: false,
    error: "Unknown error",
    fromCache: false,
  });
}

/**
 * Scrapes multiple URLs in parallel, respecting concurrency limits.
 * Falls back to individual scrapes if batch fails.
 */
export async function scrapeBatch(
  urls: string[],
  options?: ScrapeOptions & { batchSize?: number }
): Promise<ScrapeResult[]> {
  // Use batch API for efficiency
  return scrapeBatchWithApi(urls, options);
}

/**
 * Scrapes a batch of URLs for a single pipeline tick.
 * Uses Firecrawl's batch endpoint for maximum efficiency.
 */
export async function scrapeForTick(
  urls: string[],
  options?: ScrapeOptions
): Promise<ScrapeResult[]> {
  // Use batch API - single request for all URLs
  return scrapeBatchWithApi(urls, options);
}
