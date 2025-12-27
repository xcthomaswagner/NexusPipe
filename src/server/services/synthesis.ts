import OpenAI from "openai";
import { z } from "zod";

import { env } from "@/server/env";

import type { Sentiment } from "@/lib/validation/audit";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

// Schema for structured output
const analysisResponseSchema = z.object({
  mentionsBrand: z.boolean(),
  mentionsCompetitors: z.array(z.string()),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "MIXED"]),
});

export interface AnalysisResult {
  mentionsBrand: boolean;
  mentionsCompetitors: string[];
  sentiment: Sentiment;
}

/**
 * Case-insensitive check if text contains a term (word boundary aware).
 */
function containsTerm(text: string, term: string): boolean {
  // Escape regex special chars and create word-boundary pattern
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  return regex.test(text);
}

/**
 * Analyzes a source's markdown content to extract:
 * - Whether the brand is mentioned
 * - Which competitors are mentioned
 * - Overall sentiment about the brand (if mentioned) or the industry
 */
export async function analyzeSource(
  markdown: string,
  brandName: string,
  competitors: string[]
): Promise<AnalysisResult> {
  // Pre-check: reliable string-based detection (searches full content)
  const brandMentionedInText = containsTerm(markdown, brandName);
  const competitorsMentionedInText = competitors.filter((c) =>
    containsTerm(markdown, c)
  );

  // Truncate markdown for LLM analysis (for sentiment)
  const truncatedMarkdown = markdown.slice(0, 15000);

  const systemPrompt = `You are an AI analyst helping to evaluate brand visibility in web content.
Analyze the provided content and determine:
1. Whether the brand "${brandName}" is explicitly mentioned
2. Which of the following competitors are mentioned: ${competitors.join(", ")}
3. The overall sentiment - POSITIVE if the brand/industry is praised, NEGATIVE if criticized, NEUTRAL if factual, MIXED if both positive and negative

Return a JSON object with:
- mentionsBrand: boolean
- mentionsCompetitors: string[] (only include competitors that are actually mentioned)
- sentiment: "POSITIVE" | "NEUTRAL" | "MIXED"`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: truncatedMarkdown },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  const content = response.choices[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(content);
    const validated = analysisResponseSchema.parse(parsed);

    // Use string-based detection as ground truth (more reliable)
    // LLM can miss mentions due to truncation or errors
    // But trust LLM for sentiment analysis
    return {
      mentionsBrand: brandMentionedInText || validated.mentionsBrand,
      mentionsCompetitors: [
        ...new Set([...competitorsMentionedInText, ...validated.mentionsCompetitors]),
      ],
      sentiment: validated.sentiment,
    };
  } catch {
    // Default to string-based detection if parsing fails
    return {
      mentionsBrand: brandMentionedInText,
      mentionsCompetitors: competitorsMentionedInText,
      sentiment: "NEUTRAL",
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
  competitors: string[]
): Promise<Map<string, AnalysisResult>> {
  const results = new Map<string, AnalysisResult>();

  const analyses = await Promise.all(
    sources.map(async (source) => {
      const result = await analyzeSource(source.markdown, brandName, competitors);
      return { id: source.id, result };
    })
  );

  for (const { id, result } of analyses) {
    results.set(id, result);
  }

  return results;
}
