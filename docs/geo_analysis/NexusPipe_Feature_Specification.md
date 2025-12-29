# NexusPipe Feature Specification: AI Platform Integration & Share of Voice

**Document Version:** 1.0  
**Date:** December 27, 2025  
**Author:** Manus AI

---

## 1. Introduction

This document provides a detailed technical specification for the implementation of two new cornerstone features for the NexusPipe application:

1.  **AI Platform Integration:** The ability to directly query major AI language models to assess brand representation in real-time.
2.  **Share of Voice (SOV) Metrics:** A new set of competitive metrics to quantify brand visibility against competitors within AI-generated content.

This specification details all required changes to the user interface, navigation, forms, and backend architecture. It builds upon the existing codebase, expanding its functionality while maintaining the established design language and user experience.

## 2. Core UI & Navigation Changes

The primary changes will be consolidated within the Audit Detail page (`/audit/[id]`). The goal is to seamlessly integrate the new data and functionality without disrupting the existing user flow.

### 2.1. Audit Detail Page Navigation

The main tab navigation on the audit detail page will be updated to include a new, dedicated tab for AI platform analysis. The existing "Insights" tab will be replaced by this more powerful and specific feature.

**Specification:**
-   Modify the `<TabsList>` component in `src/app/audit/[id]/page.tsx`.
-   Replace the "Insights" `<TabsTrigger>` with a new one for "AI Platform Responses".
-   This new tab should be placed between "All Sources" and "Settings".
-   A "NEW" badge should be added to the tab to draw user attention.

**Visual Mockup:**

![NexusPipe Audit Detail Navigation Tabs](/home/ubuntu/geo_analysis/spec_mockup_navigation_tabs.png)

### 2.2. Main Results Tab (`results`)

The main "Results" tab will be enhanced to provide an at-a-glance summary of the new AI-driven metrics. This is achieved by adding two new metric cards and a new summary section.

**Specification:**
-   Modify the `src/components/audit/results-dashboard.tsx` component.
-   **Add New Metric Cards:** Insert two new `<Card>` components into the main metrics grid:
    1.  **Share of Voice:** Displays the brand’s SOV percentage against competitors in AI responses. It should show a trend indicator (e.g., `+3.5%`) comparing it to the previous audit run.
    2.  **AI Platform Coverage:** Displays the number of queried AI platforms that mention the brand (e.g., "4/5 platforms"). This card should have a teal border and a "NEW" badge to highlight it.
-   **Add New Summary Section:** Below the main metric cards, add a new section titled **"AI Platform Performance"**.
    -   This section will contain a series of smaller cards, one for each AI platform queried, providing a summary of brand mention performance.

**Visual Mockup (Final Integrated View):**

![NexusPipe Integrated Results Dashboard](/home/ubuntu/upload/mockup_integrated_dashboard.png)

## 3. Feature Specification: AI Platform Integration

This feature allows users to define a set of queries, run them against major AI platforms, and analyze the responses for brand and competitor mentions.

### 3.1. Expanding the Audit Creation Form

To integrate this feature at the core of an audit, the "New GEO Audit" form must be expanded to capture the queries that will be tested against the AI platforms.

**Specification:**
-   Modify the `src/components/audit/audit-form.tsx` component.
-   Add a new form section below the "Industry Intent Query" section.
-   This section will use React Hook Form’s `useFieldArray` pattern, identical to the existing "Competitors" section, to allow users to add a dynamic list of queries.

**New Form Section Details:**
-   **Section Title:** "AI Test Queries"
-   **Description:** "Add up to 10 natural language questions that a user might ask an AI about your industry. These will be run against platforms like ChatGPT, Gemini, and others to track your brand’s visibility."
-   **Input Field:** A `<Textarea>` for each query to allow for longer, more natural questions.
-   **Functionality:** Users can add or remove query fields, with a maximum of 10.

**Implementation Strategy (`audit-form.tsx`):**
1.  Update the Zod `formSchema` to include `aiTestQueries: z.array(z.object({ value: z.string() })).max(10)`. 
2.  Add a new `useFieldArray` hook for `aiTestQueries`.
3.  Render the new field array using the same JSX structure as the `competitors` field array, but replacing `<Input>` with `<Textarea>`.
4.  Update the `onSubmit` function to transform and pass the `aiTestQueries` data to the `createAudit` mutation.

### 3.2. AI Platform Responses Tab

This new tab is the central hub for all AI query testing and analysis.

**Specification:**
-   Create a new component: `src/components/audit/ai-platform-responses.tsx`.
-   This component will be displayed when the "AI Platform Responses" tab is active.
-   It will contain two main sub-sections:
    1.  **On-the-Fly Query Testing:** A form for running new queries instantly.
    2.  **Response Analysis:** A detailed, tabbed view of the results from all queries run as part of the audit.

#### 3.2.1. On-the-Fly Query Form

This form allows for quick, interactive testing without needing to re-run the entire audit.

**Visual Mockup:**

![AI Platform Query Testing Form](/home/ubuntu/geo_analysis/spec_mockup_ai_query_form.png)

**Form Fields:**
-   **Test Query:** A text input for the query.
-   **Select AI Platforms:** A group of checkboxes allowing the user to select which AI platforms to query. Each option must display the official platform logo.
-   **Run Query Button:** A button to trigger the query.

#### 3.2.2. Logo Specifications

To ensure brand consistency and professional appearance, the following official logos and branding must be used. These logos should be sourced as SVG files for the best quality and scalability.

| Platform | Official Logo | Description |
| :--- | :--- | :--- |
| **ChatGPT** | ![ChatGPT Logo](https://raw.githubusercontent.com/devicons/devicon/master/icons/openai/openai-original.svg) | The circular, teal OpenAI logo. |
| **Perplexity** | ![Perplexity Logo](https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/perplexity.svg) | The blue magnifying glass icon. |
| **Claude** | ![Claude Logo](https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/anthropic.svg) | The abstract, orange/coral Anthropic logo. |
| **Gemini** | ![Gemini Logo](https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/googlegemini.svg) | The colorful, four-pointed star/sparkle icon. |
| **Google AI** | ![Google AI Logo](https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/google.svg) | The standard multi-color Google "G" logo. |

### 3.3. Implementation Strategy

**Backend (`src/server/`):**
1.  **Database:** Add the `AIPlatformQuery` and `AIPlatformCache` models to `prisma/schema.prisma` as detailed in the previous analysis.
2.  **New Service:** Create `services/ai-platforms.ts` to handle all communication with external AI APIs. It will contain a `queryAllPlatforms` function that dispatches requests in parallel.
3.  **New tRPC Router:** Create `trpc/routers/ai-platforms.ts` to expose the querying functionality to the frontend. It will have a `queryPlatforms` mutation and a `getResponses` query.

**Frontend (`src/components/`):**
1.  **New Component:** Build `audit/ai-platform-responses.tsx`. This component will manage the state for the on-the-fly query form and use the new tRPC hooks to fetch and display data.
2.  **Update Dashboard:** Modify `audit/results-dashboard.tsx` to fetch and display the summary data (SOV and AI Platform Coverage) and the `AI Platform Performance` cards.

## 4. Feature Specification: Share of Voice (SOV)

This feature provides a clear, top-level metric for competitive benchmarking within AI responses.

### 4.1. UI & Data Visualization

1.  **SOV Metric Card:** As specified in section 2.2, this card will be added to the main results dashboard, showing the overall SOV percentage.
2.  **SOV Breakdown Chart:** A new chart will be added to the "AI Platform Responses" tab to provide a more granular, per-platform view of the competitive landscape.

**Visual Mockup:**

![Share of Voice by Platform Chart](/home/ubuntu/geo_analysis/spec_mockup_sov_chart.png)

**Chart Specification:**
-   **Type:** Horizontal Stacked Bar Chart.
-   **Rows:** Each row represents a single AI platform, identified by its official logo.
-   **Bars:** Each bar is a stack of colored segments, where each segment represents a brand (the user's brand and its competitors). The width of the segment corresponds to that brand's SOV percentage on that platform.
-   **Legend:** A clear legend at the bottom maps colors to brand names.

### 4.2. Implementation Strategy

**Backend (`src/server/`):**
1.  **Metrics Service:** Update `services/metrics.ts` to include two new functions:
    -   `calculateShareOfVoice`: Calculates the overall SOV across all AI responses.
    -   `calculateSOVByPlatform`: Calculates the SOV for each individual AI platform, returning the data structure needed for the new chart.
2.  **tRPC Router:** Update the `getResults` procedure in `trpc/routers/audit.ts` to call these new metric functions and include their output in the data payload.

**Frontend (`src/components/`):**
1.  **New Component:** Create `audit/share-of-voice-chart.tsx`. This component will accept the SOV data as props and render the chart using either a library like `recharts` (if already in the project) or custom `div` elements with Tailwind CSS for a lightweight implementation.
2.  **Integration:** Place the new `<ShareOfVoiceChart />` component within the `ai-platform-responses.tsx` component, likely below the on-the-fly query form. 


## 5. Detailed Code Implementation

This section provides copy-paste-ready code examples for each major change, designed to integrate seamlessly with the existing codebase.

### 5.1. Database Schema Extension

**File:** `prisma/schema.prisma`

Add the following models to the schema:

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

Update the `Audit` model to include the new relation:

```prisma
model Audit {
  // ... existing fields
  aiPlatformQueries AIPlatformQuery[]
}
```

After making these changes, run:

```bash
pnpm prisma:migrate dev --name add_ai_platform_features
pnpm prisma:generate
```

### 5.2. Expanding the Audit Form

**File:** `src/components/audit/audit-form.tsx`

**Step 1:** Update the `formSchema`:

```typescript
const formSchema = z.object({
  brandName: z.string().min(1, "Brand name is required").max(100),
  competitors: z
    .array(z.object({ value: z.string().max(100) }))
    .max(10, "Maximum 10 competitors allowed"),
  industryIntent: z
    .string()
    .min(10, "Industry intent must be at least 10 characters")
    .max(500),
  depth: auditDepthSchema,
  // NEW: AI test queries
  aiTestQueries: z
    .array(z.object({ value: z.string().max(500) }))
    .max(10, "Maximum 10 test queries allowed")
    .optional(),
});
```

**Step 2:** Add a new `useFieldArray` hook after the existing one:

```typescript
const { fields: queryFields, append: appendQuery, remove: removeQuery } = useFieldArray({
  control: form.control,
  name: "aiTestQueries",
});
```

**Step 3:** Add the new form section in the JSX, after the `industryIntent` field:

```tsx
{/* AI Test Queries - NEW */}
<div className="space-y-4">
  <div className="flex items-center gap-1.5">
    <FormLabel>AI Test Queries</FormLabel>
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[280px]">
        <p>Optional. Add natural language questions to test how AI platforms respond. E.g., "What are the best CRM tools?"</p>
      </TooltipContent>
    </Tooltip>
    <Badge variant="secondary" className="ml-2">NEW</Badge>
  </div>
  <FormDescription>
    Add up to 10 queries to test against AI platforms like ChatGPT and Perplexity.
  </FormDescription>
  {queryFields.map((field, index) => (
    <div key={field.id} className="flex gap-2">
      <FormField
        control={form.control}
        name={`aiTestQueries.${index}.value`}
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormControl>
              <Textarea
                placeholder={`Query ${index + 1}: e.g., "What are the best tools for..."`}
                className="min-h-[80px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {queryFields.length > 1 && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => removeQuery(index)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  ))}
  {queryFields.length < 10 && (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => appendQuery({ value: "" })}
    >
      <Plus className="mr-2 h-4 w-4" />
      Add Query
    </Button>
  )}
</div>
```

**Step 4:** Update the `onSubmit` function:

```typescript
const onSubmit = (data: FormValues) => {
  const competitors = data.competitors
    .map((c) => c.value.trim())
    .filter((c) => c !== "");
  
  // NEW: Transform AI test queries
  const aiTestQueries = data.aiTestQueries
    ? data.aiTestQueries
        .map((q) => q.value.trim())
        .filter((q) => q !== "")
    : [];

  setIsSubmitting(true);
  createAudit.mutate({
    brandName: data.brandName,
    competitors,
    industryIntent: data.industryIntent,
    depth: data.depth,
    aiTestQueries, // NEW
  });
};
```

### 5.3. Updating the Navigation Tabs

**File:** `src/app/audit/[id]/page.tsx`

Replace the existing `<TabsList>` with the following:

```tsx
<TabsList className="mb-6">
  <TabsTrigger value="results">Results</TabsTrigger>
  <TabsTrigger value="sources">All Sources</TabsTrigger>
  <TabsTrigger value="ai-platforms">
    AI Platform Responses
    <Badge variant="secondary" className="ml-2 text-xs">NEW</Badge>
  </TabsTrigger>
  <TabsTrigger value="settings">
    <Settings className="mr-1 h-4 w-4" />
    Settings
  </TabsTrigger>
</TabsList>
```

Add the new tab content:

```tsx
<TabsContent value="ai-platforms">
  <AIPlatformResponses auditId={id} brandName={audit.brandName} />
</TabsContent>
```

Import the new component at the top:

```typescript
import { AIPlatformResponses } from "@/components/audit/ai-platform-responses";
```

### 5.4. Creating the AI Platform Responses Component

**File:** `src/components/audit/ai-platform-responses.tsx`

```typescript
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { ShareOfVoiceChart } from "./share-of-voice-chart";

interface AIPlatformResponsesProps {
  auditId: string;
  brandName: string;
}

const PLATFORMS = [
  { id: 'chatgpt', name: 'ChatGPT', logo: '/logos/openai.svg' },
  { id: 'perplexity', name: 'Perplexity', logo: '/logos/perplexity.svg' },
  { id: 'claude', name: 'Claude', logo: '/logos/anthropic.svg' },
  { id: 'gemini', name: 'Gemini', logo: '/logos/gemini.svg' },
  { id: 'google-ai', name: 'Google AI', logo: '/logos/google.svg' },
];

export function AIPlatformResponses({ auditId, brandName }: AIPlatformResponsesProps) {
  const [query, setQuery] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    PLATFORMS.map(p => p.id)
  );

  const { data: responses, isLoading, refetch } = trpc.aiPlatforms.getResponses.useQuery({
    auditId,
  });

  const { data: coverage } = trpc.aiPlatforms.getCoverage.useQuery({
    auditId,
  });

  const { data: sovData } = trpc.aiPlatforms.getShareOfVoice.useQuery({
    auditId,
  });

  const queryMutation = trpc.aiPlatforms.queryPlatforms.useMutation({
    onSuccess: () => {
      toast.success('Query complete', {
        description: 'AI platform responses have been analyzed.',
      });
      setQuery('');
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
    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform');
      return;
    }

    queryMutation.mutate({
      auditId,
      query: query.trim(),
      platforms: selectedPlatforms,
    });
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  return (
    <div className="space-y-6">
      {/* On-the-Fly Query Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Platform Query Testing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Test Query</label>
            <Textarea
              placeholder="e.g., What are the best CRM tools for enterprise?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-3 block">Select AI Platforms</label>
            <div className="space-y-2">
              {PLATFORMS.map(platform => (
                <div
                  key={platform.id}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 cursor-pointer"
                  onClick={() => togglePlatform(platform.id)}
                >
                  <div className="flex items-center gap-3">
                    <img src={platform.logo} alt={platform.name} className="h-8 w-8" />
                    <span className="font-medium">{platform.name}</span>
                  </div>
                  <Checkbox
                    checked={selectedPlatforms.includes(platform.id)}
                    onCheckedChange={() => togglePlatform(platform.id)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleQuery}
            disabled={queryMutation.isPending}
            className="w-full"
          >
            {queryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Query
          </Button>
        </CardContent>
      </Card>

      {/* Platform Coverage Summary */}
      {coverage && (
        <div className="grid grid-cols-5 gap-4">
          {PLATFORMS.map(platform => {
            const platformCoverage = coverage.find(c => c.platform === platform.id);
            const percentage = platformCoverage?.percentage ?? 0;

            return (
              <Card key={platform.id}>
                <CardContent className="pt-6">
                  <div className="text-center space-y-3">
                    <img
                      src={platform.logo}
                      alt={platform.name}
                      className="h-12 w-12 mx-auto"
                    />
                    <div>
                      <div className="text-sm font-medium">{platform.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Mentioned: {platformCoverage?.mentions ?? 0}/{platformCoverage?.total ?? 0} queries
                      </div>
                      <div className="text-2xl font-bold mt-2">
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

      {/* Share of Voice Chart */}
      {sovData && (
        <ShareOfVoiceChart
          brandName={brandName}
          brandSOV={sovData.brandSOV}
          competitorSOV={sovData.competitorSOV}
          platformSOV={sovData.platformSOV}
        />
      )}
    </div>
  );
}
```

### 5.5. Creating the Share of Voice Chart Component

**File:** `src/components/audit/share-of-voice-chart.tsx`

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const PLATFORMS = [
  { id: 'chatgpt', name: 'ChatGPT', logo: '/logos/openai.svg' },
  { id: 'perplexity', name: 'Perplexity', logo: '/logos/perplexity.svg' },
  { id: 'claude', name: 'Claude', logo: '/logos/anthropic.svg' },
  { id: 'gemini', name: 'Gemini', logo: '/logos/gemini.svg' },
  { id: 'google-ai', name: 'Google AI', logo: '/logos/google.svg' },
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share of Voice by Platform</CardTitle>
        <p className="text-sm text-muted-foreground">
          Brand distribution across AI platforms
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stacked bar chart */}
        <div className="space-y-4">
          {PLATFORMS.map(platform => {
            const platformBrands = platformSOV
              ? [
                  {
                    name: brandName,
                    sov: platformSOV[platform.id]?.brandSOV ?? 0,
                    color: BRAND_COLORS[0],
                  },
                  ...Object.entries(platformSOV[platform.id]?.competitorSOV ?? {}).map(
                    ([name, sov], i) => ({
                      name,
                      sov,
                      color: BRAND_COLORS[(i + 1) % BRAND_COLORS.length],
                    })
                  ),
                ]
              : brands;

            return (
              <div key={platform.id} className="space-y-2">
                <div className="flex items-center gap-3">
                  <img src={platform.logo} alt={platform.name} className="h-6 w-6" />
                  <div className="text-sm font-medium">{platform.name}</div>
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
      </CardContent>
    </Card>
  );
}
```

### 5.6. Updating the Results Dashboard

**File:** `src/components/audit/results-dashboard.tsx`

Add two new metric cards to the main grid (after the "Visibility Index" card):

```tsx
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
        {shareOfVoice?.brandSOV.toFixed(1) ?? '0.0'}%
      </span>
      {(shareOfVoice?.brandSOV ?? 0) >= 25 ? (
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

{/* AI Platform Coverage - NEW */}
<Card className="border-primary/50">
  <CardHeader className="pb-2">
    <div className="flex items-center justify-between">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        AI Platform Coverage
      </CardTitle>
      <Badge variant="secondary" className="text-xs">NEW</Badge>
    </div>
  </CardHeader>
  <CardContent>
    <div className="text-4xl font-bold">
      {aiPlatformCoverage?.mentionedCount ?? 0}/{aiPlatformCoverage?.totalCount ?? 5} platforms
    </div>
    <p className="text-sm text-muted-foreground mt-1">
      mention your brand
    </p>
  </CardContent>
</Card>
```

Add the new "AI Platform Performance" section after the main metric cards:

```tsx
{/* AI Platform Performance - NEW */}
{aiPlatformSummary && aiPlatformSummary.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle>AI Platform Performance</CardTitle>
      <p className="text-sm text-muted-foreground">
        Real-time brand mentions across AI engines
      </p>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-5 gap-4">
        {aiPlatformSummary.map(platform => (
          <div key={platform.id} className="text-center space-y-2">
            <img
              src={platform.logo}
              alt={platform.name}
              className="h-12 w-12 mx-auto"
            />
            <div className="text-sm font-medium">{platform.name}</div>
            <div className="text-xs text-muted-foreground">
              Mentioned: {platform.mentions}/{platform.total} queries
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-teal-500 h-2 rounded-full"
                style={{ width: `${platform.percentage}%` }}
              />
            </div>
            <div className="text-lg font-bold">{platform.percentage.toFixed(0)}%</div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-center">
        <Button variant="outline" size="sm" asChild>
          <a href="#ai-platforms">View Detailed Responses →</a>
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

Update the component's data fetching to include the new metrics:

```typescript
const { data, isLoading } = trpc.audit.getResults.useQuery({ id: auditId });

// Destructure the new data
const {
  visibilityIndex,
  sentimentBreakdown,
  citationGaps,
  stats,
  shareOfVoice, // NEW
  aiPlatformCoverage, // NEW
  aiPlatformSummary, // NEW
} = data ?? {};
```

## 6. Backend Implementation

### 6.1. AI Platform Service

**File:** `src/server/services/ai-platforms.ts`

This service is responsible for querying external AI APIs and analyzing the responses.

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
    messages: [{ role: 'user', content: query }],
    temperature: 0.7,
    max_tokens: 1000,
  });

  return completion.choices[0]?.message?.content ?? '';
}

/**
 * Query Perplexity AI.
 */
async function queryPerplexity(query: string): Promise<string> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-large-128k-online',
      messages: [{ role: 'user', content: query }],
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
    messages: [{ role: 'user', content: query }],
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: query }] }],
      }),
    }
  );

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

/**
 * Query Google AI Overviews (placeholder - requires custom implementation).
 */
async function queryGoogleAI(query: string): Promise<string> {
  // This would require custom implementation via Serper API or similar
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
      { role: 'user', content: analysisPrompt },
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

### 6.2. Share of Voice Metrics

**File:** `src/server/services/metrics.ts`

Add these new functions:

```typescript
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

  for (const comp of competitors) {
    competitorMentions[comp] = 0;
  }

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

  return {
    brandSOV,
    competitorSOV,
    totalMentions,
    brandMentions,
    rank,
  };
}
```

## 7. Testing & Quality Assurance

### 7.1. Unit Testing

Create test files for the new services:

**File:** `src/server/services/ai-platforms.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals';
import { queryAllPlatforms } from './ai-platforms';

describe('AI Platform Querying', () => {
  it('should query ChatGPT successfully', async () => {
    const responses = await queryAllPlatforms(
      'What are the best CRM tools?',
      'TestBrand',
      ['CompA', 'CompB'],
      ['chatgpt']
    );
    
    expect(responses).toHaveLength(1);
    expect(responses[0].platform).toBe('chatgpt');
    expect(responses[0].response).toBeDefined();
  });
});
```

### 7.2. Manual Testing Checklist

Before deployment, ensure the following scenarios work correctly:

- [ ] User can add AI test queries in the audit creation form
- [ ] User can navigate to the new "AI Platform Responses" tab
- [ ] User can run an on-the-fly query and see results
- [ ] Platform logos display correctly throughout the UI
- [ ] Share of Voice metrics calculate accurately
- [ ] SOV chart renders correctly with proper brand colors
- [ ] Error handling works for failed API calls
- [ ] Loading states display during query execution

## 8. Deployment Checklist

- [ ] Database migrations applied to production
- [ ] Environment variables configured (API keys for all platforms)
- [ ] Logo SVG files added to `/public/logos/` directory
- [ ] Rate limiting configured for AI platform queries
- [ ] Cost monitoring alerts set up
- [ ] Error tracking (Sentry) configured for new components
- [ ] User documentation updated
- [ ] Feature announcement prepared

## 9. Logo Asset Requirements

Create a `/public/logos/` directory and add the following SVG files:

- `openai.svg` - ChatGPT/OpenAI logo
- `perplexity.svg` - Perplexity logo
- `anthropic.svg` - Claude/Anthropic logo
- `gemini.svg` - Google Gemini logo
- `google.svg` - Google "G" logo

These can be sourced from the official brand asset pages or icon libraries like [Simple Icons](https://simpleicons.org/).

## 10. Conclusion

This specification provides a complete, implementation-ready plan for integrating AI Platform Responses and Share of Voice features into NexusPipe. By following the detailed code examples and maintaining the existing design patterns, the development team can implement these features efficiently while ensuring a seamless user experience.

The key to success is maintaining consistency with the existing codebase, using official platform logos, and thoroughly testing all new functionality before deployment.
