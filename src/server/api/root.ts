import { itemTypeRouter } from "~/server/api/routers/item-type";
import { lotRouter } from "~/server/api/routers/lot";
import { locationRouter } from "~/server/api/routers/location";
import { operationTypeRouter } from "~/server/api/routers/operation-type";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  itemType: itemTypeRouter,
  lot: lotRouter,
  location: locationRouter,
  operationType: operationTypeRouter,
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
