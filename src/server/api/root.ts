import { lotTypeRouter } from "~/server/api/routers/lot-type";
import { lotRouter } from "~/server/api/routers/lot";
import { locationRouter } from "~/server/api/routers/location";
import { operationRouter } from "~/server/api/routers/operation";
import { operationTypeRouter } from "~/server/api/routers/operation-type";
import { anomalyRouter } from "~/server/api/routers/anomaly";
import { onboardingRouter } from "~/server/api/routers/onboarding";
import { teamRouter } from "~/server/api/routers/team";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { priceListRouter } from "~/server/api/routers/price-list";
import { scanRouter } from "./routers/scan";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  lotType: lotTypeRouter,
  lot: lotRouter,
  location: locationRouter,
  operation: operationRouter,
  operationType: operationTypeRouter,
  anomaly: anomalyRouter,
  onboarding: onboardingRouter,
  team: teamRouter,
  scan: scanRouter,
  priceList: priceListRouter,
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
