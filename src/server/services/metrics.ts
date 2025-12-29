import type { Source, AIPlatformQuery, Competitor } from "@prisma/client";

export interface CitationGap {
  id: string;
  url: string;
  title: string | null;
  authorityScore: number | null;
  mentionsCompetitors: string[];
  mentionSnippet: string | null; // Context snippet about competitor mentions
}

export interface SentimentBreakdown {
  POSITIVE: number;
  NEGATIVE: number;
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
      mentionSnippet: s.mentionSnippet,
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
    NEGATIVE: 0,
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
  const total = breakdown.POSITIVE + breakdown.NEGATIVE + breakdown.NEUTRAL + breakdown.MIXED;

  if (total === 0) {
    return { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0, MIXED: 0 };
  }

  return {
    POSITIVE: (breakdown.POSITIVE / total) * 100,
    NEGATIVE: (breakdown.NEGATIVE / total) * 100,
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

// =============================================================================
// Share of Voice Metrics (AI Platform)
// =============================================================================

export interface CompetitorSOV {
  name: string;
  mentions: number;
  shareOfVoice: number;
}

export interface PlatformSOV {
  platform: string;
  totalResponses: number;
  brandMentions: number;
  shareOfVoice: number;
}

export interface ShareOfVoiceMetrics {
  totalResponses: number;
  brandMentions: number;
  brandShareOfVoice: number;
  competitorShareOfVoice: CompetitorSOV[];
  byPlatform: PlatformSOV[];
  averageBrandPosition: number | null;
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
}

/**
 * Calculates Share of Voice metrics from AI platform query responses.
 * SOV = (Brand Mentions / Total Responses) × 100
 */
export function calculateShareOfVoice(
  responses: AIPlatformQuery[],
  competitors: Competitor[]
): ShareOfVoiceMetrics {
  if (responses.length === 0) {
    return {
      totalResponses: 0,
      brandMentions: 0,
      brandShareOfVoice: 0,
      competitorShareOfVoice: [],
      byPlatform: [],
      averageBrandPosition: null,
      sentimentBreakdown: {
        positive: 0,
        negative: 0,
        neutral: 0,
        mixed: 0,
      },
    };
  }

  // Calculate brand mentions
  const brandMentions = responses.filter((r) => r.mentionsBrand).length;
  const brandShareOfVoice = (brandMentions / responses.length) * 100;

  // Calculate competitor mentions
  const competitorNames = competitors.map((c) => c.name);
  const competitorMentions: Record<string, number> = {};

  for (const name of competitorNames) {
    competitorMentions[name] = 0;
  }

  for (const response of responses) {
    for (const mentioned of response.competitorsMentioned) {
      if (competitorMentions[mentioned] !== undefined) {
        competitorMentions[mentioned]++;
      }
    }
  }

  const competitorShareOfVoice = Object.entries(competitorMentions).map(
    ([name, mentions]) => ({
      name,
      mentions,
      shareOfVoice: (mentions / responses.length) * 100,
    })
  );

  // Calculate by platform
  const platformGroups: Record<string, AIPlatformQuery[]> = {};
  for (const response of responses) {
    if (!platformGroups[response.platform]) {
      platformGroups[response.platform] = [];
    }
    platformGroups[response.platform].push(response);
  }

  const byPlatform = Object.entries(platformGroups).map(
    ([platform, platformResponses]) => {
      const platformBrandMentions = platformResponses.filter(
        (r) => r.mentionsBrand
      ).length;

      return {
        platform,
        totalResponses: platformResponses.length,
        brandMentions: platformBrandMentions,
        shareOfVoice: (platformBrandMentions / platformResponses.length) * 100,
      };
    }
  );

  // Calculate average brand position (for responses where brand is mentioned)
  const positionedResponses = responses.filter(
    (r) => r.mentionsBrand && r.brandPosition !== null
  );
  const averageBrandPosition =
    positionedResponses.length > 0
      ? positionedResponses.reduce((sum, r) => sum + (r.brandPosition ?? 0), 0) /
        positionedResponses.length
      : null;

  // Calculate sentiment breakdown (for responses with brand mentions)
  const brandResponses = responses.filter((r) => r.mentionsBrand);
  const sentimentBreakdown = {
    positive: brandResponses.filter((r) => r.sentiment === "POSITIVE").length,
    negative: brandResponses.filter((r) => r.sentiment === "NEGATIVE").length,
    neutral: brandResponses.filter((r) => r.sentiment === "NEUTRAL").length,
    mixed: brandResponses.filter((r) => r.sentiment === "MIXED").length,
  };

  return {
    totalResponses: responses.length,
    brandMentions,
    brandShareOfVoice,
    competitorShareOfVoice,
    byPlatform,
    averageBrandPosition,
    sentimentBreakdown,
  };
}

/**
 * Calculates a combined visibility score that weighs both web sources and AI platforms.
 * Formula: (Web Visibility Index * 0.6) + (AI SOV * 0.4)
 * This reflects that web citations are currently more valuable but AI visibility is growing.
 */
export function calculateCombinedVisibilityScore(
  webVisibilityIndex: number,
  aiShareOfVoice: number
): number {
  const WEB_WEIGHT = 0.6;
  const AI_WEIGHT = 0.4;

  return webVisibilityIndex * WEB_WEIGHT + aiShareOfVoice * AI_WEIGHT;
}

// =============================================================================
// AI Visibility Insights
// =============================================================================

export type InsightSeverity = "info" | "warning" | "opportunity" | "success";

export interface AIVisibilityInsight {
  id: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  metric?: number;
  platform?: string;
  competitor?: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  claude: "Claude",
  gemini: "Gemini",
};

function formatPlatform(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform;
}

/**
 * Generates actionable insights from Share of Voice metrics.
 * Provides natural language summaries of AI visibility patterns.
 */
export function generateAIVisibilityInsights(
  metrics: ShareOfVoiceMetrics,
  brandName: string
): AIVisibilityInsight[] {
  const insights: AIVisibilityInsight[] = [];

  // 1. Overall brand visibility assessment
  if (metrics.brandShareOfVoice >= 50) {
    insights.push({
      id: "high-sov",
      severity: "success",
      title: "Strong AI visibility",
      description: `${brandName} appears in ${metrics.brandShareOfVoice.toFixed(0)}% of AI responses`,
      metric: metrics.brandShareOfVoice,
    });
  } else if (metrics.brandShareOfVoice < 20 && metrics.totalResponses >= 3) {
    insights.push({
      id: "low-sov",
      severity: "warning",
      title: "Low AI visibility",
      description: `${brandName} only appears in ${metrics.brandShareOfVoice.toFixed(0)}% of AI responses`,
      metric: metrics.brandShareOfVoice,
    });
  }

  // 2. Platform-specific insights (zero mentions)
  for (const platform of metrics.byPlatform) {
    if (platform.shareOfVoice === 0 && platform.totalResponses >= 2) {
      insights.push({
        id: `missing-${platform.platform}`,
        severity: "opportunity",
        title: `Not mentioned on ${formatPlatform(platform.platform)}`,
        description: `${brandName} wasn't mentioned in any of ${platform.totalResponses} ${formatPlatform(platform.platform)} responses`,
        platform: platform.platform,
      });
    }
  }

  // 3. Platform-specific insights (strong performance)
  for (const platform of metrics.byPlatform) {
    if (platform.shareOfVoice >= 75 && platform.totalResponses >= 2) {
      insights.push({
        id: `strong-${platform.platform}`,
        severity: "success",
        title: `Strong on ${formatPlatform(platform.platform)}`,
        description: `${brandName} appears in ${platform.shareOfVoice.toFixed(0)}% of ${formatPlatform(platform.platform)} responses`,
        platform: platform.platform,
        metric: platform.shareOfVoice,
      });
    }
  }

  // 4. Competitor dominance insights
  for (const competitor of metrics.competitorShareOfVoice) {
    if (competitor.shareOfVoice > metrics.brandShareOfVoice + 20) {
      insights.push({
        id: `competitor-dominates-${competitor.name}`,
        severity: "warning",
        title: `${competitor.name} dominates AI responses`,
        description: `${competitor.name} appears in ${competitor.shareOfVoice.toFixed(0)}% of responses vs your ${metrics.brandShareOfVoice.toFixed(0)}%`,
        competitor: competitor.name,
        metric: competitor.shareOfVoice - metrics.brandShareOfVoice,
      });
    }
  }

  // 5. Position insights
  if (metrics.averageBrandPosition !== null && metrics.averageBrandPosition > 3) {
    insights.push({
      id: "low-position",
      severity: "opportunity",
      title: "Low average ranking position",
      description: `When mentioned, ${brandName} appears at position #${metrics.averageBrandPosition.toFixed(1)} on average`,
      metric: metrics.averageBrandPosition,
    });
  } else if (
    metrics.averageBrandPosition !== null &&
    metrics.averageBrandPosition <= 2
  ) {
    insights.push({
      id: "high-position",
      severity: "success",
      title: "Strong ranking position",
      description: `${brandName} typically appears in position #${metrics.averageBrandPosition.toFixed(1)} when mentioned`,
      metric: metrics.averageBrandPosition,
    });
  }

  // 6. Sentiment insights
  const { positive, neutral, mixed } = metrics.sentimentBreakdown;
  const totalSentiment = positive + neutral + mixed;
  if (totalSentiment >= 3) {
    if (positive > neutral + mixed) {
      insights.push({
        id: "positive-sentiment",
        severity: "success",
        title: "Positive sentiment dominates",
        description: `${positive} of ${totalSentiment} brand mentions have positive sentiment`,
        metric: (positive / totalSentiment) * 100,
      });
    } else if (mixed > positive) {
      insights.push({
        id: "mixed-sentiment",
        severity: "warning",
        title: "Mixed sentiment detected",
        description: `${mixed} of ${totalSentiment} brand mentions have mixed or uncertain sentiment`,
        metric: (mixed / totalSentiment) * 100,
      });
    }
  }

  return insights;
}
