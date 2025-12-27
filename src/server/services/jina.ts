import { getCached, setCache } from "@/server/services/url-cache";

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

const JINA_READER_URL = "https://r.jina.ai/";
const SCRAPE_TIMEOUT_MS = 30000; // 30 seconds max per URL
const PARALLEL_CONCURRENCY = 5; // Concurrent requests

/**
 * Scrapes a single URL using Jina Reader API.
 * Returns clean markdown content.
 */
export async function scrapeToMarkdown(
  url: string,
  options?: ScrapeOptions & { apiKey?: string }
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

  // 2. Scrape with Jina Reader
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);

    const headers: Record<string, string> = {
      Accept: "text/markdown",
    };

    // Add API key if provided (for higher rate limits)
    if (options?.apiKey) {
      headers["Authorization"] = `Bearer ${options.apiKey}`;
    }

    const response = await fetch(`${JINA_READER_URL}${url}`, {
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Jina Reader error: ${response.status} ${response.statusText}`);
    }

    const markdown = await response.text();

    const result: ScrapeResult = {
      url,
      success: true,
      markdown,
      fromCache: false,
    };

    // 3. Store in cache
    await setCache(url, {
      url,
      success: true,
      markdown,
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.name === "AbortError"
          ? "Scrape timeout (30s)"
          : error.message
        : "Unknown error";

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
 * Scrapes multiple URLs in parallel with concurrency limit.
 */
export async function scrapeBatch(
  urls: string[],
  options?: ScrapeOptions & { apiKey?: string }
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

  // 3. Scrape uncached URLs in parallel batches
  for (let i = 0; i < urlsToScrape.length; i += PARALLEL_CONCURRENCY) {
    const chunk = urlsToScrape.slice(i, i + PARALLEL_CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map((url) => scrapeToMarkdown(url, options))
    );
    for (const result of chunkResults) {
      results.set(result.url, result);
    }
  }

  // 4. Return results in original URL order
  return urls.map(
    (url) =>
      results.get(url) ?? {
        url,
        success: false,
        error: "Unknown error",
        fromCache: false,
      }
  );
}
