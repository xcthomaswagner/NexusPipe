import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";

import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/trpc/trpc";
import { listSourcesSchema, sourceIdSchema } from "@/lib/validation/audit";

export const sourceRouter = createTRPCRouter({
  /**
   * List sources for an audit with optional filters.
   */
  listByAudit: protectedProcedure
    .input(listSourcesSchema)
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

      // Build where clause with filters
      const where: Prisma.SourceWhereInput = {
        auditId: input.auditId,
      };

      if (input.sentiment) {
        where.sentiment = input.sentiment;
      }

      if (input.mentionsBrand !== undefined) {
        where.mentionsBrand = input.mentionsBrand;
      }

      if (input.hasCompetitors !== undefined) {
        where.mentionsCompetitors = {
          isEmpty: !input.hasCompetitors,
        };
      }

      const limit = input.limit;
      const cursor = input.cursor;

      const sources = await ctx.db.source.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { authorityScore: "desc" },
        select: {
          id: true,
          url: true,
          title: true,
          authorityScore: true,
          mentionsBrand: true,
          mentionsCompetitors: true,
          sentiment: true,
          scrapeStatus: true,
          scrapeError: true,
          analyzedAt: true,
          createdAt: true,
        },
      });

      let nextCursor: string | undefined = undefined;
      if (sources.length > limit) {
        const nextItem = sources.pop();
        nextCursor = nextItem?.id;
      }

      return {
        sources,
        nextCursor,
      };
    }),

  /**
   * Get full details for a single source, including markdown content.
   */
  getMarkdown: protectedProcedure
    .input(sourceIdSchema)
    .query(async ({ ctx, input }) => {
      const source = await ctx.db.source.findUnique({
        where: { id: input.id },
        include: {
          audit: {
            select: { userId: true },
          },
        },
      });

      if (!source) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Source not found",
        });
      }

      if (source.audit.userId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return {
        id: source.id,
        url: source.url,
        title: source.title,
        authorityScore: source.authorityScore,
        markdown: source.markdown,
        mentionsBrand: source.mentionsBrand,
        mentionsCompetitors: source.mentionsCompetitors,
        sentiment: source.sentiment,
        scrapeStatus: source.scrapeStatus,
        scrapeError: source.scrapeError,
        analyzedAt: source.analyzedAt,
      };
    }),
});
