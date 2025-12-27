import type { Source } from "@prisma/client";

export interface CitationGap {
  id: string;
  url: string;
  title: string | null;
  authorityScore: number | null;
  mentionsCompetitors: string[];
}

export interface SentimentBreakdown {
  POSITIVE: number;
  NEUTRAL: number;
  MIXED: number;
}

/**
 * Calculates the Visibility Index: percentage of sources that mention the brand.
 * Formula: (sources mentioning brand / total analyzed sources) * 100
 */
export function calculateVisibilityIndex(sources: Source[]): number {
  const analyzedSources = sources.filter((s) => s.analyzedAt !== null);

  if (analyzedSources.length === 0) {
    return 0;
  }

  const mentioningBrand = analyzedSources.filter((s) => s.mentionsBrand).length;
  return (mentioningBrand / analyzedSources.length) * 100;
}

/**
 * Finds Citation Gaps: high-authority sources that mention competitors but not the brand.
 * These represent opportunities for the brand to improve visibility.
 */
export function findCitationGaps(
  sources: Source[],
  minAuthority = 0.3
): CitationGap[] {
  return sources
    .filter(
      (s) =>
        s.analyzedAt !== null &&
        !s.mentionsBrand &&
        s.mentionsCompetitors.length > 0 &&
        (s.authorityScore ?? 0) >= minAuthority
    )
    .map((s) => ({
      id: s.id,
      url: s.url,
      title: s.title,
      authorityScore: s.authorityScore,
      mentionsCompetitors: s.mentionsCompetitors,
    }))
    .sort((a, b) => (b.authorityScore ?? 0) - (a.authorityScore ?? 0));
}

/**
 * Calculates sentiment breakdown across all analyzed sources.
 * Returns counts for each sentiment category.
 */
export function calculateSentimentBreakdown(
  sources: Source[]
): SentimentBreakdown {
  const analyzedSources = sources.filter(
    (s) => s.analyzedAt !== null && s.sentiment !== null
  );

  const breakdown: SentimentBreakdown = {
    POSITIVE: 0,
    NEUTRAL: 0,
    MIXED: 0,
  };

  for (const source of analyzedSources) {
    if (source.sentiment) {
      breakdown[source.sentiment as keyof SentimentBreakdown]++;
    }
  }

  return breakdown;
}

/**
 * Calculates sentiment breakdown as percentages.
 */
export function calculateSentimentPercentages(
  sources: Source[]
): SentimentBreakdown {
  const breakdown = calculateSentimentBreakdown(sources);
  const total = breakdown.POSITIVE + breakdown.NEUTRAL + breakdown.MIXED;

  if (total === 0) {
    return { POSITIVE: 0, NEUTRAL: 0, MIXED: 0 };
  }

  return {
    POSITIVE: (breakdown.POSITIVE / total) * 100,
    NEUTRAL: (breakdown.NEUTRAL / total) * 100,
    MIXED: (breakdown.MIXED / total) * 100,
  };
}

/**
 * Gets sources that mention the brand, sorted by authority.
 */
export function getBrandMentions(sources: Source[]): Source[] {
  return sources
    .filter((s) => s.analyzedAt !== null && s.mentionsBrand)
    .sort((a, b) => (b.authorityScore ?? 0) - (a.authorityScore ?? 0));
}

/**
 * Calculates overall audit statistics.
 */
export function calculateAuditStats(sources: Source[]) {
  const totalSources = sources.length;
  const scrapedSources = sources.filter(
    (s) => s.scrapeStatus === "COMPLETED"
  ).length;
  const failedScrapes = sources.filter(
    (s) => s.scrapeStatus === "FAILED"
  ).length;
  const analyzedSources = sources.filter((s) => s.analyzedAt !== null).length;

  return {
    totalSources,
    scrapedSources,
    failedScrapes,
    analyzedSources,
    visibilityIndex: calculateVisibilityIndex(sources),
    sentimentBreakdown: calculateSentimentBreakdown(sources),
    citationGapsCount: findCitationGaps(sources).length,
  };
}
