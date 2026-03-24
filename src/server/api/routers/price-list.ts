import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { priceList, priceListEntry } from "~/server/db/schema";
import { getActiveOrgId } from "~/server/api/org";

export const priceListRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getActiveOrgId(ctx.session);
    return ctx.db
      .select()
      .from(priceList)
      .where(eq(priceList.orgId, orgId))
      .orderBy(asc(priceList.name));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const [pl] = await ctx.db
        .select()
        .from(priceList)
        .where(and(eq(priceList.id, input.id), eq(priceList.orgId, orgId)))
        .limit(1);

      if (!pl) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Price list not found",
        });
      }

      const entries = await ctx.db
        .select()
        .from(priceListEntry)
        .where(eq(priceListEntry.priceListId, pl.id))
        .orderBy(asc(priceListEntry.lotTypeId));

      return { priceList: pl, entries };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().nullable().optional(),
        currency: z.string().min(1).default("CAD"),
        isDefault: z.boolean().default(false),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);

      return ctx.db.transaction(async (tx) => {
        if (input.isDefault) {
          await tx
            .update(priceList)
            .set({ isDefault: false })
            .where(
              and(eq(priceList.orgId, orgId), eq(priceList.isDefault, true)),
            );
        }

        const [created] = await tx
          .insert(priceList)
          .values({
            orgId,
            name: input.name,
            description: input.description ?? null,
            currency: input.currency,
            isDefault: input.isDefault,
            isActive: input.isActive,
          })
          .returning();

        return created;
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        currency: z.string().min(1).optional(),
        isDefault: z.boolean().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);

      return ctx.db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(priceList)
          .where(and(eq(priceList.id, input.id), eq(priceList.orgId, orgId)))
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Price list not found",
          });
        }

        if (input.isDefault) {
          await tx
            .update(priceList)
            .set({ isDefault: false })
            .where(
              and(eq(priceList.orgId, orgId), eq(priceList.isDefault, true)),
            );
        }

        const [updated] = await tx
          .update(priceList)
          .set({
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && {
              description: input.description,
            }),
            ...(input.currency !== undefined && { currency: input.currency }),
            ...(input.isDefault !== undefined && {
              isDefault: input.isDefault,
            }),
            ...(input.isActive !== undefined && { isActive: input.isActive }),
            updatedAt: new Date(),
          })
          .where(eq(priceList.id, input.id))
          .returning();

        return updated;
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const [deleted] = await ctx.db
        .delete(priceList)
        .where(and(eq(priceList.id, input.id), eq(priceList.orgId, orgId)))
        .returning({ id: priceList.id });

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Price list not found",
        });
      }

      return deleted;
    }),

  setEntries: protectedProcedure
    .input(
      z.object({
        priceListId: z.uuid(),
        entries: z.array(
          z.object({
            lotTypeId: z.uuid(),
            variantId: z.uuid().nullable().optional(),
            unitPrice: z.number().int().nonnegative(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);

      const [pl] = await ctx.db
        .select({ id: priceList.id })
        .from(priceList)
        .where(
          and(eq(priceList.id, input.priceListId), eq(priceList.orgId, orgId)),
        )
        .limit(1);

      if (!pl) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Price list not found",
        });
      }

      return ctx.db.transaction(async (tx) => {
        await tx
          .delete(priceListEntry)
          .where(eq(priceListEntry.priceListId, input.priceListId));

        if (input.entries.length === 0) return [];

        const inserted = await tx
          .insert(priceListEntry)
          .values(
            input.entries.map((e) => ({
              priceListId: input.priceListId,
              lotTypeId: e.lotTypeId,
              variantId: e.variantId ?? null,
              unitPrice: e.unitPrice,
            })),
          )
          .returning();

        return inserted;
      });
    }),

  getForLotType: protectedProcedure
    .input(z.object({ lotTypeId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);

      const orgPriceLists = await ctx.db
        .select({ id: priceList.id })
        .from(priceList)
        .where(eq(priceList.orgId, orgId));

      const plIds = orgPriceLists.map((p) => p.id);
      if (plIds.length === 0) return [];

      return ctx.db
        .select({
          id: priceListEntry.id,
          priceListId: priceListEntry.priceListId,
          priceListName: priceList.name,
          lotTypeId: priceListEntry.lotTypeId,
          variantId: priceListEntry.variantId,
          unitPrice: priceListEntry.unitPrice,
          minQty: priceListEntry.minQty,
          effectiveFrom: priceListEntry.effectiveFrom,
          effectiveTo: priceListEntry.effectiveTo,
        })
        .from(priceListEntry)
        .innerJoin(priceList, eq(priceListEntry.priceListId, priceList.id))
        .where(
          and(
            eq(priceListEntry.lotTypeId, input.lotTypeId),
            inArray(priceListEntry.priceListId, plIds),
          ),
        )
        .orderBy(asc(priceList.name));
    }),
});
