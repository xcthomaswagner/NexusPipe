import { TRPCError } from "@trpc/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { clearCacheForUrls } from "@/server/services/url-cache";

import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/trpc/trpc";
import {
  createAuditSchema,
  auditIdSchema,
  paginationSchema,
  addExcludedDomainSchema,
  removeExcludedDomainSchema,
  updateExcludedDomainsSchema,
  DEPTH_CONFIG,
} from "@/lib/validation/audit";
import { extractDomain } from "@/server/services/exa";
import {
  calculateVisibilityIndex,
  findCitationGaps,
  calculateSentimentBreakdown,
  calculateAuditStats,
  calculateShareOfVoice,
  calculateCombinedVisibilityScore,
} from "@/server/services/metrics";
import { generateInsights } from "@/server/services/insights";
import { getFirstMentionSnippet } from "@/server/services/text-utils";
import { generatePDFReport, prepareReportData } from "@/server/services/pdf-report";

export const auditRouter = createTRPCRouter({
  /**
   * Create a new audit with brand, competitors, and industry intent.
   */
  create: protectedProcedure
    .input(createAuditSchema)
    .mutation(async ({ ctx, input }) => {
      const depth = input.depth ?? "STANDARD";
      const depthConfig = DEPTH_CONFIG[depth];

      const audit = await ctx.db.audit.create({
        data: {
          userId: ctx.userId,
          brandName: input.brandName,
          brandContext: input.brandContext,
          industryIntent: input.industryIntent,
          depth,
          minAuthority: depthConfig.minAuthority,
          status: "PENDING",
          competitors: {
            create: input.competitors.map((name) => ({ name })),
          },
        },
        include: {
          competitors: true,
        },
      });

      return audit;
    }),

  /**
   * Get a single audit by ID with computed metrics.
   */
  getById: protectedProcedure
    .input(auditIdSchema)
    .query(async ({ ctx, input }) => {
      const audit = await ctx.db.audit.findUnique({
        where: { id: input.id },
        include: {
          competitors: true,
          sources: {
            orderBy: { authorityScore: "desc" },
          },
        },
      });

      if (!audit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Audit not found",
        });
      }

      // Verify ownership
      if (audit.userId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      // Calculate metrics
      const stats = calculateAuditStats(audit.sources);
      const citationGaps = findCitationGaps(audit.sources);

      return {
        ...audit,
        stats,
        citationGaps,
      };
    }),

  /**
   * List all audits for the current user.
   */
  list: protectedProcedure
    .input(paginationSchema.optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const cursor = input?.cursor;

      const audits = await ctx.db.audit.findMany({
        where: { userId: ctx.userId },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          competitors: true,
          _count: {
            select: { sources: true },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (audits.length > limit) {
        const nextItem = audits.pop();
        nextCursor = nextItem?.id;
      }

      return {
        audits,
        nextCursor,
      };
    }),

  /**
   * Get detailed results for a completed audit.
   */
  getResults: protectedProcedure
    .input(auditIdSchema)
    .query(async ({ ctx, input }) => {
      const audit = await ctx.db.audit.findUnique({
        where: { id: input.id },
        include: {
          competitors: true,
          sources: true,
          aiPlatformQueries: true,
        },
      });

      if (!audit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Audit not found",
        });
      }

      if (audit.userId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      const visibilityIndex = calculateVisibilityIndex(audit.sources);
      const citationGaps = findCitationGaps(audit.sources);
      const sentimentBreakdown = calculateSentimentBreakdown(audit.sources);
      const stats = calculateAuditStats(audit.sources);

      // Calculate Share of Voice metrics from AI platform queries
      const shareOfVoice = calculateShareOfVoice(
        audit.aiPlatformQueries,
        audit.competitors
      );

      // Calculate combined visibility score (web + AI)
      const combinedVisibilityScore = calculateCombinedVisibilityScore(
        visibilityIndex,
        shareOfVoice.brandShareOfVoice
      );

      // Get top brand mentions with context snippets
      const brandMentions = audit.sources
        .filter((s) => s.mentionsBrand && s.analyzedAt)
        .sort((a, b) => (b.authorityScore ?? 0) - (a.authorityScore ?? 0))
        .slice(0, 10)
        .map((source) => ({
          id: source.id,
          url: source.url,
          title: source.title,
          authorityScore: source.authorityScore,
          sentiment: source.sentiment,
          // Prefer stored GPT-extracted snippet, fall back to computed
          mentionSnippet: source.mentionSnippet ?? getFirstMentionSnippet(source.markdown, audit.brandName),
        }));

      return {
        audit: {
          id: audit.id,
          brandName: audit.brandName,
          status: audit.status,
          visibilityScore: audit.visibilityScore,
          createdAt: audit.createdAt,
          aiTestQueries: audit.aiTestQueries,
        },
        competitors: audit.competitors.map((c) => c.name),
        visibilityIndex,
        citationGaps,
        sentimentBreakdown,
        stats,
        brandMentions,
        shareOfVoice,
        combinedVisibilityScore,
      };
    }),

  /**
   * Delete an audit and all associated data.
   */
  delete: protectedProcedure
    .input(auditIdSchema)
    .mutation(async ({ ctx, input }) => {
      const audit = await ctx.db.audit.findUnique({
        where: { id: input.id },
        select: { userId: true },
      });

      if (!audit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Audit not found",
        });
      }

      if (audit.userId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      // Get source URLs before deletion for cache clearing
      const sources = await ctx.db.source.findMany({
        where: { auditId: input.id },
        select: { url: true },
      });
      const sourceUrls = sources.map((s) => s.url);

      // Cascade delete handles competitors, sources, logs
      await ctx.db.audit.delete({
        where: { id: input.id },
      });

      // Clear URL cache for deleted sources
      if (sourceUrls.length > 0) {
        await clearCacheForUrls(sourceUrls);
      }

      // Invalidate the dashboard cache so deleted audit disappears
      revalidatePath("/dashboard");

      return { success: true };
    }),

  /**
   * Add a domain to the exclusion list.
   * Extracts domain from URL if a full URL is provided.
   */
  addExcludedDomain: protectedProcedure
    .input(addExcludedDomainSchema)
    .mutation(async ({ ctx, input }) => {
      const audit = await ctx.db.audit.findUnique({
        where: { id: input.auditId },
        select: { userId: true, excludedDomains: true },
      });

      if (!audit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Audit not found",
        });
      }

      if (audit.userId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      // Normalize domain (lowercase, no trailing dots)
      const normalizedDomain = input.domain.toLowerCase().replace(/\.+$/, "");

      // Check if already excluded
      if (audit.excludedDomains.includes(normalizedDomain)) {
        return { success: true, excludedDomains: audit.excludedDomains };
      }

      const updatedAudit = await ctx.db.audit.update({
        where: { id: input.auditId },
        data: {
          excludedDomains: [...audit.excludedDomains, normalizedDomain],
        },
        select: { excludedDomains: true },
      });

      return { success: true, excludedDomains: updatedAudit.excludedDomains };
    }),

  /**
   * Add a domain to the exclusion list by extracting it from a URL.
   */
  addExcludedDomainFromUrl: protectedProcedure
    .input(addExcludedDomainSchema.extend({ domain: addExcludedDomainSchema.shape.domain.or(z.string().url()) }))
    .mutation(async ({ ctx, input }) => {
      // Try to extract domain if it looks like a URL
      let domain = input.domain;
      if (input.domain.includes("://")) {
        const extracted = extractDomain(input.domain);
        if (!extracted) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Could not extract domain from URL",
          });
        }
        domain = extracted;
      }

      const audit = await ctx.db.audit.findUnique({
        where: { id: input.auditId },
        select: { userId: true, excludedDomains: true },
      });

      if (!audit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Audit not found",
        });
      }

      if (audit.userId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      // Get base domain (e.g., "worldwide.promega.com" -> "promega.com")
      // Keep the full domain but also allow user to manually simplify
      const normalizedDomain = domain.toLowerCase().replace(/\.+$/, "");

      if (audit.excludedDomains.includes(normalizedDomain)) {
        return { success: true, excludedDomains: audit.excludedDomains, addedDomain: normalizedDomain };
      }

      const updatedAudit = await ctx.db.audit.update({
        where: { id: input.auditId },
        data: {
          excludedDomains: [...audit.excludedDomains, normalizedDomain],
        },
        select: { excludedDomains: true },
      });

      return { success: true, excludedDomains: updatedAudit.excludedDomains, addedDomain: normalizedDomain };
    }),

  /**
   * Remove a domain from the exclusion list.
   */
  removeExcludedDomain: protectedProcedure
    .input(removeExcludedDomainSchema)
    .mutation(async ({ ctx, input }) => {
      const audit = await ctx.db.audit.findUnique({
        where: { id: input.auditId },
        select: { userId: true, excludedDomains: true },
      });

      if (!audit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Audit not found",
        });
      }

      if (audit.userId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      const normalizedDomain = input.domain.toLowerCase();
      const updatedDomains = audit.excludedDomains.filter(
        (d) => d.toLowerCase() !== normalizedDomain
      );

      const updatedAudit = await ctx.db.audit.update({
        where: { id: input.auditId },
        data: { excludedDomains: updatedDomains },
        select: { excludedDomains: true },
      });

      return { success: true, excludedDomains: updatedAudit.excludedDomains };
    }),

  /**
   * Update the full list of excluded domains.
   */
  updateExcludedDomains: protectedProcedure
    .input(updateExcludedDomainsSchema)
    .mutation(async ({ ctx, input }) => {
      const audit = await ctx.db.audit.findUnique({
        where: { id: input.auditId },
        select: { userId: true },
      });

      if (!audit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Audit not found",
        });
      }

      if (audit.userId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      // Normalize and dedupe domains
      const normalizedDomains = [
        ...new Set(input.domains.map((d) => d.toLowerCase().replace(/\.+$/, ""))),
      ];

      const updatedAudit = await ctx.db.audit.update({
        where: { id: input.auditId },
        data: { excludedDomains: normalizedDomains },
        select: { excludedDomains: true },
      });

      return { success: true, excludedDomains: updatedAudit.excludedDomains };
    }),

  /**
   * Rerun an audit with updated settings (clears existing data and restarts).
   * Allows updating competitors, depth, and industry intent.
   */
  rerun: protectedProcedure
    .input(
      auditIdSchema.extend({
        forceRefresh: z.boolean().optional().default(false),
        // Optional updated settings
        competitors: z.array(z.string().min(1).max(100)).max(10).optional(),
        depth: z.enum(["QUICK", "STANDARD", "DEEP"]).optional(),
        industryIntent: z.string().min(10).max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const audit = await ctx.db.audit.findUnique({
        where: { id: input.id },
        select: { userId: true, status: true },
      });

      if (!audit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Audit not found",
        });
      }

      if (audit.userId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      // Don't allow rerun if currently in progress
      if (["DISCOVERING", "INGESTING", "SYNTHESIZING"].includes(audit.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot rerun an audit that is currently in progress",
        });
      }

      // Get source URLs before deleting (for cache clearing)
      const sources = await ctx.db.source.findMany({
        where: { auditId: input.id },
        select: { url: true },
      });
      const sourceUrls = sources.map((s) => s.url);

      // Delete existing sources and logs
      await ctx.db.source.deleteMany({
        where: { auditId: input.id },
      });

      await ctx.db.auditLog.deleteMany({
        where: { auditId: input.id },
      });

      // Clear URL cache for deleted sources so fresh scrapes happen on rerun
      if (sourceUrls.length > 0) {
        await clearCacheForUrls(sourceUrls);
      }

      // Handle competitor updates if provided
      if (input.competitors !== undefined) {
        // Delete existing competitors
        await ctx.db.competitor.deleteMany({
          where: { auditId: input.id },
        });

        // Create new competitors if any
        if (input.competitors.length > 0) {
          await ctx.db.competitor.createMany({
            data: input.competitors.map((name) => ({
              name,
              auditId: input.id,
            })),
          });
        }
      }

      // Build update data
      const updateData: {
        status: "PENDING";
        visibilityScore: null;
        errorMessage: null;
        depth?: "QUICK" | "STANDARD" | "DEEP";
        minAuthority?: number;
        industryIntent?: string;
      } = {
        status: "PENDING",
        visibilityScore: null,
        errorMessage: null,
      };

      if (input.depth) {
        updateData.depth = input.depth;
        updateData.minAuthority = DEPTH_CONFIG[input.depth].minAuthority;
      }

      if (input.industryIntent) {
        updateData.industryIntent = input.industryIntent;
      }

      // Reset audit status and update settings
      const updatedAudit = await ctx.db.audit.update({
        where: { id: input.id },
        data: updateData,
        include: {
          competitors: true,
        },
      });

      return {
        ...updatedAudit,
        forceRefresh: input.forceRefresh,
      };
    }),

  /**
   * Generate AI-powered insights for an audit.
   */
  generateInsights: protectedProcedure
    .input(auditIdSchema)
    .mutation(async ({ ctx, input }) => {
      const audit = await ctx.db.audit.findUnique({
        where: { id: input.id },
        include: {
          competitors: true,
          sources: true,
        },
      });

      if (!audit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Audit not found",
        });
      }

      if (audit.userId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      if (audit.status !== "COMPLETED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Audit must be completed to generate insights",
        });
      }

      // Calculate metrics
      const visibilityIndex = calculateVisibilityIndex(audit.sources);
      const citationGaps = findCitationGaps(audit.sources);
      const sentimentBreakdown = calculateSentimentBreakdown(audit.sources);
      const stats = calculateAuditStats(audit.sources);

      // Get brand mentions
      const brandMentions = audit.sources
        .filter((s) => s.mentionsBrand && s.analyzedAt)
        .sort((a, b) => (b.authorityScore ?? 0) - (a.authorityScore ?? 0))
        .slice(0, 10);

      // Generate insights with context snippets for better analysis
      const insights = await generateInsights({
        brandName: audit.brandName,
        competitors: audit.competitors.map((c) => c.name),
        industryIntent: audit.industryIntent,
        visibilityIndex,
        totalSources: stats.totalSources,
        analyzedSources: stats.analyzedSources,
        sentimentBreakdown,
        citationGaps: citationGaps.map((g) => ({
          title: g.title,
          url: g.url,
          authorityScore: g.authorityScore,
          mentionsCompetitors: g.mentionsCompetitors,
          snippet: g.mentionSnippet, // Context for competitor mentions
        })),
        brandMentions: brandMentions.map((m) => ({
          title: m.title,
          url: m.url,
          authorityScore: m.authorityScore,
          sentiment: m.sentiment,
          snippet: m.mentionSnippet, // Context justifying sentiment
        })),
      });

      return insights;
    }),

  /**
   * Generate a PDF report for a completed audit.
   */
  generateReport: protectedProcedure
    .input(auditIdSchema)
    .mutation(async ({ ctx, input }) => {
      const audit = await ctx.db.audit.findUnique({
        where: { id: input.id },
        include: {
          competitors: true,
          sources: true,
          aiPlatformQueries: true,
        },
      });

      if (!audit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Audit not found",
        });
      }

      if (audit.userId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      if (audit.status !== "COMPLETED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Audit must be completed to generate a report",
        });
      }

      // Calculate all metrics (same as getResults)
      const visibilityIndex = calculateVisibilityIndex(audit.sources);
      const citationGaps = findCitationGaps(audit.sources);
      const sentimentBreakdown = calculateSentimentBreakdown(audit.sources);
      const stats = calculateAuditStats(audit.sources);
      const shareOfVoice = calculateShareOfVoice(
        audit.aiPlatformQueries,
        audit.competitors
      );
      const combinedVisibilityScore = calculateCombinedVisibilityScore(
        visibilityIndex,
        shareOfVoice.brandShareOfVoice
      );

      // Get brand mentions
      const brandMentions = audit.sources
        .filter((s) => s.mentionsBrand && s.analyzedAt)
        .sort((a, b) => (b.authorityScore ?? 0) - (a.authorityScore ?? 0))
        .slice(0, 10)
        .map((source) => ({
          id: source.id,
          url: source.url,
          title: source.title,
          authorityScore: source.authorityScore,
          sentiment: source.sentiment,
          mentionSnippet:
            source.mentionSnippet ??
            getFirstMentionSnippet(source.markdown, audit.brandName),
        }));

      // Prepare report data
      const reportData = prepareReportData(
        {
          id: audit.id,
          brandName: audit.brandName,
          createdAt: audit.createdAt,
          industryIntent: audit.industryIntent,
          aiTestQueries: audit.aiTestQueries,
        },
        {
          visibilityIndex,
          combinedVisibilityScore,
          sentimentBreakdown,
          stats,
          brandMentions,
          citationGaps,
          shareOfVoice,
        }
      );

      // Generate PDF
      const pdfBuffer = await generatePDFReport(reportData);

      // Return as base64 for download
      const sanitizedBrandName = audit.brandName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      return {
        filename: `nexuspipe-report-${sanitizedBrandName}-${Date.now()}.pdf`,
        data: pdfBuffer.toString("base64"),
        contentType: "application/pdf",
      };
    }),
});
