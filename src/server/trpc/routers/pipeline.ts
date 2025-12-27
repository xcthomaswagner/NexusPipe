import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/trpc/trpc";
import { z } from "zod";

import { auditIdSchema } from "@/lib/validation/audit";
import {
  startPipeline,
  processNextChunk,
  getProgress,
  getAuditLogs,
} from "@/server/pipeline/processor";

export const pipelineRouter = createTRPCRouter({
  /**
   * Start the pipeline for an audit.
   * Runs neural discovery and prepares sources for ingestion.
   */
  start: protectedProcedure
    .input(auditIdSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
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

      // Start the pipeline
      const result = await startPipeline(input.id);
      return result;
    }),

  /**
   * Process the next chunk of work for an audit.
   * Called repeatedly by the client to drive the pipeline forward.
   */
  tick: protectedProcedure
    .input(
      auditIdSchema.extend({
        skipCache: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
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

      // Process next chunk
      const result = await processNextChunk(input.id, {
        skipCache: input.skipCache,
      });
      return result;
    }),

  /**
   * Get the current status of an audit pipeline.
   */
  getStatus: protectedProcedure
    .input(auditIdSchema)
    .query(async ({ ctx, input }) => {
      // Verify ownership
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

      const result = await getProgress(input.id);
      return result;
    }),

  /**
   * Get the audit logs for the terminal display.
   */
  getLogs: protectedProcedure
    .input(auditIdSchema)
    .query(async ({ ctx, input }) => {
      // Verify ownership
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

      const logs = await getAuditLogs(input.id);
      return logs;
    }),
});
