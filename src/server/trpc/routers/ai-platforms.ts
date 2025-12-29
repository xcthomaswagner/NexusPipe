import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/trpc/trpc";
import {
  queryAIPlatformsSchema,
  getAIResponsesSchema,
  getShareOfVoiceSchema,
  updateAITestQueriesSchema,
} from "@/lib/validation/ai-platforms";
import {
  queryAllPlatforms,
  getAvailablePlatforms,
  getCacheStats,
} from "@/server/services/ai-platforms";
import {
  calculateShareOfVoice,
  generateAIVisibilityInsights,
} from "@/server/services/metrics";
import { generatePlatformStrategy } from "@/server/services/platform-strategy";

import type { AIPlatformId, AIPlatformResponse } from "@/server/services/ai-platforms";

export const aiPlatformsRouter = createTRPCRouter({
  /**
   * Get list of available AI platforms based on configured API keys.
   */
  getAvailable: publicProcedure.query(() => {
    return getAvailablePlatforms();
  }),

  /**
   * Query AI platforms with specified queries and store responses.
   */
  queryPlatforms: protectedProcedure
    .input(queryAIPlatformsSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify audit ownership
      const audit = await ctx.db.audit.findUnique({
        where: { id: input.auditId },
        include: { competitors: true },
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

      const competitors = audit.competitors.map((c) => c.name);
      const allResponses: AIPlatformResponse[] = [];

      // Query each platform with each query
      for (const query of input.queries) {
        const responses = await queryAllPlatforms(
          query,
          audit.brandName,
          competitors,
          input.platforms as AIPlatformId[],
          input.skipCache
        );

        allResponses.push(...responses);

        // Store responses in database
        for (const response of responses) {
          await ctx.db.aIPlatformQuery.create({
            data: {
              auditId: input.auditId,
              query: response.query,
              platform: response.platform,
              response: response.response,
              mentionsBrand: response.mentionsBrand,
              brandPosition: response.brandPosition,
              sentiment: response.sentiment,
              competitorsMentioned: response.competitorsMentioned,
            },
          });
        }
      }

      return {
        success: true,
        totalResponses: allResponses.length,
        responses: allResponses,
      };
    }),

  /**
   * Get AI platform responses for an audit with optional filtering.
   */
  getResponses: protectedProcedure
    .input(getAIResponsesSchema)
    .query(async ({ ctx, input }) => {
      // Verify audit ownership
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

      // Build where clause based on filter
      // Note: platform can be null or undefined when "all" is selected
      const baseWhere = {
        auditId: input.auditId,
        ...(input.platform != null ? { platform: input.platform } : {}),
      };

      let filterWhere = {};
      switch (input.filter) {
        case "brand_mentioned":
          filterWhere = { mentionsBrand: true };
          break;
        case "brand_not_mentioned":
          filterWhere = { mentionsBrand: false };
          break;
        case "competitor_only":
          filterWhere = {
            mentionsBrand: false,
            competitorsMentioned: { isEmpty: false },
          };
          break;
        case "neither_mentioned":
          filterWhere = {
            mentionsBrand: false,
            competitorsMentioned: { isEmpty: true },
          };
          break;
      }

      const responses = await ctx.db.aIPlatformQuery.findMany({
        where: { ...baseWhere, ...filterWhere },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: string | undefined = undefined;
      if (responses.length > input.limit) {
        const nextItem = responses.pop();
        nextCursor = nextItem?.id;
      }

      return {
        responses,
        nextCursor,
      };
    }),

  /**
   * Get platform coverage for an audit (which platforms have been queried).
   */
  getCoverage: protectedProcedure
    .input(getShareOfVoiceSchema)
    .query(async ({ ctx, input }) => {
      // Verify audit ownership
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

      const platformCounts = await ctx.db.aIPlatformQuery.groupBy({
        by: ["platform"],
        where: { auditId: input.auditId },
        _count: true,
      });

      const availablePlatforms = getAvailablePlatforms();

      return availablePlatforms.map((platform) => {
        const count = platformCounts.find((p) => p.platform === platform.id);
        return {
          ...platform,
          queriesRun: count?._count ?? 0,
        };
      });
    }),

  /**
   * Calculate Share of Voice metrics for an audit.
   */
  getShareOfVoice: protectedProcedure
    .input(getShareOfVoiceSchema)
    .query(async ({ ctx, input }) => {
      // Verify audit ownership
      const audit = await ctx.db.audit.findUnique({
        where: { id: input.auditId },
        include: { competitors: true },
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

      const responses = await ctx.db.aIPlatformQuery.findMany({
        where: { auditId: input.auditId },
      });

      return calculateShareOfVoice(responses, audit.competitors);
    }),

  /**
   * Generate actionable insights from AI visibility data.
   */
  getInsights: protectedProcedure
    .input(getShareOfVoiceSchema)
    .query(async ({ ctx, input }) => {
      const audit = await ctx.db.audit.findUnique({
        where: { id: input.auditId },
        include: { competitors: true },
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

      const responses = await ctx.db.aIPlatformQuery.findMany({
        where: { auditId: input.auditId },
      });

      const metrics = calculateShareOfVoice(responses, audit.competitors);
      return generateAIVisibilityInsights(metrics, audit.brandName);
    }),

  /**
   * Get filter counts for AI responses dropdown.
   */
  getFilterCounts: protectedProcedure
    .input(getShareOfVoiceSchema)
    .query(async ({ ctx, input }) => {
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

      const responses = await ctx.db.aIPlatformQuery.findMany({
        where: { auditId: input.auditId },
        select: { mentionsBrand: true, competitorsMentioned: true },
      });

      return {
        all: responses.length,
        brand_mentioned: responses.filter((r) => r.mentionsBrand).length,
        brand_not_mentioned: responses.filter((r) => !r.mentionsBrand).length,
        competitor_only: responses.filter(
          (r) => !r.mentionsBrand && r.competitorsMentioned.length > 0
        ).length,
        neither_mentioned: responses.filter(
          (r) => !r.mentionsBrand && r.competitorsMentioned.length === 0
        ).length,
      };
    }),

  /**
   * Get platform strategy recommendations for an audit.
   */
  getPlatformStrategy: protectedProcedure
    .input(getShareOfVoiceSchema)
    .query(async ({ ctx, input }) => {
      const audit = await ctx.db.audit.findUnique({
        where: { id: input.auditId },
        include: { competitors: true },
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

      return generatePlatformStrategy(
        audit.brandName,
        audit.industryIntent,
        audit.competitors.map((c) => c.name)
      );
    }),

  /**
   * Update AI test queries for an audit.
   */
  updateTestQueries: protectedProcedure
    .input(updateAITestQueriesSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify audit ownership
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

      const updatedAudit = await ctx.db.audit.update({
        where: { id: input.auditId },
        data: { aiTestQueries: input.queries },
        select: { aiTestQueries: true },
      });

      return {
        success: true,
        queries: updatedAudit.aiTestQueries,
      };
    }),

  /**
   * Get cache statistics for AI platform queries.
   */
  getCacheStats: protectedProcedure.query(async () => {
    return getCacheStats();
  }),

  /**
   * Delete all AI platform responses for an audit (for rerun).
   */
  clearResponses: protectedProcedure
    .input(getShareOfVoiceSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify audit ownership
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

      const deleted = await ctx.db.aIPlatformQuery.deleteMany({
        where: { auditId: input.auditId },
      });

      return {
        success: true,
        deletedCount: deleted.count,
      };
    }),
});
