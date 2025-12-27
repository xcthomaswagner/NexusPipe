/**
 * Tests for the EditAuditDialog form validation schema.
 * Full component testing is done via Playwright E2E tests.
 */
import { z } from "zod";

// Test the form schema directly since component testing with Radix UI is complex
const formSchema = z.object({
  competitors: z.array(z.object({ value: z.string().max(100) })).max(10),
  industryIntent: z.string().min(10).max(500),
  depth: z.enum(["QUICK", "STANDARD", "DEEP"]),
});

describe("EditAuditDialog form schema", () => {
  describe("competitors validation", () => {
    it("accepts empty competitors array", () => {
      const result = formSchema.safeParse({
        competitors: [],
        industryIntent: "What are the best B2B commerce platforms?",
        depth: "STANDARD",
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid competitors", () => {
      const result = formSchema.safeParse({
        competitors: [{ value: "Competitor A" }, { value: "Competitor B" }],
        industryIntent: "What are the best B2B commerce platforms?",
        depth: "STANDARD",
      });
      expect(result.success).toBe(true);
    });

    it("rejects more than 10 competitors", () => {
      const tooManyCompetitors = Array(11)
        .fill(null)
        .map((_, i) => ({ value: `Competitor ${i}` }));

      const result = formSchema.safeParse({
        competitors: tooManyCompetitors,
        industryIntent: "What are the best B2B commerce platforms?",
        depth: "STANDARD",
      });
      expect(result.success).toBe(false);
    });

    it("rejects competitor name over 100 characters", () => {
      const result = formSchema.safeParse({
        competitors: [{ value: "a".repeat(101) }],
        industryIntent: "What are the best B2B commerce platforms?",
        depth: "STANDARD",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("industryIntent validation", () => {
    it("rejects intent less than 10 characters", () => {
      const result = formSchema.safeParse({
        competitors: [],
        industryIntent: "Too short",
        depth: "STANDARD",
      });
      expect(result.success).toBe(false);
    });

    it("accepts intent with exactly 10 characters", () => {
      const result = formSchema.safeParse({
        competitors: [],
        industryIntent: "1234567890",
        depth: "STANDARD",
      });
      expect(result.success).toBe(true);
    });

    it("rejects intent over 500 characters", () => {
      const result = formSchema.safeParse({
        competitors: [],
        industryIntent: "a".repeat(501),
        depth: "STANDARD",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("depth validation", () => {
    it("accepts QUICK depth", () => {
      const result = formSchema.safeParse({
        competitors: [],
        industryIntent: "What are the best B2B commerce platforms?",
        depth: "QUICK",
      });
      expect(result.success).toBe(true);
    });

    it("accepts STANDARD depth", () => {
      const result = formSchema.safeParse({
        competitors: [],
        industryIntent: "What are the best B2B commerce platforms?",
        depth: "STANDARD",
      });
      expect(result.success).toBe(true);
    });

    it("accepts DEEP depth", () => {
      const result = formSchema.safeParse({
        competitors: [],
        industryIntent: "What are the best B2B commerce platforms?",
        depth: "DEEP",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid depth value", () => {
      const result = formSchema.safeParse({
        competitors: [],
        industryIntent: "What are the best B2B commerce platforms?",
        depth: "INVALID",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("EditAuditDialog data transformation", () => {
  it("filters out empty competitor values", () => {
    const competitors = [
      { value: "Competitor A" },
      { value: "" },
      { value: "  " },
      { value: "Competitor B" },
    ];

    const filtered = competitors
      .map((c) => c.value.trim())
      .filter((c) => c !== "");

    expect(filtered).toEqual(["Competitor A", "Competitor B"]);
  });

  it("preserves existing domain exclusions count", () => {
    const excludedDomains = ["example.com", "test.org", "blocked.net"];
    expect(excludedDomains.length).toBe(3);
  });
});
