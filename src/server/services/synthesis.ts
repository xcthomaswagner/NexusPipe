import OpenAI from "openai";
import { z } from "zod";

import { env } from "@/server/env";

import type { Sentiment } from "@/lib/validation/audit";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const MAX_CONTENT_LENGTH = 20000; // Max chars to send to LLM
const CONTEXT_WINDOW = 500; // Chars around each mention to include

/**
 * Smart truncation that preserves brand/competitor mention contexts.
 * Takes intro + sections around each mention to ensure LLM sees relevant content.
 */
function smartTruncate(
  markdown: string,
  brandName: string,
  competitors: string[]
): string {
  if (markdown.length <= MAX_CONTENT_LENGTH) {
    return markdown;
  }

  const terms = [brandName, ...competitors];
  const lowerMarkdown = markdown.toLowerCase();

  // Find all mention positions
  const mentionRanges: Array<{ start: number; end: number }> = [];
  for (const term of terms) {
    const lowerTerm = term.toLowerCase();
    let searchStart = 0;
    while (true) {
      const idx = lowerMarkdown.indexOf(lowerTerm, searchStart);
      if (idx === -1) break;
      mentionRanges.push({
        start: Math.max(0, idx - CONTEXT_WINDOW),
        end: Math.min(markdown.length, idx + term.length + CONTEXT_WINDOW),
      });
      searchStart = idx + 1;
    }
  }

  // If no mentions found, just return truncated intro
  if (mentionRanges.length === 0) {
    return markdown.slice(0, MAX_CONTENT_LENGTH);
  }

  // Merge overlapping ranges
  mentionRanges.sort((a, b) => a.start - b.start);
  const mergedRanges: Array<{ start: number; end: number }> = [];
  for (const range of mentionRanges) {
    const last = mergedRanges[mergedRanges.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      mergedRanges.push({ ...range });
    }
  }

  // Build content: intro + mention sections
  const introLength = Math.min(5000, MAX_CONTENT_LENGTH / 2);
  let content = markdown.slice(0, introLength);
  let remainingBudget = MAX_CONTENT_LENGTH - content.length;

  // Add mention sections that don't overlap with intro
  for (const range of mergedRanges) {
    if (range.start >= introLength) {
      const section = markdown.slice(range.start, range.end);
      if (section.length <= remainingBudget) {
        content += "\n\n[...]\n\n" + section;
        remainingBudget -= section.length + 10;
      }
    }
  }

  return content;
}

// Schema for structured output from GPT analysis
const analysisResponseSchema = z.object({
  _verification_logic: z.string().optional(),
  is_ambiguous_match: z.boolean(),
  mentions_target_brand: z.boolean(),
  sentiment: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED"]).nullable(),
  competitors_mentioned: z.array(z.string()),
  relevant_quote: z.string().nullable(),
});

export interface AnalysisResult {
  mentionsBrand: boolean;
  mentionsCompetitors: string[];
  sentiment: Sentiment;
  mentionSnippet: string | null;
  isAmbiguousMatch: boolean;
}

/**
 * Case-insensitive check if text contains a term.
 * Uses multiple strategies to catch mentions in various contexts:
 * 1. Word boundary regex match (standard case)
 * 2. Substring search with flexible boundary checking (URLs, punctuation, etc.)
 */
function containsTerm(text: string, term: string): boolean {
  // Normalize inputs
  const normalizedText = text.toLowerCase();
  const normalizedTerm = term.trim().toLowerCase();

  if (!normalizedTerm) return false;

  // Strategy 1: Word boundary regex (fastest for standard cases)
  const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  if (regex.test(text)) {
    return true;
  }

  // Strategy 2: Check all substring occurrences with flexible boundaries
  // This catches cases like URLs (xcentium.com) or markdown formatting
  let searchStart = 0;
  while (true) {
    const index = normalizedText.indexOf(normalizedTerm, searchStart);
    if (index === -1) break;

    const charBefore = index > 0 ? normalizedText[index - 1] : ' ';
    const charAfter = index + normalizedTerm.length < normalizedText.length
      ? normalizedText[index + normalizedTerm.length]
      : ' ';

    // Accept if surrounded by any non-alphanumeric characters
    // This includes: spaces, punctuation, brackets, quotes, markdown chars, URL chars
    const isValidBoundaryBefore = !/[a-z0-9]/.test(charBefore);
    const isValidBoundaryAfter = !/[a-z0-9]/.test(charAfter);

    if (isValidBoundaryBefore && isValidBoundaryAfter) {
      return true;
    }

    // Move past this occurrence
    searchStart = index + 1;
  }

  return false;
}

/**
 * Analyzes a source's markdown content to extract:
 * - Whether the brand is mentioned (with entity disambiguation)
 * - Which competitors are mentioned
 * - Overall sentiment about the brand (if mentioned)
 * - A relevant quote justifying the sentiment
 * - Whether the match is ambiguous (homonym)
 */
export async function analyzeSource(
  markdown: string,
  brandName: string,
  competitors: string[],
  brandContext?: string | null
): Promise<AnalysisResult> {
  // Pre-check: reliable string-based detection (searches full content)
  const brandMentionedInText = containsTerm(markdown, brandName);
  const competitorsMentionedInText = competitors.filter((c) =>
    containsTerm(markdown, c)
  );

  // If no mentions at all, skip GPT analysis
  if (!brandMentionedInText && competitorsMentionedInText.length === 0) {
    return {
      mentionsBrand: false,
      mentionsCompetitors: [],
      sentiment: "NEUTRAL",
      mentionSnippet: null,
      isAmbiguousMatch: false,
    };
  }

  // Smart truncate markdown to preserve brand/competitor mentions
  const truncatedMarkdown = smartTruncate(markdown, brandName, competitors);

  // Build context string for disambiguation
  const contextHint = brandContext
    ? `(${brandContext})`
    : "(company/brand)";

  const analysisPrompt = `Role: You are an AI Analyst cleaning raw web scrape data.

TARGET BRAND: "${brandName}" ${contextHint}
COMPETITORS: ${competitors.length > 0 ? competitors.join(", ") : "None specified"}

RAW CONTENT:
${truncatedMarkdown}

INSTRUCTIONS:
1. ENTITY VERIFICATION: Determine if the text refers to the Target Brand specifically, or a generic word/homonym (e.g., "Apple" the fruit vs Apple the tech company, "Fender" the guitar brand vs a car fender).
2. NOISE FILTERING: Ignore mentions in navigation menus, footers, copyright notices, or generic ad widgets. Focus on the MAIN CONTENT.
3. SENTIMENT ANALYSIS: Analyze sentiment specifically toward the Target Brand.

DEFINITIONS:
- POSITIVE: Praised, recommended, featured as a top choice.
- NEGATIVE: Criticized, described as inferior, consumer complaints.
- NEUTRAL: Factual mention, pricing, availability, or passing reference.
- MIXED: Weighted pros and cons.

OUTPUT FORMAT:
Respond with a single valid JSON object:
{
  "_verification_logic": "string explaining: Is this the correct brand entity? Is it in main content?",
  "is_ambiguous_match": boolean (true if the word appears but refers to something else),
  "mentions_target_brand": boolean (true ONLY if correct entity in main content),
  "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED" | null,
  "competitors_mentioned": string[] (only from the provided list),
  "relevant_quote": "string (exact snippet justifying sentiment, max 100 chars)" | null
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a brand mention analyzer. Respond only with valid JSON. Be precise about entity disambiguation - distinguish between brand names and common words/homonyms.",
        },
        { role: "user", content: analysisPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const validated = analysisResponseSchema.parse(parsed);

    // Log verification logic for debugging
    if (validated._verification_logic) {
      console.log(`[Synthesis] ${brandName}: ${validated._verification_logic}`);
    }

    // Determine final brand mention status:
    // - If GPT says it's ambiguous, don't count as mention
    // - Otherwise, trust GPT's entity verification over simple string match
    const actuallyMentionsBrand = validated.is_ambiguous_match
      ? false
      : validated.mentions_target_brand;

    return {
      mentionsBrand: actuallyMentionsBrand,
      mentionsCompetitors: [
        ...new Set([...competitorsMentionedInText, ...validated.competitors_mentioned]),
      ],
      sentiment: validated.sentiment ?? "NEUTRAL",
      mentionSnippet: validated.relevant_quote,
      isAmbiguousMatch: validated.is_ambiguous_match,
    };
  } catch (error) {
    // Default to string-based detection if parsing fails
    console.error("[Synthesis] Analysis failed, falling back to string detection:", error);
    return {
      mentionsBrand: brandMentionedInText,
      mentionsCompetitors: competitorsMentionedInText,
      sentiment: "NEUTRAL",
      mentionSnippet: null,
      isAmbiguousMatch: false,
    };
  }
}

/**
 * Batch analyze multiple sources.
 * Processes in parallel for efficiency.
 */
export async function analyzeBatch(
  sources: Array<{
    id: string;
    markdown: string;
  }>,
  brandName: string,
  competitors: string[],
  brandContext?: string | null
): Promise<Map<string, AnalysisResult>> {
  const results = new Map<string, AnalysisResult>();

  const analyses = await Promise.all(
    sources.map(async (source) => {
      const result = await analyzeSource(source.markdown, brandName, competitors, brandContext);
      return { id: source.id, result };
    })
  );

  for (const { id, result } of analyses) {
    results.set(id, result);
  }

  return results;
}
