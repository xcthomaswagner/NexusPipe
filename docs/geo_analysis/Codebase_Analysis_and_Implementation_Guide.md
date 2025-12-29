# NexusPipe: Codebase Analysis & Implementation Guide

**Date:** December 27, 2025  
**Author:** Manus AI

## 1. Introduction

Following the initial competitive analysis and UI mockup design, I have conducted a thorough analysis of the NexusPipe GitHub repository. This document provides a summary of the codebase architecture, an assessment of its readiness for new features, and a strategic implementation roadmap for integrating **Direct AI Platform Querying** and **Share of Voice (SOV) Metrics**.

The analysis confirms that NexusPipe is built on a modern, robust, and scalable architecture. The existing patterns and modular structure make it exceptionally well-suited for the proposed enhancements.

## 2. Codebase & Architecture Analysis

After cloning and reviewing the repository, it is clear that the application is well-engineered. The key architectural strengths provide an excellent foundation for the new features.

### Technology Stack Summary

-   **Framework:** Next.js 15 (App Router) with React Server Components
-   **API Layer:** tRPC for end-to-end type-safe APIs
-   **Database:** PostgreSQL with Prisma ORM
-   **Authentication:** Clerk
-   **UI:** Tailwind CSS with shadcn/ui components
-   **Core AI Services:** Exa AI (Source Discovery), Firecrawl (Scraping), OpenAI (Analysis)

### Key Architectural Strengths

1.  **Modular Service Layer:** The separation of concerns in `src/server/services/` is a major advantage. External API integrations (e.g., `exa.ts`, `firecrawl.ts`) are isolated, which provides a clear and reusable pattern for adding new services for ChatGPT, Perplexity, Claude, and others.

2.  **Stateful Pipeline Processor:** The audit pipeline in `src/server/pipeline/processor.ts` is designed to be stateful and process work in chunks. This is a robust pattern that prevents server timeouts and allows for real-time progress updates to the user. This same pattern can be adapted for querying multiple AI platforms, which can have variable response times.

3.  **Type-Safe API with tRPC:** The use of tRPC simplifies development and reduces bugs by ensuring that the frontend and backend are always in sync regarding API contracts. Adding new endpoints for AI querying and SOV data will be a safe and efficient process.

4.  **Component-Based UI:** The frontend, located in `src/components/`, is built with reusable shadcn/ui components. This means we can quickly assemble the new UI elements (metric cards, charts, tabs) for the features we designed, ensuring a consistent look and feel.

5.  **Robust Data Model:** The Prisma schema in `prisma/schema.prisma` is well-defined. The `Audit` and `Source` models provide a solid base. Extending this schema to include `AIPlatformQuery` and `AIPlatformCache` will be a straightforward database migration.

> In summary, the codebase is not a blocker; on the contrary, its quality will accelerate the development of these new features. The project follows modern best practices, making it easy to extend and maintain.

## 3. Implementation Roadmap

Based on the codebase analysis, here is a strategic roadmap for implementing the new features. This plan is designed to deliver value incrementally and build upon the existing architecture. The attached `implementation_roadmap.md` file contains detailed, copy-paste-ready code examples for each step.

### Phase 1: Backend Foundation (Estimated: 1-2 Weeks)

This phase focuses on building the core logic for querying AI platforms without yet touching the UI.

1.  **Create AI Platform Service (`src/server/services/ai-platforms.ts`):**
    -   Create a new service file to house the logic for querying external AI APIs (OpenAI, Anthropic, Perplexity, Google AI).
    -   Implement a primary function, `queryAllPlatforms`, that takes a user query and dispatches it to the selected AI models in parallel.
    -   Implement a sub-function, `analyzeResponse`, that uses GPT-4 to analyze the raw text from each AI platform to extract brand mentions, sentiment, and competitor presence. This reuses the analysis pattern already present in `synthesis.ts`.

2.  **Extend the Database Schema (`prisma/schema.prisma`):**
    -   Add a new model, `AIPlatformQuery`, to store the results of each direct AI query. This model will be linked to the main `Audit` model.
    -   Add a new model, `AIPlatformCache`, to cache responses from AI platforms for specific queries. This reuses the caching pattern seen with `UrlCache` and is critical for managing API costs and improving performance.
    -   Run `pnpm prisma:migrate` to apply the changes.

3.  **Create New tRPC Router (`src/server/trpc/routers/ai-platforms.ts`):**
    -   Create a new router to expose the AI platform querying functionality to the frontend in a type-safe manner.
    -   Implement a `queryPlatforms` mutation that orchestrates the call to the new service and saves the results to the database.
    -   Implement a `getResponses` query to fetch stored AI responses for an audit.

### Phase 2: Share of Voice Calculation (Estimated: 1 Week)

This phase adds the logic for the new competitive metric.

1.  **Update Metrics Service (`src/server/services/metrics.ts`):**
    -   Create a new function, `calculateShareOfVoice`, that calculates SOV based on the mention counts in the new `AIPlatformQuery` data.
    -   The function should return the brand's SOV percentage, the SOV for each competitor, and the brand's rank.

2.  **Update Audit Router (`src/server/trpc/routers/audit.ts`):**
    -   Modify the `getResults` procedure to call the new `calculateShareOfVoice` function and include the SOV data in the main results payload that is sent to the frontend.

### Phase 3: Frontend Integration (Estimated: 2-3 Weeks)

With the backend logic in place, this phase focuses on building the user interface components we designed.

1.  **Update Results Dashboard (`src/components/audit/results-dashboard.tsx`):**
    -   Add the new **Share of Voice** and **AI Platform Coverage** metric cards to the existing grid of cards. This is a simple copy-paste of the existing `Card` component structure.

2.  **Create SOV Chart Component (`src/components/audit/share-of-voice-chart.tsx`):**
    -   Build a new component that takes the SOV data and renders the stacked horizontal bar chart we designed. You can use a lightweight charting library or build it with simple `div` elements and Tailwind CSS for full control.

3.  **Create AI Response Viewer (`src/components/audit/ai-platform-responses.tsx`):**
    -   Build the main component for the new "AI Platform Responses" tab. This component will contain the query input field, the "Test Query" button, the summary cards for each platform, and the tabbed view for displaying the detailed AI responses.
    -   This component will use the new tRPC hooks (`trpc.aiPlatforms.queryPlatforms.useMutation` and `trpc.aiPlatforms.getResponses.useQuery`) to communicate with the backend.

4.  **Update Audit Page (`src/app/audit/[id]/page.tsx`):**
    -   Modify the main audit page to include a new tab for "AI Platform Responses".
    -   Place the new `AIPlatformResponses` and `ShareOfVoiceChart` components within their respective tabs and parent containers.

### Phase 4: Testing and Refinement (Estimated: 1 Week)

1.  **Write Unit and E2E Tests:** Add Jest tests for the new services and Playwright tests for the new UI flows to maintain the project's high standard of quality.
2.  **Manage Costs and Rate Limits:** Implement API rate limiting and query caching to control costs. Add user-level quotas as a future consideration.
3.  **Update Environment Variables:** Ensure the new API keys (`ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY`, etc.) are added to the environment configuration and deployment secrets.

## 4. Conclusion and Next Steps

The NexusPipe application is in an excellent position to rapidly evolve. The codebase is clean, modern, and built with extensibility in mind. By following the phased implementation roadmap outlined above, you can systematically integrate direct AI platform querying and Share of Voice metrics, transforming NexusPipe into a market-leading GEO tool.

I have attached the detailed codebase analysis and a file with specific, copy-paste-ready code examples for each step of the implementation. I recommend your development team start with **Phase 1** by building the backend service and extending the database schema, as this provides the foundation for all subsequent work.

Please review the attached documents, and I am ready to answer any further questions you may have.
