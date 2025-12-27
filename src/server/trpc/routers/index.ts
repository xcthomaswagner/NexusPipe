import { createCallerFactory, createTRPCRouter } from "@/server/trpc/trpc";
import { userRouter } from "@/server/trpc/routers/user";
import { auditRouter } from "@/server/trpc/routers/audit";
import { pipelineRouter } from "@/server/trpc/routers/pipeline";
import { sourceRouter } from "@/server/trpc/routers/source";

export const appRouter = createTRPCRouter({
  user: userRouter,
  audit: auditRouter,
  pipeline: pipelineRouter,
  source: sourceRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
