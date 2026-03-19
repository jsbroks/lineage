import { asc, ilike } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { location } from "~/server/db/schema";

const createLocationInput = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  type: z.string().min(1),
  parentId: z.uuid().nullable().optional(),
});

export const locationRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(location).orderBy(asc(location.name));
  }),

  getByName: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [match] = await ctx.db
        .select()
        .from(location)
        .where(ilike(location.name, input.name))
        .limit(1);

      return match ?? null;
    }),

  create: publicProcedure
    .input(createLocationInput)
    .mutation(async ({ ctx, input }) => {
      const [createdLocation] = await ctx.db
        .insert(location)
        .values({
          name: input.name,
          description: input.description,
          type: input.type,
          parentId: input.parentId,
        })
        .returning();

      return createdLocation;
    }),
});
