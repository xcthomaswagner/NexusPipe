import OpenAI from "openai";

import { env } from "@/server/env";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export interface AuditData {
  brandName: string;
  competitors: string[];
  industryIntent: string;
  visibilityIndex: number;
  totalSources: number;
  analyzedSources: number;
  sentimentBreakdown: {
    POSITIVE: number;
    NEGATIVE: number;
    NEUTRAL: number;
    MIXED: number;
  };
  citationGaps: Array<{
    title: string | null;
    url: string;
    authorityScore: number | null;
    mentionsCompetitors: string[];
    snippet: string | null; // Context snippet for better analysis
  }>;
  brandMentions: Array<{
    title: string | null;
    url: string;
    authorityScore: number | null;
    sentiment: string | null;
    snippet: string | null; // Context snippet for better analysis
  }>;
}

export interface InsightsResult {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  competitorAnalysis: string;
  nextSteps: string[];
}

/**
 * Format a citation gap with context for the LLM
 */
function formatCitationGap(gap: AuditData["citationGaps"][0]): string {
  const source = gap.title || new URL(gap.url).hostname;
  const authority = ((gap.authorityScore ?? 0) * 100).toFixed(0);
  const competitors = gap.mentionsCompetitors.join(", ");
  const context = gap.snippet ? `, Context: "${gap.snippet}"` : "";
  return `- Source: ${source} (Authority: ${authority}%), Competitors mentioned: ${competitors}${context}`;
}

/**
 * Format a brand mention with context for the LLM
 */
function formatBrandMention(mention: AuditData["brandMentions"][0]): string {
  const source = mention.title || new URL(mention.url).hostname;
  const authority = ((mention.authorityScore ?? 0) * 100).toFixed(0);
  const sentiment = mention.sentiment || "Unknown";
  const context = mention.snippet ? `, Context: "${mention.snippet}"` : "";
  return `- Source: ${source} (Authority: ${authority}%, Sentiment: ${sentiment})${context}`;
}

/**
 * Generate AI-powered insights for an audit using GPT-4o
 */
export async function generateInsights(data: AuditData): Promise<InsightsResult> {
  // Format lists with context for better analysis
  const citationGapsList = data.citationGaps.length > 0
    ? data.citationGaps.slice(0, 10).map(formatCitationGap).join("\n  ")
    : "None found";

  const brandMentionsList = data.brandMentions.length > 0
    ? data.brandMentions.slice(0, 10).map(formatBrandMention).join("\n  ")
    : "None found";

  const insightsPrompt = `Role: You are a Generative Engine Optimization (GEO) Architect.
Your goal is to reverse-engineer why AI models cite competitors instead of the user.

CONTEXT - GEO PRINCIPLES (Use these definitions in analysis):
- "Atomic Claim": A specific, claimable concept the brand should own (vs. generic expertise).
- "Gold Nuggets": Standalone facts/stats (<18 tokens) that AI models can extract.
- "Institution Shadow": When the company is cited, but no specific expert/product is credited.
- "Citation Gaps": High-authority sources where competitors appear, but the target brand is missing.

AUDIT DATA FOR "${data.brandName}":
- Target Query: "${data.industryIntent}"
- Visibility Index: ${data.visibilityIndex.toFixed(1)}%
- Sentiment Balance: ${data.sentimentBreakdown.POSITIVE} Pos / ${data.sentimentBreakdown.NEGATIVE} Neg / ${data.sentimentBreakdown.NEUTRAL} Neutral
- Competitors: ${data.competitors.length > 0 ? data.competitors.join(", ") : "None specified"}
- Sources Analyzed: ${data.analyzedSources} of ${data.totalSources} discovered

RAW EVIDENCE:
- CITATION GAPS (${data.citationGaps.length} sources - Competitors present, We are absent):
  ${citationGapsList}
- BRAND MENTIONS (${data.brandMentions.length} sources - Where we appear):
  ${brandMentionsList}

INSTRUCTIONS:
1. DIAGNOSE THE PATTERN: Look at the Citation Gaps. Are they technical docs, forums, or news? Is there a "Domain Mismatch" where competitors are in niche technical sources and we are only in general news?
2. EVALUATE EXTRACTABILITY: Do our current mentions contain "Gold Nuggets" (stats/facts), or are they just generic marketing fluff?
3. PRIORITIZE ACTIONS: Recommend "Atomic Claim" adjustments over general "content creation."

OUTPUT JSON:
{
  "summary": "2-3 sentences diagnosing the *root cause* of low visibility (e.g., 'Weak Gold Nuggets', 'Domain Mismatch').",
  "keyFindings": [
    "Specific observation about competitor structure vs. ours",
    "Observation about our citation quality (e.g. 'Mentions lack extractable stats')"
  ],
  "recommendations": [
    "Action using GEO terminology (e.g. 'Create Atomic Claim page for [Topic]')",
    "Specific source targeting (e.g. 'Target [Source Name] to close gap')"
  ],
  "competitorAnalysis": "How competitors structure their content to win these citations (e.g. 'Competitor X uses clear lists').",
  "nextSteps": ["Immediate technical fix", "Strategic content adjustment"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a GEO (Generative Engine Optimization) Architect. Respond only with valid JSON. Be specific and actionable, using GEO terminology.",
      },
      { role: "user", content: insightsPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(content) as InsightsResult;
    return {
      summary: parsed.summary || "Unable to generate summary.",
      keyFindings: parsed.keyFindings || [],
      recommendations: parsed.recommendations || [],
      competitorAnalysis: parsed.competitorAnalysis || "",
      nextSteps: parsed.nextSteps || [],
    };
  } catch {
    return {
      summary: "Unable to generate insights. Please try again.",
      keyFindings: [],
      recommendations: [],
      competitorAnalysis: "",
      nextSteps: [],
    };
  }
}
