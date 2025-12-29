# NexusPipe Codebase Analysis

## Executive Summary

NexusPipe is a well-architected Next.js 15 application using modern React patterns, tRPC for type-safe APIs, and a robust pipeline architecture. The codebase is clean, modular, and well-positioned for the addition of AI platform querying and Share of Voice features.

## Tech Stack Analysis

### Frontend
- **Framework:** Next.js 15 with App Router and React Server Components
- **UI Library:** Tailwind CSS + shadcn/ui (Radix primitives)
- **State Management:** Zustand + TanStack Query (React Query)
- **Forms:** React Hook Form + Zod validation
- **API Client:** tRPC for type-safe client-server communication

### Backend
- **API Layer:** tRPC with Next.js API routes
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Clerk (user management and auth)
- **External Services:**
  - **Exa AI:** Neural search for source discovery
  - **Firecrawl:** Web scraping and content extraction
  - **OpenAI GPT-4:** Content analysis and synthesis
  - **OpenAI GPT-4.1:** Insights generation

### Infrastructure
- **Testing:** Jest (unit) + Playwright (E2E)
- **Monitoring:** Sentry for error tracking
- **Deployment:** Vercel-ready (Next.js native)

## Architecture Overview

### Data Flow

```
User Input (Brand, Query, Competitors)
    ↓
Pipeline Processor (4 stages)
    ↓
1. DISCOVERING → Exa AI neural search
    ↓
2. INGESTING → Firecrawl scraping (with URL caching)
    ↓
3. SYNTHESIZING → GPT-4 analysis (brand mentions, sentiment)
    ↓
4. COMPLETED → Results dashboard
```

### Database Schema

**Core Models:**
- `User` - Clerk-managed users
- `Audit` - Main audit entity with status tracking
- `Competitor` - Related competitors for comparison
- `Source` - Discovered sources with scrape status
- `AuditLog` - Audit progress logging
- `UrlCache` - Cached scraped content for reuse

**Key Fields:**
- `Audit.status`: PENDING → DISCOVERING → INGESTING → SYNTHESIZING → COMPLETED/FAILED
- `Audit.depth`: QUICK (25) | STANDARD (50) | DEEP (100) sources
- `Source.mentionsBrand`: Boolean flag for brand presence
- `Source.mentionsCompetitors`: Array of competitor names
- `Source.sentiment`: POSITIVE | NEUTRAL | MIXED

### Pipeline Architecture

The pipeline is **stateful and resumable**, processing audits in chunks:

1. **startPipeline()** - Initiates discovery phase
2. **processNextChunk()** - Called repeatedly by client to advance pipeline
3. **processIngestion()** - Scrapes sources in batches (10 at a time)
4. **processSynthesis()** - Analyzes sources in batches (10 at a time)

**Key Design Decisions:**
- Batch processing prevents timeout issues
- URL caching reduces redundant scraping
- Status tracking enables progress display
- Error handling allows partial completion

### Service Layer

Located in `src/server/services/`:

- **exa.ts** - Neural search via Exa AI
- **firecrawl.ts** - Web scraping service
- **scraper.ts** - Unified scraping interface (supports multiple providers)
- **synthesis.ts** - GPT-4 content analysis
- **insights.ts** - GPT-4.1 insights generation
- **metrics.ts** - Visibility index calculation
- **url-cache.ts** - URL caching logic

### Component Structure

Located in `src/components/audit/`:

- **audit-form.tsx** - Create/edit audit form
- **results-dashboard.tsx** - Main results display (4 metric cards + tables)
- **sources-table.tsx** - Detailed source listing
- **insights-panel.tsx** - AI-generated insights
- **run-tracker.tsx** - Real-time progress tracking
- **edit-audit-dialog.tsx** - Edit and rerun functionality

## Current Feature Gaps (Mapped to Code)

### 1. No Direct AI Platform Querying

**Current Approach:**
- Uses Exa AI to find web sources
- Scrapes those sources
- Analyzes if brand is mentioned in sources

**Missing:**
- No direct API calls to ChatGPT, Perplexity, Claude, Gemini
- Cannot show actual AI responses
- Relies on proxy indicators (web sources) rather than real AI behavior

**Where to Add:**
- New service: `src/server/services/ai-platforms.ts`
- New router: `src/server/trpc/routers/ai-platforms.ts`
- New component: `src/components/audit/ai-platform-responses.tsx`

### 2. No Share of Voice Calculation

**Current Metrics:**
- Visibility Index: `(sources mentioning brand / total sources) × 100`
- Sentiment breakdown: Count of POSITIVE/NEUTRAL/MIXED
- Citation gaps: Sources mentioning competitors but not brand

**Missing:**
- Share of Voice: `(brand mentions / total brand mentions) × 100`
- Competitive SOV comparison
- SOV by platform
- SOV trending over time

**Where to Add:**
- Update: `src/server/services/metrics.ts` (add SOV calculation)
- Update: `src/server/trpc/routers/audit.ts` (add SOV to results)
- Update: `src/components/audit/results-dashboard.tsx` (add SOV card)
- New component: `src/components/audit/share-of-voice-chart.tsx`

### 3. Limited Historical Tracking

**Current Approach:**
- Audits are saved with timestamps
- Can compare manually across audits
- No automated trending

**Missing:**
- Automated trend analysis
- Historical SOV tracking
- Progress dashboards

**Where to Add:**
- New router: `src/server/trpc/routers/trends.ts`
- New page: `src/app/audit/[id]/trends/page.tsx`
- New component: `src/components/audit/trends-chart.tsx`

## Strengths of Current Architecture

### 1. Excellent Foundation for Extension

The modular service architecture makes it easy to add new AI platform integrations:

```typescript
// Pattern already established in services/
export async function queryAIPlatform(
  platform: 'chatgpt' | 'perplexity' | 'claude',
  query: string
): Promise<AIResponse> {
  // Similar pattern to exa.ts and firecrawl.ts
}
```

### 2. Type-Safe API Layer

tRPC ensures end-to-end type safety, making feature additions safe:

```typescript
// Adding new endpoints is straightforward
export const aiPlatformRouter = createTRPCRouter({
  queryPlatforms: protectedProcedure
    .input(z.object({ query: z.string(), platforms: z.array(...) }))
    .mutation(async ({ input }) => {
      // Implementation
    }),
});
```

### 3. Reusable UI Components

shadcn/ui components are already in place for new features:
- Cards, tables, charts (via existing patterns)
- Progress indicators, badges, tooltips
- Forms and dialogs

### 4. Robust Error Handling

The pipeline already handles:
- Partial failures (some sources fail to scrape)
- Resumable processing
- Error logging

This pattern can extend to AI platform queries.

### 5. Caching Strategy

URL caching pattern can extend to AI responses:

```typescript
// Similar to UrlCache model
model AIPlatformCache {
  id        String   @id @default(cuid())
  query     String
  platform  String
  response  String   @db.Text
  queriedAt DateTime @default(now())
  @@unique([query, platform])
}
```

## Implementation Recommendations

### Phase 1: Add AI Platform Querying Service

**New File:** `src/server/services/ai-platforms.ts`

```typescript
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
// ... other platform SDKs

export interface AIPlatformResponse {
  platform: 'chatgpt' | 'perplexity' | 'claude' | 'gemini' | 'google-ai';
  query: string;
  response: string;
  mentionsBrand: boolean;
  brandPosition: number | null; // 1st, 2nd, 3rd mention
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'MIXED' | null;
  timestamp: Date;
}

export async function queryAllPlatforms(
  query: string,
  brandName: string,
  platforms: string[]
): Promise<AIPlatformResponse[]> {
  const promises = platforms.map(platform => 
    queryPlatform(platform, query, brandName)
  );
  return Promise.all(promises);
}

async function queryPlatform(
  platform: string,
  query: string,
  brandName: string
): Promise<AIPlatformResponse> {
  // Platform-specific implementation
  // Use existing OpenAI client pattern from synthesis.ts
}
```

**Integration Points:**
1. Add to `src/server/trpc/routers/ai-platforms.ts`
2. Call from new component `src/components/audit/ai-platform-tester.tsx`
3. Store results in new `AIPlatformQuery` model

### Phase 2: Extend Database Schema

**Add to:** `prisma/schema.prisma`

```prisma
model AIPlatformQuery {
  id               String   @id @default(cuid())
  auditId          String
  audit            Audit    @relation(fields: [auditId], references: [id])
  query            String
  platform         String   // 'chatgpt', 'perplexity', etc.
  response         String   @db.Text
  mentionsBrand    Boolean
  brandPosition    Int?
  sentiment        Sentiment?
  competitorsMentioned String[]
  createdAt        DateTime @default(now())
  
  @@index([auditId])
  @@index([auditId, platform])
}

// Add relation to Audit model
model Audit {
  // ... existing fields
  aiPlatformQueries AIPlatformQuery[]
}
```

### Phase 3: Add Share of Voice Calculation

**Update:** `src/server/services/metrics.ts`

```typescript
export interface ShareOfVoiceResult {
  brandSOV: number; // Percentage
  competitorSOV: Record<string, number>; // competitor name -> percentage
  totalMentions: number;
  brandMentions: number;
}

export function calculateShareOfVoice(
  sources: Source[],
  brandName: string,
  competitors: string[]
): ShareOfVoiceResult {
  let brandMentions = 0;
  const competitorMentions: Record<string, number> = {};
  
  for (const source of sources) {
    if (source.mentionsBrand) brandMentions++;
    
    for (const comp of source.mentionsCompetitors) {
      competitorMentions[comp] = (competitorMentions[comp] || 0) + 1;
    }
  }
  
  const totalMentions = brandMentions + 
    Object.values(competitorMentions).reduce((a, b) => a + b, 0);
  
  const brandSOV = totalMentions > 0 
    ? (brandMentions / totalMentions) * 100 
    : 0;
  
  const competitorSOV: Record<string, number> = {};
  for (const [comp, mentions] of Object.entries(competitorMentions)) {
    competitorSOV[comp] = totalMentions > 0 
      ? (mentions / totalMentions) * 100 
      : 0;
  }
  
  return {
    brandSOV,
    competitorSOV,
    totalMentions,
    brandMentions,
  };
}
```

### Phase 4: Update Results Dashboard

**Update:** `src/components/audit/results-dashboard.tsx`

Add new metric card after Visibility Index:

```typescript
{/* Share of Voice - NEW */}
<Card className="border-primary/50">
  <CardHeader className="pb-2">
    <div className="flex items-center justify-between">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        Share of Voice
      </CardTitle>
      <Badge variant="secondary">NEW</Badge>
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
  </CardContent>
</Card>
```

### Phase 5: Add SOV Breakdown Chart

**New File:** `src/components/audit/share-of-voice-chart.tsx`

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ShareOfVoiceChartProps {
  brandName: string;
  brandSOV: number;
  competitorSOV: Record<string, number>;
}

export function ShareOfVoiceChart({ 
  brandName, 
  brandSOV, 
  competitorSOV 
}: ShareOfVoiceChartProps) {
  const brands = [
    { name: brandName, sov: brandSOV, color: 'bg-teal-500' },
    ...Object.entries(competitorSOV).map(([name, sov], i) => ({
      name,
      sov,
      color: ['bg-blue-500', 'bg-purple-500', 'bg-orange-500'][i] || 'bg-gray-500'
    }))
  ];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Share of Voice Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your brand vs competitors across AI platforms
        </p>
      </CardHeader>
      <CardContent>
        {/* Horizontal stacked bar chart */}
        <div className="space-y-4">
          {['ChatGPT', 'Perplexity', 'Claude', 'Gemini', 'Google AI'].map(platform => (
            <div key={platform} className="space-y-2">
              <div className="text-sm font-medium">{platform}</div>
              <div className="flex h-8 w-full overflow-hidden rounded-md">
                {brands.map(brand => (
                  <div
                    key={brand.name}
                    className={brand.color}
                    style={{ width: `${brand.sov}%` }}
                    title={`${brand.name}: ${brand.sov.toFixed(1)}%`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3">
          {brands.map(brand => (
            <div key={brand.name} className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded ${brand.color}`} />
              <span className="text-sm">{brand.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Phase 6: Add AI Platform Response Viewer

**New File:** `src/components/audit/ai-platform-responses.tsx`

```typescript
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

import { trpc } from "@/lib/trpc/client";

interface AIPlatformResponsesProps {
  auditId: string;
  query: string;
  brandName: string;
}

export function AIPlatformResponses({ 
  auditId, 
  query, 
  brandName 
}: AIPlatformResponsesProps) {
  const [selectedPlatform, setSelectedPlatform] = useState('chatgpt');
  
  const { data, isLoading, refetch } = trpc.aiPlatforms.getResponses.useQuery({
    auditId,
    query,
  });
  
  const queryMutation = trpc.aiPlatforms.queryPlatforms.useMutation({
    onSuccess: () => refetch(),
  });
  
  const handleQuery = () => {
    queryMutation.mutate({
      auditId,
      query,
      platforms: ['chatgpt', 'perplexity', 'claude', 'gemini', 'google-ai'],
    });
  };
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>AI Platform Responses</CardTitle>
          <Button onClick={handleQuery} disabled={queryMutation.isPending}>
            {queryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Query
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Real-time brand mentions across AI engines
        </p>
      </CardHeader>
      <CardContent>
        {/* Platform summary cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {['ChatGPT', 'Perplexity', 'Claude', 'Gemini', 'Google AI'].map(platform => {
            const response = data?.find(r => r.platform === platform.toLowerCase());
            return (
              <Card key={platform}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-sm font-medium mb-2">{platform}</div>
                    {response?.mentionsBrand ? (
                      <CheckCircle className="h-6 w-6 text-green-500 mx-auto" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-500 mx-auto" />
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                      {response?.mentionsBrand ? 'Mentioned' : 'Not mentioned'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Detailed responses */}
        <Tabs value={selectedPlatform} onValueChange={setSelectedPlatform}>
          <TabsList>
            {data?.map(response => (
              <TabsTrigger key={response.platform} value={response.platform}>
                {response.platform}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {data?.map(response => (
            <TabsContent key={response.platform} value={response.platform}>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{response.response}</p>
                </div>
                
                <div className="flex gap-4">
                  <div>
                    <span className="text-sm font-medium">Brand Mentioned: </span>
                    <Badge variant={response.mentionsBrand ? "default" : "destructive"}>
                      {response.mentionsBrand ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  
                  {response.brandPosition && (
                    <div>
                      <span className="text-sm font-medium">Position: </span>
                      <Badge variant="secondary">{response.brandPosition} mention</Badge>
                    </div>
                  )}
                  
                  {response.sentiment && (
                    <div>
                      <span className="text-sm font-medium">Sentiment: </span>
                      <Badge variant="outline">{response.sentiment}</Badge>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
```

## Testing Strategy

### Unit Tests (Jest)

Add tests for new services:

```typescript
// src/server/services/ai-platforms.test.ts
describe('AI Platform Querying', () => {
  it('should query ChatGPT successfully', async () => {
    const response = await queryPlatform('chatgpt', 'test query', 'TestBrand');
    expect(response.platform).toBe('chatgpt');
    expect(response.response).toBeDefined();
  });
  
  it('should detect brand mentions', async () => {
    const response = await queryPlatform('chatgpt', 'What is TestBrand?', 'TestBrand');
    expect(response.mentionsBrand).toBe(true);
  });
});

// src/server/services/metrics.test.ts
describe('Share of Voice Calculation', () => {
  it('should calculate SOV correctly', () => {
    const sources = [
      { mentionsBrand: true, mentionsCompetitors: ['CompA'] },
      { mentionsBrand: false, mentionsCompetitors: ['CompA', 'CompB'] },
      { mentionsBrand: true, mentionsCompetitors: [] },
    ];
    
    const result = calculateShareOfVoice(sources, 'Brand', ['CompA', 'CompB']);
    expect(result.brandSOV).toBe(40); // 2 out of 5 total mentions
  });
});
```

### E2E Tests (Playwright)

Add tests for new UI:

```typescript
// e2e/ai-platform-responses.spec.ts
test('should display AI platform responses', async ({ page }) => {
  await page.goto('/audit/test-audit-id');
  await page.click('text=AI Platform Responses');
  
  await expect(page.locator('text=ChatGPT')).toBeVisible();
  await expect(page.locator('text=Perplexity')).toBeVisible();
  
  await page.click('button:has-text("Test Query")');
  await expect(page.locator('text=Mentioned')).toBeVisible();
});
```

## Deployment Considerations

### Environment Variables

Add to `.env.local`:

```env
# Existing
OPENAI_API_KEY="sk-..."
EXA_API_KEY="..."
FIRECRAWL_API_KEY="fc-..."

# New - AI Platform APIs
ANTHROPIC_API_KEY="sk-ant-..."
PERPLEXITY_API_KEY="pplx-..."
GOOGLE_AI_API_KEY="..."
```

### API Rate Limits

Implement rate limiting for AI platform queries:

```typescript
// src/server/services/rate-limiter.ts
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  async checkLimit(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const recentRequests = requests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      return false; // Rate limit exceeded
    }
    
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    return true;
  }
}
```

### Cost Management

AI platform queries can be expensive. Implement:

1. **Query caching** (similar to URL caching)
2. **User quotas** (limit queries per user per month)
3. **Batch processing** (don't query all platforms for every audit)

## Migration Path

### Step 1: Database Migration

```bash
# Add new models
pnpm prisma:migrate

# Generate Prisma client
pnpm prisma:generate
```

### Step 2: Backend Implementation

1. Add AI platform service
2. Add tRPC routers
3. Update metrics calculation
4. Add tests

### Step 3: Frontend Implementation

1. Add new components
2. Update results dashboard
3. Add new pages (AI Platform Responses, SOV Trends)
4. Add tests

### Step 4: Gradual Rollout

1. **Beta flag:** Add feature flag to enable for select users
2. **Monitor costs:** Track API usage and costs
3. **Gather feedback:** Iterate based on user feedback
4. **Full release:** Enable for all users

## Conclusion

The NexusPipe codebase is well-structured and ready for the addition of AI platform querying and Share of Voice features. The modular architecture, type-safe API layer, and existing patterns make implementation straightforward.

**Key Strengths:**
- Clean separation of concerns (services, routers, components)
- Reusable patterns (pipeline processing, caching, error handling)
- Robust testing infrastructure
- Modern tech stack with excellent DX

**Recommended Approach:**
1. Start with AI platform service (Phase 1)
2. Extend database schema (Phase 2)
3. Add SOV calculation (Phase 3)
4. Update UI incrementally (Phases 4-6)
5. Deploy with feature flags and monitoring

**Estimated Timeline:**
- Phase 1-2: 1-2 weeks (backend foundation)
- Phase 3-4: 1 week (SOV metrics)
- Phase 5-6: 2-3 weeks (UI components)
- Testing & refinement: 1 week
- **Total: 5-7 weeks** for full implementation

The existing codebase quality significantly reduces implementation risk and accelerates development.
