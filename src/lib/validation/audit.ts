import { z } from "zod";

// Enums matching Prisma schema
export const auditStatusSchema = z.enum([
  "PENDING",
  "DISCOVERING",
  "INGESTING",
  "SYNTHESIZING",
  "COMPLETED",
  "FAILED",
]);

export const scrapeStatusSchema = z.enum(["PENDING", "COMPLETED", "FAILED"]);

export const sentimentSchema = z.enum(["POSITIVE", "NEUTRAL", "MIXED"]);

export const auditDepthSchema = z.enum(["QUICK", "STANDARD", "DEEP"]);

export type AuditStatus = z.infer<typeof auditStatusSchema>;
export type ScrapeStatus = z.infer<typeof scrapeStatusSchema>;
export type Sentiment = z.infer<typeof sentimentSchema>;
export type AuditDepth = z.infer<typeof auditDepthSchema>;

// Depth configuration: sources to fetch and min authority threshold
export const DEPTH_CONFIG = {
  QUICK: { sources: 25, minAuthority: 0.2, label: "Quick", description: "~2 min, rough signal" },
  STANDARD: { sources: 50, minAuthority: 0.15, label: "Standard", description: "~5 min, balanced" },
  DEEP: { sources: 100, minAuthority: 0.1, label: "Deep", description: "~10 min, thorough" },
} as const;

// Create audit input (form fields)
export const createAuditSchema = z.object({
  brandName: z.string().min(1, "Brand name is required").max(100),
  competitors: z
    .array(z.string().min(1).max(100))
    .max(10, "Maximum 10 competitors allowed")
    .default([]),
  industryIntent: z
    .string()
    .min(10, "Industry intent must be at least 10 characters")
    .max(500),
  depth: auditDepthSchema,
});

export type CreateAuditInput = z.infer<typeof createAuditSchema>;

// Audit ID param
export const auditIdSchema = z.object({
  id: z.string().cuid(),
});

export type AuditIdInput = z.infer<typeof auditIdSchema>;

// Source ID param
export const sourceIdSchema = z.object({
  id: z.string().cuid(),
});

export type SourceIdInput = z.infer<typeof sourceIdSchema>;

// Pagination
export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().cuid().optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// List sources with filters
export const listSourcesSchema = z.object({
  auditId: z.string().cuid(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().cuid().optional(),
  sentiment: sentimentSchema.optional(),
  mentionsBrand: z.boolean().optional(),
  hasCompetitors: z.boolean().optional(),
});

export type ListSourcesInput = z.infer<typeof listSourcesSchema>;

// Domain validation (basic URL hostname format)
const domainSchema = z
  .string()
  .min(1)
  .max(253)
  .regex(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i,
    "Invalid domain format"
  );

// Add excluded domain to audit
export const addExcludedDomainSchema = z.object({
  auditId: z.string().cuid(),
  domain: domainSchema,
});

export type AddExcludedDomainInput = z.infer<typeof addExcludedDomainSchema>;

// Remove excluded domain from audit
export const removeExcludedDomainSchema = z.object({
  auditId: z.string().cuid(),
  domain: domainSchema,
});

export type RemoveExcludedDomainInput = z.infer<typeof removeExcludedDomainSchema>;

// Update all excluded domains for audit
export const updateExcludedDomainsSchema = z.object({
  auditId: z.string().cuid(),
  domains: z.array(domainSchema).max(100, "Maximum 100 excluded domains"),
});

export type UpdateExcludedDomainsInput = z.infer<typeof updateExcludedDomainsSchema>;

// Extract domain from URL helper schema
export const extractDomainFromUrlSchema = z.object({
  url: z.string().url(),
});

export type ExtractDomainFromUrlInput = z.infer<typeof extractDomainFromUrlSchema>;
