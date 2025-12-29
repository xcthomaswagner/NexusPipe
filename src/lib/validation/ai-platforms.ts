import { z } from "zod";

// AI Platform IDs matching the service
export const aiPlatformIdSchema = z.enum([
  "chatgpt",
  "perplexity",
  "claude",
  "gemini",
]);

export type AIPlatformId = z.infer<typeof aiPlatformIdSchema>;

// Query AI platforms input
export const queryAIPlatformsSchema = z.object({
  auditId: z.string().cuid(),
  queries: z
    .array(z.string().min(1).max(500))
    .min(1, "At least one query is required")
    .max(10, "Maximum 10 queries allowed"),
  platforms: z
    .array(aiPlatformIdSchema)
    .min(1, "At least one platform is required")
    .max(5),
  skipCache: z.boolean().optional().default(false),
});

export type QueryAIPlatformsInput = z.infer<typeof queryAIPlatformsSchema>;

// Response filter modes for competitive analysis
export const responseFilterModeSchema = z.enum([
  "all",
  "brand_mentioned",
  "brand_not_mentioned",
  "competitor_only",
  "neither_mentioned",
]);

export type ResponseFilterMode = z.infer<typeof responseFilterModeSchema>;

// Get AI responses for an audit
export const getAIResponsesSchema = z.object({
  auditId: z.string().cuid(),
  platform: aiPlatformIdSchema.nullish(), // Allow null or undefined
  filter: responseFilterModeSchema.optional().default("all"),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().cuid().optional(),
});

export type GetAIResponsesInput = z.infer<typeof getAIResponsesSchema>;

// Get Share of Voice metrics
export const getShareOfVoiceSchema = z.object({
  auditId: z.string().cuid(),
});

export type GetShareOfVoiceInput = z.infer<typeof getShareOfVoiceSchema>;

// Update AI test queries for an audit
export const updateAITestQueriesSchema = z.object({
  auditId: z.string().cuid(),
  queries: z
    .array(z.string().min(1).max(500))
    .max(20, "Maximum 20 test queries allowed"),
});

export type UpdateAITestQueriesInput = z.infer<typeof updateAITestQueriesSchema>;
