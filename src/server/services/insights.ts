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
    NEUTRAL: number;
    MIXED: number;
  };
  citationGaps: Array<{
    title: string | null;
    url: string;
    authorityScore: number | null;
    mentionsCompetitors: string[];
  }>;
  brandMentions: Array<{
    title: string | null;
    url: string;
    authorityScore: number | null;
    sentiment: string | null;
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
 * Generate AI-powered insights for an audit using GPT-5.1
 */
export async function generateInsights(data: AuditData): Promise<InsightsResult> {
  const systemPrompt = `You are a GEO (Generative Engine Optimization) expert analyzing brand visibility in AI-relevant sources.
Your task is to provide actionable insights based on audit results.

Be direct, specific, and actionable. Avoid generic advice. Reference the actual data provided.
Use the brand name and competitor names in your analysis.
Focus on what the data reveals and what concrete actions would improve visibility.`;

  const userPrompt = `Analyze this GEO audit for "${data.brandName}":

**Audit Configuration:**
- Industry Intent Query: "${data.industryIntent}"
- Competitors: ${data.competitors.length > 0 ? data.competitors.join(", ") : "None specified"}

**Results:**
- Visibility Index: ${data.visibilityIndex.toFixed(1)}% (${data.analyzedSources} sources analyzed of ${data.totalSources} discovered)
- Sentiment: ${data.sentimentBreakdown.POSITIVE} positive, ${data.sentimentBreakdown.NEUTRAL} neutral, ${data.sentimentBreakdown.MIXED} mixed

**Citation Gaps (${data.citationGaps.length} sources mention competitors but not ${data.brandName}):**
${data.citationGaps.slice(0, 5).map(g => `- ${g.title || g.url} (Authority: ${((g.authorityScore ?? 0) * 100).toFixed(0)}%) - mentions: ${g.mentionsCompetitors.join(", ")}`).join("\n") || "None"}

**Brand Mentions (${data.brandMentions.length} sources mention ${data.brandName}):**
${data.brandMentions.slice(0, 5).map(m => `- ${m.title || m.url} (Authority: ${((m.authorityScore ?? 0) * 100).toFixed(0)}%, Sentiment: ${m.sentiment})`).join("\n") || "None"}

Provide your analysis as JSON with this structure:
{
  "summary": "2-3 sentence executive summary of the audit results",
  "keyFindings": ["finding 1", "finding 2", "finding 3"],
  "recommendations": ["specific actionable recommendation 1", "recommendation 2", "recommendation 3"],
  "competitorAnalysis": "Brief analysis of how competitors compare in visibility",
  "nextSteps": ["immediate action 1", "action 2", "action 3"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.1-chat-latest",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
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
