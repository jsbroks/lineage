import { TRPCError } from "@trpc/server";
import { asc, eq, sql, and, count, inArray } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  itemType,
  itemTypeVariant,
  item,
  statusDefinition,
  statusTransition,
} from "~/server/db/schema";

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

  getById: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const [it] = await ctx.db
        .select()
        .from(itemType)
        .where(eq(itemType.id, input.id))
        .limit(1);

      if (!it) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item type not found",
        });
      }

      const variants = await ctx.db
        .select()
        .from(itemTypeVariant)
        .where(eq(itemTypeVariant.itemTypeId, input.id))
        .orderBy(asc(itemTypeVariant.sortOrder));

      const statuses = await ctx.db
        .select()
        .from(statusDefinition)
        .where(eq(statusDefinition.itemTypeId, input.id))
        .orderBy(asc(statusDefinition.ordinal));

      const statusIds = statuses.map((s) => s.id);
      const transitions =
        statusIds.length > 0
          ? await ctx.db
              .select()
              .from(statusTransition)
              .where(inArray(statusTransition.fromStatusId, statusIds))
          : [];

      return { itemType: it, variants, statuses, transitions };
    }),

  saveVariants: publicProcedure
    .input(
      z.object({
        itemTypeId: z.uuid(),
        variants: z.array(
          z.object({
            id: z.uuid().optional(),
            name: z.string().min(1),
            isDefault: z.boolean().default(false),
            isActive: z.boolean().default(true),
            sortOrder: z.number().int().default(0),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const existing = await tx
          .select({ id: itemTypeVariant.id })
          .from(itemTypeVariant)
          .where(eq(itemTypeVariant.itemTypeId, input.itemTypeId));

        const incomingIds = new Set(
          input.variants.map((v) => v.id).filter(Boolean),
        );
        const toDelete = existing.filter((e) => !incomingIds.has(e.id));

        if (toDelete.length > 0) {
          await tx.delete(itemTypeVariant).where(
            inArray(
              itemTypeVariant.id,
              toDelete.map((d) => d.id),
            ),
          );
        }

        for (const v of input.variants) {
          if (v.id) {
            await tx
              .update(itemTypeVariant)
              .set({
                name: v.name,
                isDefault: v.isDefault,
                isActive: v.isActive,
                sortOrder: v.sortOrder,
              })
              .where(eq(itemTypeVariant.id, v.id));
          } else {
            await tx.insert(itemTypeVariant).values({
              itemTypeId: input.itemTypeId,
              name: v.name,
              isDefault: v.isDefault,
              isActive: v.isActive,
              sortOrder: v.sortOrder,
            });
          }
        }

        return tx
          .select()
          .from(itemTypeVariant)
          .where(eq(itemTypeVariant.itemTypeId, input.itemTypeId))
          .orderBy(asc(itemTypeVariant.sortOrder));
      });
    }),

  saveStatuses: publicProcedure
    .input(
      z.object({
        itemTypeId: z.uuid(),
        statuses: z.array(
          z.object({
            id: z.uuid().optional(),
            slug: z.string().min(1),
            name: z.string().min(1),
            color: z.string().nullable().optional(),
            isInitial: z.boolean().default(false),
            isTerminal: z.boolean().default(false),
            ordinal: z.number().int().default(0),
          }),
        ),
        transitions: z.array(
          z.object({
            fromSlug: z.string().min(1),
            toSlug: z.string().min(1),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const existing = await tx
          .select()
          .from(statusDefinition)
          .where(eq(statusDefinition.itemTypeId, input.itemTypeId));

        const incomingIds = new Set(
          input.statuses.map((s) => s.id).filter(Boolean),
        );
        const toDelete = existing.filter((e) => !incomingIds.has(e.id));

        if (toDelete.length > 0) {
          const deleteIds = toDelete.map((d) => d.id);
          await tx
            .delete(statusTransition)
            .where(inArray(statusTransition.fromStatusId, deleteIds));
          await tx
            .delete(statusTransition)
            .where(inArray(statusTransition.toStatusId, deleteIds));
          await tx
            .delete(statusDefinition)
            .where(inArray(statusDefinition.id, deleteIds));
        }

        for (const s of input.statuses) {
          if (s.id) {
            await tx
              .update(statusDefinition)
              .set({
                slug: s.slug,
                name: s.name,
                color: s.color,
                isInitial: s.isInitial,
                isTerminal: s.isTerminal,
                ordinal: s.ordinal,
              })
              .where(eq(statusDefinition.id, s.id));
          } else {
            await tx.insert(statusDefinition).values({
              itemTypeId: input.itemTypeId,
              slug: s.slug,
              name: s.name,
              color: s.color,
              isInitial: s.isInitial,
              isTerminal: s.isTerminal,
              ordinal: s.ordinal,
            });
          }
        }

        const saved = await tx
          .select()
          .from(statusDefinition)
          .where(eq(statusDefinition.itemTypeId, input.itemTypeId));

        const slugToId = new Map(saved.map((s) => [s.slug, s.id]));

        const existingStatusIds = saved.map((s) => s.id);
        if (existingStatusIds.length > 0) {
          await tx
            .delete(statusTransition)
            .where(
              inArray(statusTransition.fromStatusId, existingStatusIds),
            );
        }

        for (const t of input.transitions) {
          const fromId = slugToId.get(t.fromSlug);
          const toId = slugToId.get(t.toSlug);
          if (fromId && toId) {
            await tx.insert(statusTransition).values({
              fromStatusId: fromId,
              toStatusId: toId,
            });
          }
        }

        const transitions = existingStatusIds.length > 0
          ? await tx
              .select()
              .from(statusTransition)
              .where(
                inArray(statusTransition.fromStatusId, existingStatusIds),
              )
          : [];

        return { statuses: saved, transitions };
      });
    }),

  inventoryOverview: publicProcedure.query(async ({ ctx }) => {
    const types = await ctx.db
      .select()
      .from(itemType)
      .orderBy(asc(itemType.name));

    const variants = await ctx.db
      .select()
      .from(itemTypeVariant)
      .where(eq(itemTypeVariant.isActive, true))
      .orderBy(asc(itemTypeVariant.sortOrder));

    const counts = await ctx.db
      .select({
        itemTypeId: item.itemTypeId,
        variantId: item.variantId,
        total: count(),
      })
      .from(item)
      .groupBy(item.itemTypeId, item.variantId);

    const countMap = new Map<string, number>();
    for (const row of counts) {
      const key = `${row.itemTypeId}::${row.variantId ?? "_"}`;
      countMap.set(key, row.total);
    }

    type Row = {
      itemTypeId: string;
      itemTypeName: string;
      itemTypeIcon: string | null;
      itemTypeColor: string | null;
      variantId: string | null;
      variantName: string | null;
      sku: string | null;
      onHand: number;
    };

    const rows: Row[] = [];

    for (const t of types) {
      const typeVariants = variants.filter((v) => v.itemTypeId === t.id);

      if (typeVariants.length === 0) {
        rows.push({
          itemTypeId: t.id,
          itemTypeName: t.name,
          itemTypeIcon: t.icon,
          itemTypeColor: t.color,
          variantId: null,
          variantName: null,
          sku: t.codePrefix,
          onHand: countMap.get(`${t.id}::_`) ?? 0,
        });
      } else {
        for (const v of typeVariants) {
          rows.push({
            itemTypeId: t.id,
            itemTypeName: t.name,
            itemTypeIcon: t.icon,
            itemTypeColor: t.color,
            variantId: v.id,
            variantName: v.name,
            sku: t.codePrefix,
            onHand: countMap.get(`${t.id}::${v.id}`) ?? 0,
          });
        }
      }
    }

    return rows;
  }),
});
