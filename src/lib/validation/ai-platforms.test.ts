import {
  aiPlatformIdSchema,
  queryAIPlatformsSchema,
  getAIResponsesSchema,
  getShareOfVoiceSchema,
  updateAITestQueriesSchema,
} from "./ai-platforms";

describe("AI Platforms Validation", () => {
  describe("aiPlatformIdSchema", () => {
    it("accepts valid platform IDs", () => {
      expect(aiPlatformIdSchema.parse("chatgpt")).toBe("chatgpt");
      expect(aiPlatformIdSchema.parse("perplexity")).toBe("perplexity");
      expect(aiPlatformIdSchema.parse("claude")).toBe("claude");
      expect(aiPlatformIdSchema.parse("gemini")).toBe("gemini");
    });

    it("rejects invalid platform IDs", () => {
      expect(() => aiPlatformIdSchema.parse("invalid")).toThrow();
      expect(() => aiPlatformIdSchema.parse("")).toThrow();
      expect(() => aiPlatformIdSchema.parse(123)).toThrow();
    });
  });

  describe("queryAIPlatformsSchema", () => {
    const validInput = {
      auditId: "clz1234567890abcdefghij",
      queries: ["What is the best CRM?"],
      platforms: ["chatgpt"],
    };

    it("accepts valid input", () => {
      const result = queryAIPlatformsSchema.parse(validInput);
      expect(result.auditId).toBe(validInput.auditId);
      expect(result.queries).toEqual(validInput.queries);
      expect(result.platforms).toEqual(validInput.platforms);
      expect(result.skipCache).toBe(false);
    });

    it("accepts multiple queries and platforms", () => {
      const input = {
        auditId: "clz1234567890abcdefghij",
        queries: ["Query 1", "Query 2", "Query 3"],
        platforms: ["chatgpt", "claude", "gemini"],
      };
      const result = queryAIPlatformsSchema.parse(input);
      expect(result.queries).toHaveLength(3);
      expect(result.platforms).toHaveLength(3);
    });

    it("accepts skipCache option", () => {
      const result = queryAIPlatformsSchema.parse({
        ...validInput,
        skipCache: true,
      });
      expect(result.skipCache).toBe(true);
    });

    it("requires at least one query", () => {
      expect(() =>
        queryAIPlatformsSchema.parse({
          ...validInput,
          queries: [],
        })
      ).toThrow();
    });

    it("requires at least one platform", () => {
      expect(() =>
        queryAIPlatformsSchema.parse({
          ...validInput,
          platforms: [],
        })
      ).toThrow();
    });

    it("limits queries to 10", () => {
      const tooManyQueries = Array(11).fill("Query");
      expect(() =>
        queryAIPlatformsSchema.parse({
          ...validInput,
          queries: tooManyQueries,
        })
      ).toThrow();
    });

    it("limits platforms to 5", () => {
      const tooManyPlatforms = ["chatgpt", "claude", "gemini", "perplexity", "chatgpt", "invalid"];
      expect(() =>
        queryAIPlatformsSchema.parse({
          ...validInput,
          platforms: tooManyPlatforms,
        })
      ).toThrow();
    });

    it("validates query length", () => {
      expect(() =>
        queryAIPlatformsSchema.parse({
          ...validInput,
          queries: [""],
        })
      ).toThrow();

      const longQuery = "a".repeat(501);
      expect(() =>
        queryAIPlatformsSchema.parse({
          ...validInput,
          queries: [longQuery],
        })
      ).toThrow();
    });
  });

  describe("getAIResponsesSchema", () => {
    it("accepts valid input with defaults", () => {
      const result = getAIResponsesSchema.parse({
        auditId: "clz1234567890abcdefghij",
      });
      expect(result.auditId).toBeDefined();
      expect(result.limit).toBe(50);
      expect(result.platform).toBeUndefined();
    });

    it("accepts optional platform filter", () => {
      const result = getAIResponsesSchema.parse({
        auditId: "clz1234567890abcdefghij",
        platform: "chatgpt",
      });
      expect(result.platform).toBe("chatgpt");
    });

    it("accepts pagination options", () => {
      const result = getAIResponsesSchema.parse({
        auditId: "clz1234567890abcdefghij",
        limit: 25,
        cursor: "clz0987654321abcdefghij",
      });
      expect(result.limit).toBe(25);
      expect(result.cursor).toBeDefined();
    });
  });

  describe("getShareOfVoiceSchema", () => {
    it("accepts valid audit ID", () => {
      const result = getShareOfVoiceSchema.parse({
        auditId: "clz1234567890abcdefghij",
      });
      expect(result.auditId).toBeDefined();
    });

    it("requires valid CUID format", () => {
      expect(() =>
        getShareOfVoiceSchema.parse({
          auditId: "invalid-id",
        })
      ).toThrow();
    });
  });

  describe("updateAITestQueriesSchema", () => {
    it("accepts valid input", () => {
      const result = updateAITestQueriesSchema.parse({
        auditId: "clz1234567890abcdefghij",
        queries: ["Query 1", "Query 2"],
      });
      expect(result.queries).toHaveLength(2);
    });

    it("accepts empty queries array", () => {
      const result = updateAITestQueriesSchema.parse({
        auditId: "clz1234567890abcdefghij",
        queries: [],
      });
      expect(result.queries).toHaveLength(0);
    });

    it("limits to 20 queries", () => {
      const tooManyQueries = Array(21).fill("Query");
      expect(() =>
        updateAITestQueriesSchema.parse({
          auditId: "clz1234567890abcdefghij",
          queries: tooManyQueries,
        })
      ).toThrow();
    });
  });
});
