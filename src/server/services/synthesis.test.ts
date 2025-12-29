// Test the containsTerm function by importing from the module
// Since containsTerm is private, we test it indirectly through analyzeSource
// or we can export it for testing

// For now, let's create a test file that tests the detection logic directly
// by replicating the containsTerm function

function containsTerm(text: string, term: string): boolean {
  const normalizedText = text.toLowerCase();
  const normalizedTerm = term.trim().toLowerCase();

  if (!normalizedTerm) return false;

  // Strategy 1: Word boundary regex
  const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  if (regex.test(text)) {
    return true;
  }

  // Strategy 2: Flexible boundary check
  let searchStart = 0;
  while (true) {
    const index = normalizedText.indexOf(normalizedTerm, searchStart);
    if (index === -1) break;

    const charBefore = index > 0 ? normalizedText[index - 1] : ' ';
    const charAfter = index + normalizedTerm.length < normalizedText.length
      ? normalizedText[index + normalizedTerm.length]
      : ' ';

    const isValidBoundaryBefore = !/[a-z0-9]/.test(charBefore);
    const isValidBoundaryAfter = !/[a-z0-9]/.test(charAfter);

    if (isValidBoundaryBefore && isValidBoundaryAfter) {
      return true;
    }

    searchStart = index + 1;
  }

  return false;
}

describe("containsTerm", () => {
  describe("standard word boundary cases", () => {
    it("finds brand in plain text", () => {
      expect(containsTerm("Learn about Xcentium and their services", "Xcentium")).toBe(true);
    });

    it("finds brand at start of text", () => {
      expect(containsTerm("Xcentium is a digital agency", "Xcentium")).toBe(true);
    });

    it("finds brand at end of text", () => {
      expect(containsTerm("The best agency is Xcentium", "Xcentium")).toBe(true);
    });

    it("is case insensitive", () => {
      expect(containsTerm("XCENTIUM is great", "xcentium")).toBe(true);
      expect(containsTerm("xcentium is great", "XCENTIUM")).toBe(true);
      expect(containsTerm("XCentium is great", "xcentium")).toBe(true);
    });
  });

  describe("punctuation boundary cases", () => {
    it("finds brand followed by comma", () => {
      expect(containsTerm("Companies like Xcentium, Verndale, and others", "Xcentium")).toBe(true);
    });

    it("finds brand followed by period", () => {
      expect(containsTerm("The leader is Xcentium.", "Xcentium")).toBe(true);
    });

    it("finds brand in parentheses", () => {
      expect(containsTerm("Agencies (like Xcentium) provide services", "Xcentium")).toBe(true);
    });

    it("finds brand in quotes", () => {
      expect(containsTerm('They recommend "Xcentium" for enterprise', "Xcentium")).toBe(true);
    });

    it("finds brand with apostrophe", () => {
      expect(containsTerm("Xcentium's approach is unique", "Xcentium")).toBe(true);
    });
  });

  describe("URL and domain cases", () => {
    it("finds brand in URL", () => {
      expect(containsTerm("Visit https://xcentium.com for more info", "xcentium")).toBe(true);
    });

    it("finds brand in domain", () => {
      expect(containsTerm("Their website xcentium.com has more details", "xcentium")).toBe(true);
    });

    it("finds brand in email", () => {
      expect(containsTerm("Contact info@xcentium.com", "xcentium")).toBe(true);
    });

    it("finds brand in subdomain", () => {
      expect(containsTerm("Visit blog.xcentium.com", "xcentium")).toBe(true);
    });
  });

  describe("markdown formatting cases", () => {
    it("finds brand in markdown link text", () => {
      expect(containsTerm("[Xcentium](https://xcentium.com)", "Xcentium")).toBe(true);
    });

    it("finds brand in markdown bold", () => {
      expect(containsTerm("The company **Xcentium** leads the market", "Xcentium")).toBe(true);
    });

    it("finds brand in markdown italic", () => {
      expect(containsTerm("The company *Xcentium* leads the market", "Xcentium")).toBe(true);
    });

    it("finds brand in markdown heading", () => {
      expect(containsTerm("## About Xcentium", "Xcentium")).toBe(true);
    });
  });

  describe("false positive prevention", () => {
    it("does not match partial words", () => {
      expect(containsTerm("The xcentiumsolutions company", "xcentium")).toBe(false);
    });

    it("does not match when embedded in longer word", () => {
      expect(containsTerm("prexcentiumpost", "xcentium")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles empty term", () => {
      expect(containsTerm("Some text", "")).toBe(false);
    });

    it("handles whitespace term", () => {
      expect(containsTerm("Some text", "   ")).toBe(false);
    });

    it("handles term with special regex characters", () => {
      expect(containsTerm("Use C++ for development", "C++")).toBe(true);
    });

    it("handles term at very end of text", () => {
      expect(containsTerm("The company is Xcentium", "Xcentium")).toBe(true);
    });

    it("handles multiple occurrences where first is invalid", () => {
      expect(containsTerm("prexcentiumpost but also Xcentium here", "xcentium")).toBe(true);
    });
  });

  describe("real-world scenarios", () => {
    it("finds competitor Verndale in text", () => {
      expect(containsTerm("Verndale and Xcentium are both Sitecore partners", "Verndale")).toBe(true);
      expect(containsTerm("Verndale and Xcentium are both Sitecore partners", "Xcentium")).toBe(true);
    });

    it("finds brand in complex markdown content", () => {
      const markdown = `
## Top Sitecore Partners

Here are the leading partners:

1. **Verndale** - Known for enterprise solutions
2. **Xcentium** - Digital transformation experts
3. Other agencies

Visit [Xcentium's website](https://xcentium.com) for more information.
      `;
      expect(containsTerm(markdown, "Xcentium")).toBe(true);
      expect(containsTerm(markdown, "Verndale")).toBe(true);
    });
  });
});
