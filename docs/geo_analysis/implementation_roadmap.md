# NexusPipe Feature Implementation Roadmap
## AI Platform Querying & Share of Voice

**Date:** December 27, 2025  
**Target Completion:** 5-7 weeks  
**Priority:** Critical for competitive parity

---

## Overview

This roadmap provides step-by-step implementation guidance for adding the two most critical missing features to NexusPipe:

1. **Direct AI Platform Querying** - Query ChatGPT, Perplexity, Claude, Gemini, and Google AI directly
2. **Share of Voice Metrics** - Calculate and visualize competitive brand mention distribution

---

## Phase 1: Backend Foundation (Weeks 1-2)

### Task 1.1: Add AI Platform Service

**File:** `src/server/services/ai-platforms.ts`

```typescript
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/server/env';

export interface AIPlatformResponse {
  platform: 'chatgpt' | 'perplexity' | 'claude' | 'gemini' | 'google-ai';
  query: string;
  response: string;
  mentionsBrand: boolean;
  brandPosition: number | null;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'MIXED' | null;
  competitorsMentioned: string[];
  timestamp: Date;
}

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

/**
 * Query all selected AI platforms with the given query.
 */
export async function queryAllPlatforms(
  query: string,
  brandName: string,
  competitors: string[],
  platforms: string[]
): Promise<AIPlatformResponse[]> {
  const promises = platforms.map(platform =>
    queryPlatform(platform, query, brandName, competitors)
  );

  const results = await Promise.allSettled(promises);

  return results
    .filter((r): r is PromiseFulfilledResult<AIPlatformResponse> => r.status === 'fulfilled')
    .map(r => r.value);
}

/**
 * Query a single AI platform.
 */
async function queryPlatform(
  platform: string,
  query: string,
  brandName: string,
  competitors: string[]
): Promise<AIPlatformResponse> {
  let response: string;

  switch (platform) {
    case 'chatgpt':
      response = await queryChatGPT(query);
      break;
    case 'perplexity':
      response = await queryPerplexity(query);
      break;
    case 'claude':
      response = await queryClaude(query);
      break;
    case 'gemini':
      response = await queryGemini(query);
      break;
    case 'google-ai':
      response = await queryGoogleAI(query);
      break;
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }

  // Analyze the response for brand mentions
  const analysis = await analyzeResponse(response, brandName, competitors);

  return {
    platform: platform as AIPlatformResponse['platform'],
    query,
    response,
    ...analysis,
    timestamp: new Date(),
  };
}

/**
 * Query ChatGPT (GPT-4).
 */
async function queryChatGPT(query: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'user',
        content: query,
      },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  return completion.choices[0]?.message?.content ?? '';
}

/**
 * Query Perplexity AI.
 */
async function queryPerplexity(query: string): Promise<string> {
  // Perplexity uses OpenAI-compatible API
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-large-128k-online',
      messages: [
        {
          role: 'user',
          content: query,
        },
      ],
    }),
  });

  const data = await response.json();
  return data.choices[0]?.message?.content ?? '';
}

/**
 * Query Claude (Anthropic).
 */
async function queryClaude(query: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: query,
      },
    ],
  });

  const textContent = message.content.find(block => block.type === 'text');
  return textContent?.type === 'text' ? textContent.text : '';
}

/**
 * Query Google Gemini.
 */
async function queryGemini(query: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${env.GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: query,
              },
            ],
          },
        ],
      }),
    }
  );

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

/**
 * Query Google AI Overviews (via custom scraping or API if available).
 */
async function queryGoogleAI(query: string): Promise<string> {
  // This would require custom implementation
  // Could use Serper API or similar to get AI Overview snippets
  // For now, return placeholder
  return 'Google AI Overviews integration pending';
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
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'MIXED' | null;
  competitorsMentioned: string[];
}> {
  const analysisPrompt = `Analyze the following AI response for brand mentions.

Brand: ${brandName}
Competitors: ${competitors.join(', ')}

AI Response:
${response}

Provide analysis in JSON format:
{
  "mentionsBrand": boolean,
  "brandPosition": number or null (1 for first mention, 2 for second, etc.),
  "sentiment": "POSITIVE" | "NEUTRAL" | "MIXED" | null,
  "competitorsMentioned": string[]
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a brand mention analyzer. Respond only with valid JSON.',
      },
      {
        role: 'user',
        content: analysisPrompt,
      },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  const result = JSON.parse(completion.choices[0]?.message?.content ?? '{}');

  return {
    mentionsBrand: result.mentionsBrand ?? false,
    brandPosition: result.brandPosition ?? null,
    sentiment: result.sentiment ?? null,
    competitorsMentioned: result.competitorsMentioned ?? [],
  };
}
```

### Task 1.2: Update Environment Configuration

**File:** `src/server/env.ts`

Add validation for new API keys:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Existing
  OPENAI_API_KEY: z.string().min(1),
  EXA_API_KEY: z.string().min(1),
  FIRECRAWL_API_KEY: z.string().min(1),
  
  // New - AI Platform APIs
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  PERPLEXITY_API_KEY: z.string().min(1).optional(),
  GOOGLE_AI_API_KEY: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);
```

### Task 1.3: Extend Database Schema

**File:** `prisma/schema.prisma`

Add new models:

```prisma
model AIPlatformQuery {
  id                   String    @id @default(cuid())
  auditId              String
  audit                Audit     @relation(fields: [auditId], references: [id], onDelete: Cascade)
  query                String
  platform             String    // 'chatgpt', 'perplexity', 'claude', 'gemini', 'google-ai'
  response             String    @db.Text
  mentionsBrand        Boolean
  brandPosition        Int?
  sentiment            Sentiment?
  competitorsMentioned String[]
  createdAt            DateTime  @default(now())

  @@index([auditId])
  @@index([auditId, platform])
}

// Add to Audit model
model Audit {
  // ... existing fields
  aiPlatformQueries AIPlatformQuery[]
}

// Add query caching for cost management
model AIPlatformCache {
  id        String   @id @default(cuid())
  query     String
  platform  String
  response  String   @db.Text
  queriedAt DateTime @default(now())
  hitCount  Int      @default(0)

  @@unique([query, platform])
  @@index([queriedAt])
}
```

Run migration:

```bash
pnpm prisma:migrate
pnpm prisma:generate
```

### Task 1.4: Create tRPC Router

**File:** `src/server/trpc/routers/ai-platforms.ts`

```typescript
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc/trpc';
import { queryAllPlatforms } from '@/server/services/ai-platforms';
import { db } from '@/server/db';

export const aiPlatformsRouter = createTRPCRouter({
  /**
   * Query AI platforms and store results.
   */
  queryPlatforms: protectedProcedure
    .input(
      z.object({
        auditId: z.string(),
        query: z.string(),
        platforms: z.array(z.enum(['chatgpt', 'perplexity', 'claude', 'gemini', 'google-ai'])),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get audit details
      const audit = await db.audit.findUnique({
        where: { id: input.auditId, userId: ctx.userId },
        include: { competitors: true },
      });

      if (!audit) {
        throw new Error('Audit not found');
      }

      // Query platforms
      const responses = await queryAllPlatforms(
        input.query,
        audit.brandName,
        audit.competitors.map(c => c.name),
        input.platforms
      );

      // Store results
      await db.aIPlatformQuery.createMany({
        data: responses.map(response => ({
          auditId: input.auditId,
          query: input.query,
          platform: response.platform,
          response: response.response,
          mentionsBrand: response.mentionsBrand,
          brandPosition: response.brandPosition,
          sentiment: response.sentiment,
          competitorsMentioned: response.competitorsMentioned,
        })),
      });

      return responses;
    }),

  /**
   * Get AI platform responses for an audit.
   */
  getResponses: protectedProcedure
    .input(
      z.object({
        auditId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const responses = await db.aIPlatformQuery.findMany({
        where: {
          auditId: input.auditId,
          audit: {
            userId: ctx.userId,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return responses;
    }),

  /**
   * Get platform coverage summary.
   */
  getCoverage: protectedProcedure
    .input(
      z.object({
        auditId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const responses = await db.aIPlatformQuery.findMany({
        where: {
          auditId: input.auditId,
          audit: {
            userId: ctx.userId,
          },
        },
      });

      const platforms = ['chatgpt', 'perplexity', 'claude', 'gemini', 'google-ai'];
      const coverage = platforms.map(platform => {
        const platformResponses = responses.filter(r => r.platform === platform);
        const mentions = platformResponses.filter(r => r.mentionsBrand).length;
        const total = platformResponses.length;

        return {
          platform,
          mentions,
          total,
          percentage: total > 0 ? (mentions / total) * 100 : 0,
        };
      });

      return coverage;
    }),
});
```

**Update:** `src/server/trpc/routers/index.ts`

```typescript
import { aiPlatformsRouter } from './ai-platforms';

export const appRouter = createTRPCRouter({
  // ... existing routers
  aiPlatforms: aiPlatformsRouter,
});
```

---

## Phase 2: Share of Voice Calculation (Week 3)

### Task 2.1: Add SOV Calculation to Metrics Service

**Update:** `src/server/services/metrics.ts`

```typescript
import type { Source } from '@prisma/client';

export interface ShareOfVoiceResult {
  brandSOV: number;
  competitorSOV: Record<string, number>;
  totalMentions: number;
  brandMentions: number;
  rank: number;
}

/**
 * Calculate Share of Voice across sources.
 */
export function calculateShareOfVoice(
  sources: Source[],
  brandName: string,
  competitors: string[]
): ShareOfVoiceResult {
  let brandMentions = 0;
  const competitorMentions: Record<string, number> = {};

  // Initialize competitor counts
  for (const comp of competitors) {
    competitorMentions[comp] = 0;
  }

  // Count mentions
  for (const source of sources) {
    if (source.mentionsBrand) {
      brandMentions++;
    }

    for (const comp of source.mentionsCompetitors) {
      if (comp in competitorMentions) {
        competitorMentions[comp]++;
      }
    }
  }

  // Calculate total mentions
  const totalMentions =
    brandMentions + Object.values(competitorMentions).reduce((a, b) => a + b, 0);

  // Calculate SOV percentages
  const brandSOV = totalMentions > 0 ? (brandMentions / totalMentions) * 100 : 0;

  const competitorSOV: Record<string, number> = {};
  for (const [comp, mentions] of Object.entries(competitorMentions)) {
    competitorSOV[comp] = totalMentions > 0 ? (mentions / totalMentions) * 100 : 0;
  }

  // Calculate rank
  const allSOVs = [
    { name: brandName, sov: brandSOV },
    ...Object.entries(competitorSOV).map(([name, sov]) => ({ name, sov })),
  ].sort((a, b) => b.sov - a.sov);

  const rank = allSOVs.findIndex(item => item.name === brandName) + 1;

  return {
    brandSOV,
    competitorSOV,
    totalMentions,
    brandMentions,
    rank,
  };
}

/**
 * Calculate SOV by platform (for AI platform responses).
 */
export function calculateSOVByPlatform(
  queries: Array<{
    platform: string;
    mentionsBrand: boolean;
    competitorsMentioned: string[];
  }>,
  brandName: string,
  competitors: string[]
): Record<string, ShareOfVoiceResult> {
  const platforms = ['chatgpt', 'perplexity', 'claude', 'gemini', 'google-ai'];
  const result: Record<string, ShareOfVoiceResult> = {};

  for (const platform of platforms) {
    const platformQueries = queries.filter(q => q.platform === platform);

    let brandMentions = 0;
    const competitorMentions: Record<string, number> = {};

    for (const comp of competitors) {
      competitorMentions[comp] = 0;
    }

    for (const query of platformQueries) {
      if (query.mentionsBrand) {
        brandMentions++;
      }

      for (const comp of query.competitorsMentioned) {
        if (comp in competitorMentions) {
          competitorMentions[comp]++;
        }
      }
    }

    const totalMentions =
      brandMentions + Object.values(competitorMentions).reduce((a, b) => a + b, 0);

    const brandSOV = totalMentions > 0 ? (brandMentions / totalMentions) * 100 : 0;

    const competitorSOV: Record<string, number> = {};
    for (const [comp, mentions] of Object.entries(competitorMentions)) {
      competitorSOV[comp] = totalMentions > 0 ? (mentions / totalMentions) * 100 : 0;
    }

    const allSOVs = [
      { name: brandName, sov: brandSOV },
      ...Object.entries(competitorSOV).map(([name, sov]) => ({ name, sov })),
    ].sort((a, b) => b.sov - a.sov);

    const rank = allSOVs.findIndex(item => item.name === brandName) + 1;

    result[platform] = {
      brandSOV,
      competitorSOV,
      totalMentions,
      brandMentions,
      rank,
    };
  }

  return result;
}
```

### Task 2.2: Update Audit Results Router

**Update:** `src/server/trpc/routers/audit.ts`

Add SOV to results:

```typescript
getResults: protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input, ctx }) => {
    const audit = await db.audit.findUnique({
      where: { id: input.id, userId: ctx.userId },
      include: {
        sources: true,
        competitors: true,
      },
    });

    if (!audit) {
      throw new Error('Audit not found');
    }

    // Existing calculations
    const visibilityIndex = calculateVisibilityIndex(audit.sources);
    const sentimentBreakdown = calculateSentimentBreakdown(audit.sources);
    const citationGaps = calculateCitationGaps(audit.sources);

    // NEW: Share of Voice calculation
    const shareOfVoice = calculateShareOfVoice(
      audit.sources,
      audit.brandName,
      audit.competitors.map(c => c.name)
    );

    return {
      visibilityIndex,
      sentimentBreakdown,
      citationGaps,
      shareOfVoice, // NEW
      // ... other fields
    };
  }),
```

---

## Phase 3: Frontend Components (Weeks 4-6)

### Task 3.1: Update Results Dashboard

**Update:** `src/components/audit/results-dashboard.tsx`

Add SOV metric card after Visibility Index:

```typescript
{/* Share of Voice - NEW */}
<Card className="border-primary/50">
  <CardHeader className="pb-2">
    <div className="flex items-center justify-between">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        Share of Voice
      </CardTitle>
      <Badge variant="secondary" className="text-xs">NEW</Badge>
    </div>
  </CardHeader>
  <CardContent>
    <div className="flex items-baseline gap-2">
      <span className="text-4xl font-bold">
        {shareOfVoice.brandSOV.toFixed(1)}%
      </span>
      {shareOfVoice.brandSOV >= 25 ? (
        <TrendingUp className="h-5 w-5 text-green-500" />
      ) : (
        <TrendingDown className="h-5 w-5 text-amber-500" />
      )}
    </div>
    <p className="text-sm text-muted-foreground mt-1">
      vs competitors in AI responses
    </p>
    <p className="text-xs text-muted-foreground mt-2">
      Rank: #{shareOfVoice.rank} of {Object.keys(shareOfVoice.competitorSOV).length + 1}
    </p>
  </CardContent>
</Card>
```

### Task 3.2: Create SOV Breakdown Chart Component

**New File:** `src/components/audit/share-of-voice-chart.tsx`

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ShareOfVoiceChartProps {
  brandName: string;
  brandSOV: number;
  competitorSOV: Record<string, number>;
  platformSOV?: Record<string, { brandSOV: number; competitorSOV: Record<string, number> }>;
}

const BRAND_COLORS = [
  'bg-teal-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
];

export function ShareOfVoiceChart({
  brandName,
  brandSOV,
  competitorSOV,
  platformSOV,
}: ShareOfVoiceChartProps) {
  const brands = [
    { name: brandName, sov: brandSOV, color: BRAND_COLORS[0] },
    ...Object.entries(competitorSOV).map(([name, sov], i) => ({
      name,
      sov,
      color: BRAND_COLORS[(i + 1) % BRAND_COLORS.length],
    })),
  ];

  const platforms = platformSOV
    ? Object.keys(platformSOV)
    : ['Overall'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share of Voice Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your brand vs competitors across {platformSOV ? 'AI platforms' : 'all sources'}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stacked bar chart */}
        <div className="space-y-4">
          {platforms.map(platform => {
            const platformBrands = platformSOV
              ? [
                  {
                    name: brandName,
                    sov: platformSOV[platform].brandSOV,
                    color: BRAND_COLORS[0],
                  },
                  ...Object.entries(platformSOV[platform].competitorSOV).map(
                    ([name, sov], i) => ({
                      name,
                      sov,
                      color: BRAND_COLORS[(i + 1) % BRAND_COLORS.length],
                    })
                  ),
                ]
              : brands;

            return (
              <div key={platform} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium capitalize">
                    {platform.replace('-', ' ')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {platformBrands.reduce((sum, b) => sum + b.sov, 0).toFixed(0)}% total coverage
                  </div>
                </div>
                <div className="flex h-10 w-full overflow-hidden rounded-md border">
                  {platformBrands.map(brand => (
                    <div
                      key={brand.name}
                      className={`${brand.color} flex items-center justify-center text-xs font-medium text-white transition-all hover:opacity-80`}
                      style={{ width: `${brand.sov}%` }}
                      title={`${brand.name}: ${brand.sov.toFixed(1)}%`}
                    >
                      {brand.sov > 10 && `${brand.sov.toFixed(0)}%`}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          {brands.map(brand => (
            <div key={brand.name} className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded ${brand.color}`} />
              <span className="text-sm font-medium">{brand.name}</span>
              <span className="text-xs text-muted-foreground">
                {brand.sov.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>

        {/* Insight */}
        {brands.length > 1 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Insight:</strong>{' '}
              {brands[0].name === brandName
                ? `You lead with ${brandSOV.toFixed(1)}% share of voice. Maintain momentum with consistent content and outreach.`
                : `${brands[0].name} leads with ${brands[0].sov.toFixed(1)}% share of voice. Focus on high-authority sources to close the gap.`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Task 3.3: Create AI Platform Response Viewer

**New File:** `src/components/audit/ai-platform-responses.tsx`

```typescript
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/client";

interface AIPlatformResponsesProps {
  auditId: string;
  brandName: string;
}

const PLATFORMS = [
  { id: 'chatgpt', name: 'ChatGPT', color: 'bg-teal-500' },
  { id: 'perplexity', name: 'Perplexity', color: 'bg-blue-500' },
  { id: 'claude', name: 'Claude', color: 'bg-orange-500' },
  { id: 'gemini', name: 'Gemini', color: 'bg-purple-500' },
  { id: 'google-ai', name: 'Google AI', color: 'bg-green-500' },
];

export function AIPlatformResponses({ auditId, brandName }: AIPlatformResponsesProps) {
  const [selectedPlatform, setSelectedPlatform] = useState('chatgpt');
  const [query, setQuery] = useState('');

  const { data: responses, isLoading, refetch } = trpc.aiPlatforms.getResponses.useQuery({
    auditId,
  });

  const { data: coverage } = trpc.aiPlatforms.getCoverage.useQuery({
    auditId,
  });

  const queryMutation = trpc.aiPlatforms.queryPlatforms.useMutation({
    onSuccess: () => {
      toast.success('Query complete', {
        description: 'AI platform responses have been analyzed.',
      });
      refetch();
    },
    onError: (error) => {
      toast.error('Query failed', {
        description: error.message,
      });
    },
  });

  const handleQuery = () => {
    if (!query.trim()) {
      toast.error('Please enter a query');
      return;
    }

    queryMutation.mutate({
      auditId,
      query,
      platforms: PLATFORMS.map(p => p.id),
    });
  };

  return (
    <div className="space-y-6">
      {/* Query Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Platform Query Testing
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Test how AI engines respond to your industry queries
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter your query (e.g., 'What are the best CRM tools?')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md"
            />
            <Button onClick={handleQuery} disabled={queryMutation.isPending}>
              {queryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Query
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Platform Coverage Summary */}
      {coverage && (
        <div className="grid grid-cols-5 gap-4">
          {PLATFORMS.map(platform => {
            const platformCoverage = coverage.find(c => c.platform === platform.id);
            const percentage = platformCoverage?.percentage ?? 0;

            return (
              <Card key={platform.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedPlatform(platform.id)}>
                <CardContent className="pt-6">
                  <div className="text-center space-y-3">
                    <div className={`w-12 h-12 ${platform.color} rounded-full mx-auto flex items-center justify-center`}>
                      {percentage > 0 ? (
                        <CheckCircle className="h-6 w-6 text-white" />
                      ) : (
                        <XCircle className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{platform.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {platformCoverage?.mentions ?? 0}/{platformCoverage?.total ?? 0} queries
                      </div>
                      <div className="text-lg font-bold mt-2">
                        {percentage.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detailed Responses */}
      {responses && responses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Response Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <TabsList className="grid grid-cols-5 w-full">
                {PLATFORMS.map(platform => (
                  <TabsTrigger key={platform.id} value={platform.id}>
                    {platform.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {PLATFORMS.map(platform => {
                const platformResponses = responses.filter(r => r.platform === platform.id);

                return (
                  <TabsContent key={platform.id} value={platform.id} className="space-y-4">
                    {platformResponses.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No responses yet. Run a query to see results.
                      </div>
                    ) : (
                      platformResponses.map(response => (
                        <div key={response.id} className="space-y-4 p-4 border rounded-md">
                          <div className="text-sm font-medium text-muted-foreground">
                            Query: {response.query}
                          </div>

                          <div className="p-4 bg-muted rounded-md">
                            <p className="text-sm whitespace-pre-wrap">{response.response}</p>
                          </div>

                          <div className="flex flex-wrap gap-4">
                            <div>
                              <span className="text-sm font-medium">Brand Mentioned: </span>
                              <Badge variant={response.mentionsBrand ? "default" : "destructive"}>
                                {response.mentionsBrand ? 'Yes ✓' : 'No ✗'}
                              </Badge>
                            </div>

                            {response.brandPosition && (
                              <div>
                                <span className="text-sm font-medium">Position: </span>
                                <Badge variant="secondary">
                                  {response.brandPosition}{response.brandPosition === 1 ? 'st' : response.brandPosition === 2 ? 'nd' : response.brandPosition === 3 ? 'rd' : 'th'} mention
                                </Badge>
                              </div>
                            )}

                            {response.sentiment && (
                              <div>
                                <span className="text-sm font-medium">Sentiment: </span>
                                <Badge variant="outline">{response.sentiment}</Badge>
                              </div>
                            )}

                            {response.competitorsMentioned.length > 0 && (
                              <div>
                                <span className="text-sm font-medium">Competitors: </span>
                                {response.competitorsMentioned.map(comp => (
                                  <Badge key={comp} variant="secondary" className="ml-1">
                                    {comp}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### Task 3.4: Update Audit Detail Page

**Update:** `src/app/audit/[id]/page.tsx`

Add new tab for AI Platform Responses:

```typescript
<Tabs defaultValue="results">
  <TabsList>
    <TabsTrigger value="results">Results</TabsTrigger>
    <TabsTrigger value="sources">All Sources</TabsTrigger>
    <TabsTrigger value="ai-platforms">
      AI Platform Responses
      <Badge variant="secondary" className="ml-2">NEW</Badge>
    </TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>

  <TabsContent value="results">
    <ResultsDashboard auditId={params.id} />
    <ShareOfVoiceChart {...shareOfVoiceData} />
  </TabsContent>

  <TabsContent value="sources">
    <SourcesTable auditId={params.id} />
  </TabsContent>

  <TabsContent value="ai-platforms">
    <AIPlatformResponses auditId={params.id} brandName={audit.brandName} />
  </TabsContent>

  <TabsContent value="settings">
    <EditAuditDialog auditId={params.id} />
  </TabsContent>
</Tabs>
```

---

## Phase 4: Testing & Refinement (Week 7)

### Task 4.1: Unit Tests

```bash
pnpm test
```

### Task 4.2: E2E Tests

```bash
pnpm test:e2e
```

### Task 4.3: Manual Testing Checklist

- [ ] Query all AI platforms successfully
- [ ] Brand mention detection works accurately
- [ ] SOV calculation is correct
- [ ] UI displays all metrics properly
- [ ] Error handling works for failed queries
- [ ] Caching reduces redundant API calls
- [ ] Performance is acceptable (< 30s for full query)

---

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] API keys tested and working
- [ ] Rate limiting implemented
- [ ] Cost monitoring in place
- [ ] Error tracking (Sentry) configured
- [ ] Documentation updated
- [ ] User guide created

---

## Success Metrics

Track these metrics post-launch:

1. **Feature Adoption:**
   - % of users running AI platform queries
   - Average queries per user per week

2. **User Satisfaction:**
   - NPS score improvement
   - Feature feedback ratings

3. **Business Impact:**
   - User retention rate
   - Conversion rate (free → paid)
   - Competitive win rate

---

## Estimated Costs

**API Costs per Query (5 platforms):**
- ChatGPT (GPT-4): ~$0.03
- Perplexity: ~$0.01
- Claude: ~$0.02
- Gemini: ~$0.01
- Google AI: ~$0.01
- **Total: ~$0.08 per full query**

**Monthly Cost Estimate:**
- 100 users × 10 queries/month = 1,000 queries
- 1,000 × $0.08 = **$80/month**

Implement query quotas and caching to manage costs.

---

## Conclusion

This implementation roadmap provides a complete, step-by-step guide to adding AI platform querying and Share of Voice features to NexusPipe. The modular architecture and existing patterns make implementation straightforward, with an estimated timeline of 5-7 weeks for full deployment.

**Key Success Factors:**
1. Start with backend foundation
2. Test thoroughly at each phase
3. Implement cost controls early
4. Gather user feedback continuously
5. Iterate based on real usage data

With these features, NexusPipe will achieve competitive parity with market leaders while maintaining its unique strength in citation gap analysis.
