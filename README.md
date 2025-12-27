# NexusPipe

**GEO (Generative Engine Optimization) Audit Tool** - Measure and improve your brand's visibility in AI-generated content.

## What is GEO?

Traditional SEO optimizes for search engine rankings. GEO optimizes for **AI visibility** - how often and how favorably AI systems (ChatGPT, Claude, Perplexity, etc.) mention your brand when answering industry-relevant questions.

NexusPipe audits your brand's presence across authoritative sources that AI models use for training and retrieval, identifying:

- **Visibility Index**: Percentage of relevant sources that mention your brand
- **Citation Gaps**: High-authority sources that mention competitors but not you
- **Sentiment Analysis**: How your brand is portrayed (positive, neutral, mixed)
- **Brand Mention Context**: Actual text snippets showing how your brand appears

## Features

### Core Audit Functionality
- **Brand Discovery**: Enter your brand, competitors, and an industry intent query
- **Source Discovery**: Uses Exa AI to find authoritative sources relevant to your industry
- **Content Ingestion**: Scrapes and caches source content via Firecrawl
- **AI Analysis**: Analyzes each source for brand mentions, competitor mentions, and sentiment
- **Real-time Progress**: Live tracking of audit stages (Discovering, Ingesting, Synthesizing, Complete)

### Results & Insights
- **Visibility Dashboard**: Key metrics at a glance
- **Citation Gap Analysis**: Prioritized list of opportunities where competitors appear but you don't
- **Brand Mentions Table**: Sources mentioning your brand with context snippets
- **AI-Powered Insights**: GPT-generated recommendations based on your audit data
- **Domain Exclusions**: Filter out irrelevant domains (e.g., job boards, locations with similar names)

### Audit Management
- **Edit & Rerun**: Modify competitors, industry intent, or scan depth and rerun
- **URL Caching**: Scraped content is cached for fast reruns and cross-audit efficiency
- **Multiple Depths**: Quick (25 sources), Standard (50), or Deep (100) analysis

## Tech Stack

- **Framework**: Next.js 15 (App Router, React Server Components)
- **API Layer**: tRPC
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: Clerk
- **UI**: Tailwind CSS + shadcn/ui + Radix primitives
- **AI Services**:
  - Exa AI (source discovery)
  - Firecrawl (web scraping)
  - OpenAI GPT-4 (content analysis)
  - OpenAI GPT-5.1 (insights generation)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL database (Supabase recommended)

### Environment Variables

Create a `.env.local` file:

```env
# Database
DATABASE_URL="postgresql://..."

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# AI Services
OPENAI_API_KEY="sk-..."
EXA_API_KEY="..."
FIRECRAWL_API_KEY="fc-..."
```

### Installation

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate

# Start development server
pnpm dev
```

### Running Tests

```bash
# Unit tests (Jest)
pnpm test

# E2E tests (Playwright)
pnpm test:e2e
```

## Project Structure

```
src/
├── app/                    # Next.js routes
│   ├── api/trpc/          # tRPC API handler
│   ├── audit/             # Audit pages (new, detail)
│   ├── dashboard/         # User dashboard
│   └── help/              # Help & documentation
├── components/
│   ├── audit/             # Audit-specific components
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── trpc/              # tRPC client setup
│   └── validation/        # Zod schemas
└── server/
    ├── pipeline/          # Audit processing pipeline
    ├── services/          # External API integrations
    └── trpc/routers/      # tRPC route definitions
```

## How It Works

1. **Create Audit**: User enters brand name, optional competitors, and an industry intent query (e.g., "What are the best CRM tools for mid-size companies?")

2. **Discovery Phase**: Exa AI searches for authoritative sources matching the intent query

3. **Ingestion Phase**: Firecrawl scrapes each source, converting to markdown. Results are cached for reuse.

4. **Synthesis Phase**: GPT-4 analyzes each source for:
   - Brand mentions (with context extraction)
   - Competitor mentions
   - Sentiment classification
   - Authority scoring

5. **Results**: Dashboard displays visibility metrics, citation gaps, and actionable insights

## Version History

### v1.0.0 (December 2025)
- Initial release
- Full audit pipeline (discovery, ingestion, synthesis)
- Visibility dashboard with key metrics
- Citation gap analysis
- Brand mention detection with context snippets
- AI-powered insights generation
- Domain exclusion management
- Edit & rerun functionality
- URL-level caching for performance
- Comprehensive test coverage

## License

Private - All rights reserved.
