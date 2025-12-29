import {
  calculateVisibilityIndex,
  findCitationGaps,
  calculateSentimentBreakdown,
  calculateAuditStats,
  calculateShareOfVoice,
  calculateCombinedVisibilityScore,
} from "./metrics";

import type { Source, AIPlatformQuery, Competitor } from "@prisma/client";

// Helper to create mock sources
function createMockSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "source-1",
    auditId: "audit-1",
    url: "https://example.com",
    title: "Example Source",
    authorityScore: 0.5,
    markdown: "Content",
    mentionsBrand: false,
    mentionsCompetitors: [],
    sentiment: null,
    mentionSnippet: null,
    isAmbiguousMatch: null,
    scrapeStatus: "COMPLETED",
    scrapeError: null,
    analyzedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

// Helper to create mock AI platform queries
function createMockAIQuery(overrides: Partial<AIPlatformQuery> = {}): AIPlatformQuery {
  return {
    id: "query-1",
    auditId: "audit-1",
    query: "What is the best CRM?",
    platform: "chatgpt",
    response: "Here are some CRM options...",
    mentionsBrand: false,
    brandPosition: null,
    sentiment: null,
    competitorsMentioned: [],
    createdAt: new Date(),
    ...overrides,
  };
}

// Helper to create mock competitors
function createMockCompetitor(name: string): Competitor {
  return {
    id: `competitor-${name}`,
    name,
    auditId: "audit-1",
  };
}

describe("metrics", () => {
  describe("calculateVisibilityIndex", () => {
    it("returns 0 for empty sources", () => {
      expect(calculateVisibilityIndex([])).toBe(0);
    });

    it("returns 0 when no sources are analyzed", () => {
      const sources = [
        createMockSource({ analyzedAt: null }),
        createMockSource({ analyzedAt: null }),
      ];
      expect(calculateVisibilityIndex(sources)).toBe(0);
    });

    it("returns 100 when all analyzed sources mention brand", () => {
      const sources = [
        createMockSource({ mentionsBrand: true }),
        createMockSource({ mentionsBrand: true }),
      ];
      expect(calculateVisibilityIndex(sources)).toBe(100);
    });

    it("returns 50 when half of analyzed sources mention brand", () => {
      const sources = [
        createMockSource({ mentionsBrand: true }),
        createMockSource({ mentionsBrand: false }),
      ];
      expect(calculateVisibilityIndex(sources)).toBe(50);
    });

    it("only counts analyzed sources", () => {
      const sources = [
        createMockSource({ mentionsBrand: true }),
        createMockSource({ mentionsBrand: false, analyzedAt: null }),
      ];
      expect(calculateVisibilityIndex(sources)).toBe(100);
    });
  });

  describe("findCitationGaps", () => {
    it("returns empty array for empty sources", () => {
      expect(findCitationGaps([])).toEqual([]);
    });

    it("returns empty array when no gaps exist", () => {
      const sources = [
        createMockSource({ mentionsBrand: true }),
        createMockSource({ mentionsCompetitors: [] }),
      ];
      expect(findCitationGaps(sources)).toEqual([]);
    });

    it("identifies citation gaps", () => {
      const sources = [
        createMockSource({
          mentionsBrand: false,
          mentionsCompetitors: ["Competitor A"],
          authorityScore: 0.8,
        }),
      ];
      const gaps = findCitationGaps(sources);
      expect(gaps).toHaveLength(1);
      expect(gaps[0].mentionsCompetitors).toContain("Competitor A");
    });

    it("filters by minimum authority", () => {
      const sources = [
        createMockSource({
          mentionsBrand: false,
          mentionsCompetitors: ["Competitor A"],
          authorityScore: 0.1,
        }),
      ];
      expect(findCitationGaps(sources, 0.3)).toEqual([]);
    });

    it("sorts by authority descending", () => {
      const sources = [
        createMockSource({
          id: "low",
          mentionsBrand: false,
          mentionsCompetitors: ["Competitor"],
          authorityScore: 0.4,
        }),
        createMockSource({
          id: "high",
          mentionsBrand: false,
          mentionsCompetitors: ["Competitor"],
          authorityScore: 0.9,
        }),
      ];
      const gaps = findCitationGaps(sources);
      expect(gaps[0].id).toBe("high");
      expect(gaps[1].id).toBe("low");
    });
  });

  describe("calculateSentimentBreakdown", () => {
    it("returns zeros for empty sources", () => {
      expect(calculateSentimentBreakdown([])).toEqual({
        POSITIVE: 0,
        NEGATIVE: 0,
        NEUTRAL: 0,
        MIXED: 0,
      });
    });

    it("counts sentiment correctly", () => {
      const sources = [
        createMockSource({ sentiment: "POSITIVE" }),
        createMockSource({ sentiment: "POSITIVE" }),
        createMockSource({ sentiment: "NEGATIVE" }),
        createMockSource({ sentiment: "NEUTRAL" }),
        createMockSource({ sentiment: "MIXED" }),
      ];
      expect(calculateSentimentBreakdown(sources)).toEqual({
        POSITIVE: 2,
        NEGATIVE: 1,
        NEUTRAL: 1,
        MIXED: 1,
      });
    });

    it("ignores sources without sentiment", () => {
      const sources = [
        createMockSource({ sentiment: "POSITIVE" }),
        createMockSource({ sentiment: null }),
      ];
      expect(calculateSentimentBreakdown(sources)).toEqual({
        POSITIVE: 1,
        NEGATIVE: 0,
        NEUTRAL: 0,
        MIXED: 0,
      });
    });
  });

  describe("calculateAuditStats", () => {
    it("returns zeros for empty sources", () => {
      const stats = calculateAuditStats([]);
      expect(stats.totalSources).toBe(0);
      expect(stats.analyzedSources).toBe(0);
    });

    it("calculates stats correctly", () => {
      const sources = [
        createMockSource({ scrapeStatus: "COMPLETED", mentionsBrand: true }),
        createMockSource({ scrapeStatus: "FAILED" }),
        createMockSource({ scrapeStatus: "PENDING", analyzedAt: null }),
      ];
      const stats = calculateAuditStats(sources);
      expect(stats.totalSources).toBe(3);
      expect(stats.scrapedSources).toBe(1);
      expect(stats.failedScrapes).toBe(1);
      expect(stats.analyzedSources).toBe(2);
    });
  });

  describe("calculateShareOfVoice", () => {
    it("returns zeros for empty responses", () => {
      const result = calculateShareOfVoice([], []);
      expect(result.totalResponses).toBe(0);
      expect(result.brandMentions).toBe(0);
      expect(result.brandShareOfVoice).toBe(0);
    });

    it("calculates brand SOV correctly", () => {
      const responses = [
        createMockAIQuery({ mentionsBrand: true }),
        createMockAIQuery({ mentionsBrand: true }),
        createMockAIQuery({ mentionsBrand: false }),
        createMockAIQuery({ mentionsBrand: false }),
      ];
      const result = calculateShareOfVoice(responses, []);
      expect(result.totalResponses).toBe(4);
      expect(result.brandMentions).toBe(2);
      expect(result.brandShareOfVoice).toBe(50);
    });

    it("calculates competitor SOV correctly", () => {
      const responses = [
        createMockAIQuery({ competitorsMentioned: ["CompA", "CompB"] }),
        createMockAIQuery({ competitorsMentioned: ["CompA"] }),
        createMockAIQuery({ competitorsMentioned: [] }),
      ];
      const competitors = [
        createMockCompetitor("CompA"),
        createMockCompetitor("CompB"),
      ];
      const result = calculateShareOfVoice(responses, competitors);

      const compASOV = result.competitorShareOfVoice.find(c => c.name === "CompA");
      const compBSOV = result.competitorShareOfVoice.find(c => c.name === "CompB");

      expect(compASOV?.mentions).toBe(2);
      expect(compASOV?.shareOfVoice).toBeCloseTo(66.67, 1);
      expect(compBSOV?.mentions).toBe(1);
      expect(compBSOV?.shareOfVoice).toBeCloseTo(33.33, 1);
    });

    it("calculates by platform correctly", () => {
      const responses = [
        createMockAIQuery({ platform: "chatgpt", mentionsBrand: true }),
        createMockAIQuery({ platform: "chatgpt", mentionsBrand: false }),
        createMockAIQuery({ platform: "claude", mentionsBrand: true }),
      ];
      const result = calculateShareOfVoice(responses, []);

      const chatgptPlatform = result.byPlatform.find(p => p.platform === "chatgpt");
      const claudePlatform = result.byPlatform.find(p => p.platform === "claude");

      expect(chatgptPlatform?.totalResponses).toBe(2);
      expect(chatgptPlatform?.brandMentions).toBe(1);
      expect(chatgptPlatform?.shareOfVoice).toBe(50);

      expect(claudePlatform?.totalResponses).toBe(1);
      expect(claudePlatform?.brandMentions).toBe(1);
      expect(claudePlatform?.shareOfVoice).toBe(100);
    });

    it("calculates average brand position correctly", () => {
      const responses = [
        createMockAIQuery({ mentionsBrand: true, brandPosition: 1 }),
        createMockAIQuery({ mentionsBrand: true, brandPosition: 3 }),
        createMockAIQuery({ mentionsBrand: false, brandPosition: null }),
      ];
      const result = calculateShareOfVoice(responses, []);
      expect(result.averageBrandPosition).toBe(2);
    });

    it("returns null for average position when no positioned mentions", () => {
      const responses = [
        createMockAIQuery({ mentionsBrand: true, brandPosition: null }),
      ];
      const result = calculateShareOfVoice(responses, []);
      expect(result.averageBrandPosition).toBeNull();
    });

    it("calculates sentiment breakdown correctly", () => {
      const responses = [
        createMockAIQuery({ mentionsBrand: true, sentiment: "POSITIVE" }),
        createMockAIQuery({ mentionsBrand: true, sentiment: "NEGATIVE" }),
        createMockAIQuery({ mentionsBrand: true, sentiment: "NEUTRAL" }),
        createMockAIQuery({ mentionsBrand: true, sentiment: "MIXED" }),
        createMockAIQuery({ mentionsBrand: false, sentiment: "POSITIVE" }),
      ];
      const result = calculateShareOfVoice(responses, []);
      expect(result.sentimentBreakdown.positive).toBe(1);
      expect(result.sentimentBreakdown.negative).toBe(1);
      expect(result.sentimentBreakdown.neutral).toBe(1);
      expect(result.sentimentBreakdown.mixed).toBe(1);
    });
  });

  describe("calculateCombinedVisibilityScore", () => {
    it("calculates weighted average correctly", () => {
      // 60% web + 40% AI
      expect(calculateCombinedVisibilityScore(100, 0)).toBe(60);
      expect(calculateCombinedVisibilityScore(0, 100)).toBe(40);
      expect(calculateCombinedVisibilityScore(50, 50)).toBe(50);
      expect(calculateCombinedVisibilityScore(100, 100)).toBe(100);
    });

    it("handles edge cases", () => {
      expect(calculateCombinedVisibilityScore(0, 0)).toBe(0);
      expect(calculateCombinedVisibilityScore(75, 25)).toBe(55);
    });
  });
});
