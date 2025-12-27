import {
  extractMentionSnippets,
  getFirstMentionSnippet,
} from "./text-utils";

describe("text-utils", () => {
  describe("extractMentionSnippets", () => {
    it("returns empty array for null markdown", () => {
      expect(extractMentionSnippets(null, "BrandName")).toEqual([]);
    });

    it("returns empty array for undefined markdown", () => {
      expect(extractMentionSnippets(undefined, "BrandName")).toEqual([]);
    });

    it("returns empty array for empty brand name", () => {
      expect(extractMentionSnippets("Some content", "")).toEqual([]);
    });

    it("returns empty array when brand is not found", () => {
      const markdown = "This is some content without the brand mentioned.";
      expect(extractMentionSnippets(markdown, "Acme")).toEqual([]);
    });

    it("finds brand mention and extracts context", () => {
      const markdown =
        "The market for CRM tools is growing. Acme Corp has been leading the industry with innovative solutions.";
      const snippets = extractMentionSnippets(markdown, "Acme");

      expect(snippets).toHaveLength(1);
      expect(snippets[0]).toContain("Acme");
    });

    it("is case-insensitive when finding mentions", () => {
      const markdown = "Learn more about ACME CORP and their products.";
      const snippets = extractMentionSnippets(markdown, "acme");

      expect(snippets).toHaveLength(1);
      expect(snippets[0]).toContain("ACME");
    });

    it("finds multiple mentions", () => {
      const markdown =
        "First mention of Acme here. Some other content in between. Second mention of Acme there. More content. Third Acme mention.";
      const snippets = extractMentionSnippets(markdown, "Acme");

      expect(snippets.length).toBeGreaterThanOrEqual(2);
      expect(snippets.length).toBeLessThanOrEqual(3); // Limited to 3
    });

    it("adds ellipsis for truncated content", () => {
      const markdown =
        "This is a very long piece of content before the brand mention. Acme Corp is mentioned here. And then there is more content after.";
      const snippets = extractMentionSnippets(markdown, "Acme", 20);

      expect(snippets).toHaveLength(1);
      expect(snippets[0]).toMatch(/^\.\.\./);
      expect(snippets[0]).toMatch(/\.\.\.$/);
    });

    it("does not add leading ellipsis when at start of content", () => {
      const markdown = "Acme Corp is the leader in this space.";
      const snippets = extractMentionSnippets(markdown, "Acme");

      expect(snippets).toHaveLength(1);
      expect(snippets[0]).not.toMatch(/^\.\.\./);
    });

    it("does not add trailing ellipsis when at end of content", () => {
      const markdown = "The best solution is Acme";
      const snippets = extractMentionSnippets(markdown, "Acme");

      expect(snippets).toHaveLength(1);
      expect(snippets[0]).not.toMatch(/\.\.\.$/);
    });

    it("removes markdown headers from snippet", () => {
      const markdown = "## Best Tools\n\nAcme is a great choice for teams.";
      const snippets = extractMentionSnippets(markdown, "Acme");

      expect(snippets).toHaveLength(1);
      expect(snippets[0]).not.toContain("##");
    });

    it("removes bold/italic markdown from snippet", () => {
      const markdown = "The **Acme** solution is _amazing_.";
      const snippets = extractMentionSnippets(markdown, "Acme");

      expect(snippets).toHaveLength(1);
      expect(snippets[0]).not.toContain("**");
      expect(snippets[0]).not.toContain("_");
    });

    it("removes markdown links but keeps text", () => {
      const markdown =
        "Check out [Acme Corp](https://acme.com) for more info.";
      const snippets = extractMentionSnippets(markdown, "Acme");

      expect(snippets).toHaveLength(1);
      expect(snippets[0]).toContain("Acme Corp");
      expect(snippets[0]).not.toContain("https://");
    });

    it("handles brand names with spaces", () => {
      const markdown = "Brookfield Residential is a home builder.";
      const snippets = extractMentionSnippets(markdown, "Brookfield Residential");

      expect(snippets).toHaveLength(1);
      expect(snippets[0]).toContain("Brookfield Residential");
    });

    it("can distinguish false positives (location vs brand)", () => {
      const markdown =
        "The property is located in Brookfield, Wisconsin. It is near downtown.";
      const snippets = extractMentionSnippets(markdown, "Brookfield Residential");

      // Should not find "Brookfield Residential" since the content only mentions "Brookfield"
      expect(snippets).toHaveLength(0);
    });

    it("finds partial brand name matches", () => {
      const markdown =
        "The property is located in Brookfield, Wisconsin.";
      const snippets = extractMentionSnippets(markdown, "Brookfield");

      expect(snippets).toHaveLength(1);
      expect(snippets[0]).toContain("Brookfield");
    });
  });

  describe("getFirstMentionSnippet", () => {
    it("returns null for no matches", () => {
      expect(getFirstMentionSnippet("Some content", "NotFound")).toBeNull();
    });

    it("returns null for null markdown", () => {
      expect(getFirstMentionSnippet(null, "Brand")).toBeNull();
    });

    it("returns only the first snippet", () => {
      const markdown =
        "First Acme mention. Second Acme mention. Third Acme mention.";
      const snippet = getFirstMentionSnippet(markdown, "Acme");

      expect(snippet).not.toBeNull();
      expect(snippet).toContain("Acme");
    });

    it("respects custom context length", () => {
      const markdown =
        "This is a long prefix before Acme and a long suffix after it.";
      const shortSnippet = getFirstMentionSnippet(markdown, "Acme", 10);
      const longSnippet = getFirstMentionSnippet(markdown, "Acme", 50);

      expect(shortSnippet).not.toBeNull();
      expect(longSnippet).not.toBeNull();
      expect(longSnippet!.length).toBeGreaterThan(shortSnippet!.length);
    });
  });
});
