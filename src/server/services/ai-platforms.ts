import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";

import { env } from "@/server/env";
import { db } from "@/server/db";

export type AIPlatformId = "chatgpt" | "perplexity" | "claude" | "gemini";

export interface AIPlatformResponse {
  platform: AIPlatformId;
  query: string;
  response: string;
  mentionsBrand: boolean;
  brandPosition: number | null;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED" | null;
  competitorsMentioned: string[];
  timestamp: Date;
  fromCache: boolean;
}

export interface PlatformInfo {
  id: AIPlatformId;
  name: string;
  available: boolean;
}

const CACHE_TTL_DAYS = 7;

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const anthropic = env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  : null;

/**
 * Get available platforms based on configured API keys.
 */
export function getAvailablePlatforms(): PlatformInfo[] {
  return [
    { id: "chatgpt", name: "ChatGPT", available: true }, // Uses OpenAI key
    { id: "perplexity", name: "Perplexity", available: !!env.PERPLEXITY_API_KEY },
    { id: "claude", name: "Claude", available: !!env.ANTHROPIC_API_KEY },
    { id: "gemini", name: "Gemini", available: !!env.GOOGLE_AI_API_KEY },
  ];
}

/**
 * Hash a query for cache lookup.
 */
function hashQuery(query: string): string {
  return crypto.createHash("sha256").update(query.toLowerCase().trim()).digest("hex");
}

/**
 * Check cache for a query/platform combination.
 */
async function getCachedResponse(
  query: string,
  platform: AIPlatformId
): Promise<string | null> {
  const queryHash = hashQuery(query);
  const ttlDate = new Date();
  ttlDate.setDate(ttlDate.getDate() - CACHE_TTL_DAYS);

  const cached = await db.aIPlatformCache.findUnique({
    where: {
      queryHash_platform: { queryHash, platform },
    },
  });

  if (cached && cached.queriedAt > ttlDate) {
    // Update hit count
    await db.aIPlatformCache.update({
      where: { id: cached.id },
      data: { hitCount: cached.hitCount + 1 },
    });
    return cached.response;
  }

  return null;
}

/**
 * Store response in cache.
 */
async function cacheResponse(
  query: string,
  platform: AIPlatformId,
  response: string
): Promise<void> {
  const queryHash = hashQuery(query);

  await db.aIPlatformCache.upsert({
    where: {
      queryHash_platform: { queryHash, platform },
    },
    update: {
      response,
      queriedAt: new Date(),
    },
    create: {
      query,
      queryHash,
      platform,
      response,
    },
  });
}

/**
 * Query all selected AI platforms with the given query.
 */
export async function queryAllPlatforms(
  query: string,
  brandName: string,
  competitors: string[],
  platforms: AIPlatformId[],
  skipCache = false
): Promise<AIPlatformResponse[]> {
  const availablePlatforms = getAvailablePlatforms();

  // Filter to only available and selected platforms
  const validPlatforms = platforms.filter((p) =>
    availablePlatforms.find((ap) => ap.id === p && ap.available)
  );

  const promises = validPlatforms.map((platform) =>
    queryPlatform(platform, query, brandName, competitors, skipCache)
  );

  const results = await Promise.allSettled(promises);

  // Log any failed platform queries
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[AI Platform] ${validPlatforms[i]} failed:`, r.reason?.message || r.reason);
    }
  });

  return results
    .filter(
      (r): r is PromiseFulfilledResult<AIPlatformResponse> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);
}

/**
 * Query a single AI platform.
 */
async function queryPlatform(
  platform: AIPlatformId,
  query: string,
  brandName: string,
  competitors: string[],
  skipCache: boolean
): Promise<AIPlatformResponse> {
  // Check cache first
  if (!skipCache) {
    const cachedResponse = await getCachedResponse(query, platform);
    if (cachedResponse) {
      const analysis = await analyzeResponse(cachedResponse, brandName, competitors);
      return {
        platform,
        query,
        response: cachedResponse,
        ...analysis,
        timestamp: new Date(),
        fromCache: true,
      };
    }
  }

  let response: string;

  switch (platform) {
    case "chatgpt":
      response = await queryChatGPT(query);
      break;
    case "perplexity":
      response = await queryPerplexity(query);
      break;
    case "claude":
      response = await queryClaude(query);
      break;
    case "gemini":
      response = await queryGemini(query);
      break;
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }

  // Cache the response
  await cacheResponse(query, platform, response);

  // Analyze the response for brand mentions
  const analysis = await analyzeResponse(response, brandName, competitors);

  return {
    platform,
    query,
    response,
    ...analysis,
    timestamp: new Date(),
    fromCache: false,
  };
}

/**
 * Query ChatGPT (GPT-4).
 */
async function queryChatGPT(query: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: query }],
    temperature: 0.7,
    max_tokens: 1000,
  });

  return completion.choices[0]?.message?.content ?? "";
}

/**
 * Query Perplexity AI.
 */
async function queryPerplexity(query: string): Promise<string> {
  if (!env.PERPLEXITY_API_KEY) {
    throw new Error("Perplexity API key not configured");
  }

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [{ role: "user", content: query }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Query Claude (Anthropic).
 */
async function queryClaude(query: string): Promise<string> {
  if (!anthropic) {
    throw new Error("Anthropic API key not configured");
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{ role: "user", content: query }],
  });

  const textContent = message.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  return textContent?.text ?? "";
}

/**
 * Query Google Gemini.
 */
async function queryGemini(query: string): Promise<string> {
  if (!env.GOOGLE_AI_API_KEY) {
    throw new Error("Google AI API key not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GOOGLE_AI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: query }] }],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

/**
 * Analyze AI response for brand mentions using GPT-4.
 */
async function analyzeResponse(
  response: string,
  brandName: string,
  competitors: string[]
): Promise<{
  mentionsBrand: boolean;
  brandPosition: number | null;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED" | null;
  competitorsMentioned: string[];
}> {
  // First, do a quick string check
  const responseLower = response.toLowerCase();
  const brandLower = brandName.toLowerCase();
  const quickMentionCheck = responseLower.includes(brandLower);

  // Quick competitor check
  const quickCompetitorCheck = competitors.filter((c) =>
    responseLower.includes(c.toLowerCase())
  );

  // If no mentions at all, skip the AI analysis
  if (!quickMentionCheck && quickCompetitorCheck.length === 0) {
    return {
      mentionsBrand: false,
      brandPosition: null,
      sentiment: null,
      competitorsMentioned: [],
    };
  }

  // Use AI for detailed analysis
  const analysisPrompt = `Analyze the following AI response for brand presence and sentiment.

TARGET BRAND: ${brandName}
KNOWN COMPETITORS: ${competitors.length > 0 ? competitors.join(", ") : "None specified"}

AI RESPONSE TO ANALYZE:
${response}

INSTRUCTIONS:
1. Analyze the text for mentions of the Target Brand and Known Competitors.
2. Determine the sentiment specifically toward the Target Brand.
3. Identify the ordinal rank of the Target Brand (e.g., is it the 1st brand mentioned? 2nd?).

DEFINITIONS:
- POSITIVE: Brand is praised, recommended, or described as a "best" option.
- NEGATIVE: Brand is criticized, discouraged, or described as inferior.
- NEUTRAL: Brand is mentioned factually/passively without qualitative judgment.
- MIXED: Content contains both praise and criticism, or compares pros/cons evenly.

OUTPUT FORMAT:
Respond with a single valid JSON object containing:
- "_reasoning": A brief string explaining why you chose the specific sentiment and position.
- "mentionsBrand": boolean
- "brandPosition": integer or null (The ordinal rank of the Target Brand among ALL companies mentioned. 1 = first mentioned).
- "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED" | null
- "competitorsMentioned": string[] (List of KNOWN COMPETITORS that appear in the text. Do not list companies not in the input list.)`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a brand mention analyzer. Respond only with valid JSON. Be precise about brand mentions - only count actual references to the brand, not partial word matches.",
        },
        { role: "user", content: analysisPrompt },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0]?.message?.content ?? "{}");

    // Log reasoning for debugging (optional)
    if (result._reasoning) {
      console.log(`[AI Analysis] ${brandName}: ${result._reasoning}`);
    }

    return {
      mentionsBrand: result.mentionsBrand ?? quickMentionCheck,
      brandPosition: result.brandPosition ?? null,
      sentiment: result.sentiment ?? null,
      competitorsMentioned: result.competitorsMentioned ?? quickCompetitorCheck,
    };
  } catch {
    // Fallback to quick check results
    return {
      mentionsBrand: quickMentionCheck,
      brandPosition: null,
      sentiment: null,
      competitorsMentioned: quickCompetitorCheck,
    };
  }
}

/**
 * Get cache statistics for AI platform queries.
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  totalHits: number;
}> {
  const stats = await db.aIPlatformCache.aggregate({
    _count: true,
    _sum: { hitCount: true },
  });

  return {
    totalEntries: stats._count,
    totalHits: stats._sum.hitCount ?? 0,
  };
}
