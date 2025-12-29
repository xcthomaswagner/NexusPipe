import type { Audit, AuditStatus, Prisma } from "@prisma/client";

import { db } from "@/server/db";
import {
  searchNeural,
  generateExcludeDomains,
  filterExcludedDomains,
} from "@/server/services/exa";
import { scrapeForTick, getActiveProvider, type ScrapeOptions } from "@/server/services/scraper";
import { analyzeSource } from "@/server/services/synthesis";
import { calculateVisibilityIndex } from "@/server/services/metrics";
import { DEPTH_CONFIG } from "@/lib/validation/audit";

const SCRAPE_BATCH_SIZE = 10; // Parallel scrapes per tick
const ANALYZE_BATCH_SIZE = 10;

// Processing locks to prevent concurrent synthesis for the same audit
const processingLocks = new Map<string, boolean>();

/**
 * Acquires a processing lock for an audit.
 * Returns true if lock acquired, false if already locked.
 */
function acquireLock(auditId: string): boolean {
  if (processingLocks.get(auditId)) {
    return false;
  }
  processingLocks.set(auditId, true);
  return true;
}

/**
 * Releases a processing lock for an audit.
 */
function releaseLock(auditId: string): void {
  processingLocks.delete(auditId);
}

export interface PipelineResult {
  status: AuditStatus;
  progress: number;
  message: string;
}

/**
 * Creates an audit log entry.
 */
async function log(auditId: string, message: string): Promise<void> {
  await db.auditLog.create({
    data: { auditId, message },
  });
}

/**
 * Starts the pipeline by running neural discovery.
 * This is called once when the audit begins.
 */
export async function startPipeline(auditId: string): Promise<PipelineResult> {
  const audit = await db.audit.findUnique({
    where: { id: auditId },
    include: { competitors: true },
  });

  if (!audit) {
    throw new Error("Audit not found");
  }

  if (audit.status !== "PENDING") {
    // Already started, return current status
    return getProgress(auditId);
  }

  // Update status to DISCOVERING
  await db.audit.update({
    where: { id: auditId },
    data: { status: "DISCOVERING" },
  });

  await log(auditId, "Starting neural discovery...");

  try {
    // Generate domains to exclude (brand + competitor websites)
    const competitorNames = audit.competitors.map((c) => c.name);
    const autoExcludeDomains = generateExcludeDomains(audit.brandName, competitorNames);

    // Combine auto-generated exclusions with user-specified exclusions
    const allExcludeDomains = [...new Set([...autoExcludeDomains, ...audit.excludedDomains])];

    await log(
      auditId,
      `Excluding ${allExcludeDomains.length} domains (${autoExcludeDomains.length} auto + ${audit.excludedDomains.length} manual)`
    );

    // Get depth configuration
    const depthConfig = DEPTH_CONFIG[audit.depth as keyof typeof DEPTH_CONFIG] ?? DEPTH_CONFIG.STANDARD;
    const targetSources = depthConfig.sources;
    const minAuthority = audit.minAuthority ?? depthConfig.minAuthority;

    await log(auditId, `Scan depth: ${depthConfig.label} (${targetSources} sources, min authority ${(minAuthority * 100).toFixed(0)}%)`);

    // Run Exa search with domain exclusions
    // Request extra results to account for filtering and authority threshold
    const rawResults = await searchNeural(audit.industryIntent, {
      numResults: Math.min(targetSources * 2, 200), // Request 2x to account for filtering
      excludeDomains: allExcludeDomains,
    });

    // Post-filter: remove excluded domains and apply authority threshold
    const filteredResults = filterExcludedDomains(rawResults, allExcludeDomains)
      .filter((r) => (r.score ?? 0) >= minAuthority)
      .slice(0, targetSources);

    await log(auditId, `Found ${filteredResults.length} sources (min authority: ${(minAuthority * 100).toFixed(0)}%)`);

    // Create Source records
    await db.source.createMany({
      data: filteredResults.map((result) => ({
        auditId,
        url: result.url,
        title: result.title,
        authorityScore: result.score,
        scrapeStatus: "PENDING" as const,
      })),
    });

    // Move to INGESTING
    await db.audit.update({
      where: { id: auditId },
      data: { status: "INGESTING" },
    });

    await log(auditId, `Discovery complete. Starting content ingestion (${getActiveProvider()})...`);

    return {
      status: "INGESTING",
      progress: 10,
      message: `Found ${filteredResults.length} sources. Starting ingestion...`,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await db.audit.update({
      where: { id: auditId },
      data: {
        status: "FAILED",
        errorMessage: `Discovery failed: ${errorMessage}`,
      },
    });

    await log(auditId, `Error: ${errorMessage}`);

    return {
      status: "FAILED",
      progress: 0,
      message: `Discovery failed: ${errorMessage}`,
    };
  }
}

export interface ProcessOptions {
  skipCache?: boolean;
}

/**
 * Processes the next chunk of work for the pipeline.
 * Called repeatedly by the client until the audit is complete.
 */
export async function processNextChunk(
  auditId: string,
  options?: ProcessOptions
): Promise<PipelineResult> {
  const audit = await db.audit.findUnique({
    where: { id: auditId },
    include: { competitors: true, sources: true },
  });

  if (!audit) {
    throw new Error("Audit not found");
  }

  switch (audit.status) {
    case "PENDING":
      // Should call startPipeline first
      return startPipeline(auditId);

    case "DISCOVERING":
      // Still discovering, return current status
      return {
        status: "DISCOVERING",
        progress: 5,
        message: "Running neural discovery...",
      };

    case "INGESTING":
      return processIngestion(audit, options);

    case "SYNTHESIZING":
      return processSynthesis(audit);

    case "COMPLETED":
      return {
        status: "COMPLETED",
        progress: 100,
        message: `Audit complete! Visibility Index: ${audit.visibilityScore?.toFixed(1)}%`,
      };

    case "FAILED":
      return {
        status: "FAILED",
        progress: 0,
        message: audit.errorMessage ?? "Audit failed",
      };

    default:
      return {
        status: audit.status,
        progress: 0,
        message: "Unknown status",
      };
  }
}

/**
 * Processes the ingestion stage: scrapes pending sources.
 * Uses a lock to prevent concurrent processing of the same audit.
 */
async function processIngestion(
  audit: Audit & { competitors: { name: string }[]; sources: Prisma.SourceGetPayload<object>[] },
  options?: ScrapeOptions
): Promise<PipelineResult> {
  // Fetch fresh source data to check current state
  const freshSources = await db.source.findMany({
    where: { auditId: audit.id },
  });

  const pendingSources = freshSources.filter(
    (s) => s.scrapeStatus === "PENDING"
  );
  const totalSources = freshSources.length;
  const scrapedCount = totalSources - pendingSources.length;

  if (pendingSources.length === 0) {
    // All sources scraped, move to synthesis
    await db.audit.update({
      where: { id: audit.id },
      data: { status: "SYNTHESIZING" },
    });

    await log(audit.id, "Analysis complete. Starting synthesis...");

    return {
      status: "SYNTHESIZING",
      progress: 50,
      message: "Analysis complete. Starting synthesis...",
    };
  }

  // Try to acquire lock - if already processing, return current progress
  if (!acquireLock(audit.id)) {
    const progress = 10 + (scrapedCount / totalSources) * 40;
    return {
      status: "INGESTING",
      progress,
      message: `Analyzing ${scrapedCount}/${totalSources} sources (in progress)...`,
    };
  }

  try {
    // Scrape next batch
    const batch = pendingSources.slice(0, SCRAPE_BATCH_SIZE);
    const urls = batch.map((s) => s.url);

    await log(
      audit.id,
      `Analyzing sources ${scrapedCount + 1}-${Math.min(scrapedCount + batch.length, totalSources)} of ${totalSources}...`
    );

    let results;
    try {
      results = await scrapeForTick(urls, options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await log(audit.id, `Analysis error: ${errorMessage}`);

      // Mark all batch sources as failed
      for (const source of batch) {
        await db.source.update({
          where: { id: source.id },
          data: {
            scrapeStatus: "FAILED",
            scrapeError: errorMessage,
          },
        });
      }

      const newScrapedCount = scrapedCount + batch.length;
      const progress = 10 + (newScrapedCount / totalSources) * 40;
      return {
        status: "INGESTING" as const,
        progress,
        message: `Error, continuing... (${newScrapedCount}/${totalSources})`,
      };
    }

    // Log cache statistics and errors
    const cacheHits = results.filter((r) => r.fromCache).length;
    const freshScrapes = results.length - cacheHits;
    const failures = results.filter((r) => !r.success).length;

    if (cacheHits > 0) {
      await log(audit.id, `Cache: ${cacheHits} cached, ${freshScrapes} fresh`);
    }

    if (failures > 0) {
      await log(audit.id, `Results: ${results.length - failures} success, ${failures} failed`);
    }

    // Update sources with results
    for (let i = 0; i < batch.length; i++) {
      const source = batch[i];
      const result = results[i];

      await db.source.update({
        where: { id: source.id },
        data: {
          scrapeStatus: result.success ? "COMPLETED" : "FAILED",
          markdown: result.markdown,
          scrapeError: result.error,
        },
      });
    }

    const newScrapedCount = scrapedCount + batch.length;
    const progress = 10 + (newScrapedCount / totalSources) * 40; // 10-50%

    return {
      status: "INGESTING",
      progress,
      message: `Analyzed ${newScrapedCount}/${totalSources} sources`,
    };
  } finally {
    // Always release the lock
    releaseLock(audit.id);
  }
}

/**
 * Processes the synthesis stage: analyzes scraped sources.
 * Uses a lock to prevent concurrent processing of the same audit.
 */
async function processSynthesis(
  audit: Audit & { competitors: { name: string }[]; sources: Prisma.SourceGetPayload<object>[] }
): Promise<PipelineResult> {
  // Fetch fresh source data to check current state
  const freshSources = await db.source.findMany({
    where: { auditId: audit.id },
  });

  const scrapedSources = freshSources.filter(
    (s) => s.scrapeStatus === "COMPLETED" && s.markdown
  );
  const unanalyzedSources = scrapedSources.filter((s) => s.analyzedAt === null);
  const analyzedCount = scrapedSources.length - unanalyzedSources.length;

  if (unanalyzedSources.length === 0) {
    // All sources analyzed, complete the audit
    const visibilityScore = calculateVisibilityIndex(freshSources);

    await db.audit.update({
      where: { id: audit.id },
      data: {
        status: "COMPLETED",
        visibilityScore,
      },
    });

    await log(
      audit.id,
      `Audit complete! Visibility Index: ${visibilityScore.toFixed(1)}%`
    );

    return {
      status: "COMPLETED",
      progress: 100,
      message: `Audit complete! Visibility Index: ${visibilityScore.toFixed(1)}%`,
    };
  }

  // Try to acquire lock - if already processing, return current progress
  if (!acquireLock(audit.id)) {
    const progress = 50 + (analyzedCount / scrapedSources.length) * 50;
    return {
      status: "SYNTHESIZING",
      progress,
      message: `Synthesizing ${analyzedCount}/${scrapedSources.length} sources (in progress)...`,
    };
  }

  try {
    // Analyze next batch
    const batch = unanalyzedSources.slice(0, ANALYZE_BATCH_SIZE);
    const competitorNames = audit.competitors.map((c) => c.name);

    await log(
      audit.id,
      `Synthesizing sources ${analyzedCount + 1}-${Math.min(analyzedCount + batch.length, scrapedSources.length)} of ${scrapedSources.length}...`
    );

    // Analyze each source
    for (const source of batch) {
      try {
        const result = await analyzeSource(
          source.markdown!,
          audit.brandName,
          competitorNames,
          audit.brandContext // Pass brand context for entity disambiguation
        );

        await db.source.update({
          where: { id: source.id },
          data: {
            mentionsBrand: result.mentionsBrand,
            mentionsCompetitors: result.mentionsCompetitors,
            sentiment: result.sentiment,
            mentionSnippet: result.mentionSnippet,
            isAmbiguousMatch: result.isAmbiguousMatch,
            analyzedAt: new Date(),
          },
        });
      } catch (error) {
        console.error(`[Synthesis] Error analyzing source ${source.id}:`, error);
        // Mark as analyzed with defaults on error
        await db.source.update({
          where: { id: source.id },
          data: {
            mentionsBrand: false,
            mentionsCompetitors: [],
            sentiment: "NEUTRAL",
            mentionSnippet: null,
            isAmbiguousMatch: false,
            analyzedAt: new Date(),
          },
        });
      }
    }

    const newAnalyzedCount = analyzedCount + batch.length;
    const progress = 50 + (newAnalyzedCount / scrapedSources.length) * 50; // 50-100%

    return {
      status: "SYNTHESIZING",
      progress,
      message: `Synthesized ${newAnalyzedCount}/${scrapedSources.length} sources`,
    };
  } finally {
    // Always release the lock
    releaseLock(audit.id);
  }
}

/**
 * Gets the current progress of an audit.
 */
export async function getProgress(auditId: string): Promise<PipelineResult> {
  const audit = await db.audit.findUnique({
    where: { id: auditId },
    include: { sources: true },
  });

  if (!audit) {
    throw new Error("Audit not found");
  }

  const totalSources = audit.sources.length;
  const scrapedSources = audit.sources.filter(
    (s) => s.scrapeStatus === "COMPLETED"
  ).length;
  const analyzedSources = audit.sources.filter(
    (s) => s.analyzedAt !== null
  ).length;

  switch (audit.status) {
    case "PENDING":
      return { status: "PENDING", progress: 0, message: "Ready to start" };

    case "DISCOVERING":
      return {
        status: "DISCOVERING",
        progress: 5,
        message: "Running neural discovery...",
      };

    case "INGESTING": {
      const progress =
        totalSources > 0
          ? 10 + (scrapedSources / totalSources) * 40
          : 10;
      return {
        status: "INGESTING",
        progress,
        message: `Analyzed ${scrapedSources}/${totalSources} sources`,
      };
    }

    case "SYNTHESIZING": {
      const scrapedCount = audit.sources.filter(
        (s) => s.scrapeStatus === "COMPLETED"
      ).length;
      const progress =
        scrapedCount > 0
          ? 50 + (analyzedSources / scrapedCount) * 50
          : 50;
      return {
        status: "SYNTHESIZING",
        progress,
        message: `Synthesized ${analyzedSources}/${scrapedCount} sources`,
      };
    }

    case "COMPLETED":
      return {
        status: "COMPLETED",
        progress: 100,
        message: `Audit complete! Visibility Index: ${audit.visibilityScore?.toFixed(1)}%`,
      };

    case "FAILED":
      return {
        status: "FAILED",
        progress: 0,
        message: audit.errorMessage ?? "Audit failed",
      };

    default:
      return { status: audit.status, progress: 0, message: "Unknown status" };
  }
}

/**
 * Gets the audit logs for display in the terminal UI.
 */
export async function getAuditLogs(
  auditId: string
): Promise<{ id: string; message: string; createdAt: Date }[]> {
  return db.auditLog.findMany({
    where: { auditId },
    orderBy: { createdAt: "asc" },
    select: { id: true, message: true, createdAt: true },
  });
}
