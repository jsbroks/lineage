import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { itemType } from "~/server/db/schema";

const itemTypeCreateInput = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.string().min(1),
  defaultUom: z.string().min(1).optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  codePrefix: z.string().min(1).nullable().optional(),
  codeNextNumber: z.number().int().positive().optional(),
});

const itemTypeEditInput = itemTypeCreateInput.extend({
  id: z.uuid(),
});

export const itemTypeRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(itemType).orderBy(asc(itemType.name));
  }),

  create: publicProcedure
    .input(itemTypeCreateInput)
    .mutation(async ({ ctx, input }) => {
      const [createdItemType] = await ctx.db
        .insert(itemType)
        .values({
          slug: input.slug,
          name: input.name,
          description: input.description,
          category: input.category,
          defaultUom: input.defaultUom,
          icon: input.icon,
          color: input.color,
          codePrefix: input.codePrefix ?? null,
          codeNextNumber: input.codeNextNumber,
        })
        .returning();

      return createdItemType;
    }),

  edit: publicProcedure
    .input(itemTypeEditInput)
    .mutation(async ({ ctx, input }) => {
      const [updatedItemType] = await ctx.db
        .update(itemType)
        .set({
          slug: input.slug,
          name: input.name,
          description: input.description,
          category: input.category,
          defaultUom: input.defaultUom,
          icon: input.icon,
          color: input.color,
          codePrefix: input.codePrefix ?? null,
          codeNextNumber: input.codeNextNumber,
        })
        .where(eq(itemType.id, input.id))
        .returning();

      if (!updatedItemType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item type not found",
        });
      }

      return updatedItemType;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deletedItemType] = await ctx.db
        .delete(itemType)
        .where(eq(itemType.id, input.id))
        .returning({ id: itemType.id });

      if (!deletedItemType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item type not found",
        });
      }

      return deletedItemType;
    }),
});
