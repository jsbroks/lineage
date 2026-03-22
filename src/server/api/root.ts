import { itemTypeRouter } from "~/server/api/routers/item-type";
import { itemRouter } from "~/server/api/routers/item";
import { locationRouter } from "~/server/api/routers/location";
import { operationRouter } from "~/server/api/routers/operation";
import { operationTypeRouter } from "~/server/api/routers/operation-type";
import { anomalyRouter } from "~/server/api/routers/anomaly";
import { onboardingRouter } from "~/server/api/routers/onboarding";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  itemType: itemTypeRouter,
  item: itemRouter,
  location: locationRouter,
  operation: operationRouter,
  operationType: operationTypeRouter,
  anomaly: anomalyRouter,
  onboarding: onboardingRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
