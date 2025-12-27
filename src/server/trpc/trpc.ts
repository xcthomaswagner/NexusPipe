import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";

import { db } from "@/server/db";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    db,
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Get or create DB user from Clerk ID
  let user = await ctx.db.user.findUnique({
    where: { clerkId: clerkUserId },
  });

  if (!user) {
    // Fetch email from Clerk
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";

    user = await ctx.db.user.create({
      data: {
        clerkId: clerkUserId,
        email,
      },
    });
  }

  return next({
    ctx: {
      ...ctx,
      userId: user.id,
      clerkUserId,
    },
  });
});
