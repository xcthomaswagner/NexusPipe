/**
 * @jest-environment node
 */
import type { AuditData, InsightsResult } from "./insights";

// Mock the env module before importing anything else
jest.mock("@/server/env", () => ({
  env: {
    OPENAI_API_KEY: "test-key",
  },
}));

// Store mock function at module level
const mockCreate = jest.fn();

// Mock OpenAI module - use a factory function
jest.mock("openai", () => {
  return function OpenAIMock() {
    return {
      chat: {
        completions: {
          create: (...args: unknown[]) => mockCreate(...args),
        },
      },
    };
  };
});

// Import after mocks are set up
import { generateInsights } from "./insights";

const mockAuditData: AuditData = {
  brandName: "Acme Corp",
  competitors: ["Competitor A", "Competitor B"],
  industryIntent: "What are the best B2B commerce platforms?",
  visibilityIndex: 45.5,
  totalSources: 50,
  analyzedSources: 42,
  sentimentBreakdown: {
    POSITIVE: 10,
    NEUTRAL: 25,
    MIXED: 7,
  },
  citationGaps: [
    {
      title: "Top 10 B2B Platforms",
      url: "https://example.com/article",
      authorityScore: 0.85,
      mentionsCompetitors: ["Competitor A"],
    },
  ],
  brandMentions: [
    {
      title: "Acme Corp Review",
      url: "https://review.com/acme",
      authorityScore: 0.75,
      sentiment: "POSITIVE",
    },
  ],
};

describe("insights service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateInsights", () => {
    it("returns parsed insights on successful API call", async () => {
      const mockResponse: InsightsResult = {
        summary: "Acme Corp has moderate visibility in the market.",
        keyFindings: ["Finding 1", "Finding 2"],
        recommendations: ["Recommendation 1", "Recommendation 2"],
        competitorAnalysis: "Competitors have stronger presence.",
        nextSteps: ["Step 1", "Step 2"],
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockResponse),
            },
          },
        ],
      });

      const result = await generateInsights(mockAuditData);

      expect(result.summary).toBe(mockResponse.summary);
      expect(result.keyFindings).toEqual(mockResponse.keyFindings);
      expect(result.recommendations).toEqual(mockResponse.recommendations);
      expect(result.competitorAnalysis).toBe(mockResponse.competitorAnalysis);
      expect(result.nextSteps).toEqual(mockResponse.nextSteps);
    });

    it("calls OpenAI with correct model", async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ summary: "Test" }),
            },
          },
        ],
      });

      await generateInsights(mockAuditData);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-5.1-chat-latest",
          response_format: { type: "json_object" },
        })
      );
    });

    it("includes brand name in the prompt", async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ summary: "Test" }),
            },
          },
        ],
      });

      await generateInsights(mockAuditData);

      const call = mockCreate.mock.calls[0][0];
      const userMessage = call.messages.find(
        (m: { role: string }) => m.role === "user"
      );
      expect(userMessage.content).toContain("Acme Corp");
    });

    it("returns fallback values when API returns invalid JSON", async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: "not valid json",
            },
          },
        ],
      });

      const result = await generateInsights(mockAuditData);

      expect(result.summary).toBe(
        "Unable to generate insights. Please try again."
      );
      expect(result.keyFindings).toEqual([]);
      expect(result.recommendations).toEqual([]);
      expect(result.competitorAnalysis).toBe("");
      expect(result.nextSteps).toEqual([]);
    });

    it("returns fallback values when API returns empty content", async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      });

      const result = await generateInsights(mockAuditData);

      // When content is null, it defaults to "{}" which parses to empty object
      expect(result.summary).toBe("Unable to generate summary.");
    });

    it("handles partial response with missing fields", async () => {
      const partialResponse = {
        summary: "Partial summary",
        // Missing other fields
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(partialResponse),
            },
          },
        ],
      });

      const result = await generateInsights(mockAuditData);

      expect(result.summary).toBe("Partial summary");
      expect(result.keyFindings).toEqual([]);
      expect(result.recommendations).toEqual([]);
      expect(result.competitorAnalysis).toBe("");
      expect(result.nextSteps).toEqual([]);
    });

    it("handles audit data with no competitors", async () => {
      const dataWithNoCompetitors: AuditData = {
        ...mockAuditData,
        competitors: [],
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ summary: "Analysis without competitors." }),
            },
          },
        ],
      });

      const result = await generateInsights(dataWithNoCompetitors);

      expect(result.summary).toBe("Analysis without competitors.");
    });

    it("handles audit data with empty citation gaps", async () => {
      const dataWithNoGaps: AuditData = {
        ...mockAuditData,
        citationGaps: [],
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ summary: "No citation gaps found." }),
            },
          },
        ],
      });

      const result = await generateInsights(dataWithNoGaps);

      expect(result.summary).toBe("No citation gaps found.");
    });
  });
});
