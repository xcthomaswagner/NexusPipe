import crypto from "crypto";

import { db } from "@/server/db";

const DEFAULT_TTL_DAYS = 14;

export interface CacheResult {
  hit: boolean;
  markdown?: string;
  title?: string;
  error?: string;
}

export interface CacheableScrapeResult {
  url: string;
  success: boolean;
  markdown?: string;
  title?: string;
  error?: string;
}

/**
 * Normalizes a URL for consistent caching.
 * Removes trailing slashes, lowercases hostname, removes common tracking params.
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();
    // Remove trailing slash from pathname
    if (parsed.pathname.endsWith("/") && parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    // Remove common tracking params
    const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "ref"];
    trackingParams.forEach((param) => parsed.searchParams.delete(param));
    return parsed.toString();
  } catch {
    // If URL parsing fails, return as-is
    return url;
  }
}

/**
 * Generates a SHA256 hash of the normalized URL for efficient indexing.
 */
function hashUrl(url: string): string {
  const normalized = normalizeUrl(url);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Checks the cache for a URL.
 * Returns cached content if available and not stale.
 */
export async function getCached(
  url: string,
  ttlDays: number = DEFAULT_TTL_DAYS
): Promise<CacheResult> {
  const urlHash = hashUrl(url);

  const cached = await db.urlCache.findUnique({
    where: { urlHash },
  });

  if (!cached) {
    return { hit: false };
  }

  // Check if cache is stale
  const ageMs = Date.now() - cached.scrapedAt.getTime();
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000;

  if (ageMs > ttlMs) {
    return { hit: false };
  }

  // Increment hit count
  await db.urlCache.update({
    where: { urlHash },
    data: { hitCount: { increment: 1 } },
  });

  if (!cached.success) {
    return {
      hit: true,
      error: cached.error ?? "Previous scrape failed",
    };
  }

  return {
    hit: true,
    markdown: cached.markdown ?? undefined,
    title: cached.title ?? undefined,
  };
}

/**
 * Stores a scrape result in the cache.
 * Uses upsert to handle both new entries and updates.
 */
export async function setCache(
  url: string,
  result: CacheableScrapeResult
): Promise<void> {
  const urlHash = hashUrl(url);
  const normalizedUrl = normalizeUrl(url);

  await db.urlCache.upsert({
    where: { urlHash },
    create: {
      url: normalizedUrl,
      urlHash,
      markdown: result.markdown,
      title: result.title,
      success: result.success,
      error: result.error,
      scrapedAt: new Date(),
      hitCount: 0,
    },
    update: {
      markdown: result.markdown,
      title: result.title,
      success: result.success,
      error: result.error,
      scrapedAt: new Date(),
      // Don't reset hitCount on update
    },
  });
}

/**
 * Gets cache statistics.
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  successfulEntries: number;
  totalHits: number;
  oldestEntry: Date | null;
}> {
  const [count, successCount, hitSum, oldest] = await Promise.all([
    db.urlCache.count(),
    db.urlCache.count({ where: { success: true } }),
    db.urlCache.aggregate({ _sum: { hitCount: true } }),
    db.urlCache.findFirst({
      orderBy: { scrapedAt: "asc" },
      select: { scrapedAt: true },
    }),
  ]);

  return {
    totalEntries: count,
    successfulEntries: successCount,
    totalHits: hitSum._sum.hitCount ?? 0,
    oldestEntry: oldest?.scrapedAt ?? null,
  };
}

/**
 * Clears stale cache entries older than the specified TTL.
 * Useful for maintenance/cleanup.
 */
export async function clearStaleCache(ttlDays: number = DEFAULT_TTL_DAYS): Promise<number> {
  const cutoffDate = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000);

  const result = await db.urlCache.deleteMany({
    where: {
      scrapedAt: { lt: cutoffDate },
    },
  });

  return result.count;
}
