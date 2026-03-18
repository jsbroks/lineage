import { TRPCError } from "@trpc/server";
import { asc, eq, count, inArray, sum, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  itemType,
  itemTypeVariant,
  itemTypeOption,
  itemTypeOptionValue,
  itemTypeAttributeDefinition,
  item,
  statusDefinition,
  statusTransition,
} from "~/server/db/schema";

const itemTypeCreateInput = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.string().min(1),
  quantityName: z.string().nullable().optional(),
  quantityDefaultUnit: z.string().min(1).optional(),
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
          quantityName: input.quantityName ?? null,
          quantityDefaultUnit: input.quantityDefaultUnit,
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
          quantityName: input.quantityName ?? null,
          quantityDefaultUnit: input.quantityDefaultUnit,
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

      const options = await ctx.db
        .select()
        .from(itemTypeOption)
        .where(eq(itemTypeOption.itemTypeId, input.id))
        .orderBy(asc(itemTypeOption.position));

      const optionIds = options.map((o) => o.id);
      const optionValues =
        optionIds.length > 0
          ? await ctx.db
              .select()
              .from(itemTypeOptionValue)
              .where(inArray(itemTypeOptionValue.optionId, optionIds))
              .orderBy(asc(itemTypeOptionValue.position))
          : [];

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

      const attributeDefinitions = await ctx.db
        .select()
        .from(itemTypeAttributeDefinition)
        .where(eq(itemTypeAttributeDefinition.itemTypeId, input.id))
        .orderBy(asc(itemTypeAttributeDefinition.sortOrder));

      return {
        itemType: it,
        variants,
        options,
        optionValues,
        statuses,
        transitions,
        attributeDefinitions,
      };
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
            defaultValue: z.number().int().nullable().optional(),
            defaultValueCurrency: z.string().nullable().optional(),
            defaultQuantity: z.string().nullable().optional(),
            defaultQuantityUnit: z.string().nullable().optional(),
            defaultAttributes: z
              .record(z.string(), z.unknown())
              .nullable()
              .optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const existing = await tx
          .select()
          .from(itemTypeVariant)
          .where(eq(itemTypeVariant.itemTypeId, input.itemTypeId));

        const incomingNames = new Set(input.variants.map((v) => v.name));
        const existingByName = new Map(existing.map((v) => [v.name, v]));
        const toRemove = existing.filter((e) => !incomingNames.has(e.name));

        if (toRemove.length > 0) {
          const assignedCounts = await tx
            .select({ variantId: item.variantId, total: count() })
            .from(item)
            .where(inArray(item.variantId, toRemove.map((v) => v.id)))
            .groupBy(item.variantId);

          const assignedSet = new Set(
            assignedCounts
              .filter((r) => r.variantId !== null)
              .map((r) => r.variantId!),
          );

          for (const v of toRemove) {
            if (assignedSet.has(v.id)) {
              await tx
                .update(itemTypeVariant)
                .set({ isActive: false })
                .where(eq(itemTypeVariant.id, v.id));
            } else {
              await tx
                .delete(itemTypeVariant)
                .where(eq(itemTypeVariant.id, v.id));
            }
          }
        }

        for (const v of input.variants) {
          const defaults = {
            defaultValue: v.defaultValue ?? null,
            defaultValueCurrency: v.defaultValueCurrency ?? null,
            defaultQuantity: v.defaultQuantity ?? null,
            defaultQuantityUnit: v.defaultQuantityUnit ?? null,
            defaultAttributes: v.defaultAttributes ?? null,
          };
          const match = v.id
            ? existing.find((e) => e.id === v.id)
            : existingByName.get(v.name);

          if (match) {
            await tx
              .update(itemTypeVariant)
              .set({
                name: v.name,
                isDefault: v.isDefault,
                isActive: v.isActive,
                sortOrder: v.sortOrder,
                ...defaults,
              })
              .where(eq(itemTypeVariant.id, match.id));
          } else {
            await tx.insert(itemTypeVariant).values({
              itemTypeId: input.itemTypeId,
              name: v.name,
              isDefault: v.isDefault,
              isActive: v.isActive,
              sortOrder: v.sortOrder,
              ...defaults,
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

  saveOptions: publicProcedure
    .input(
      z.object({
        itemTypeId: z.uuid(),
        options: z.array(
          z.object({
            id: z.uuid().optional(),
            name: z.string().min(1),
            values: z.array(z.string().min(1)),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const existingOptions = await tx
          .select()
          .from(itemTypeOption)
          .where(eq(itemTypeOption.itemTypeId, input.itemTypeId));

        const incomingIds = new Set(
          input.options.map((o) => o.id).filter(Boolean),
        );
        const toDelete = existingOptions.filter((e) => !incomingIds.has(e.id));

        if (toDelete.length > 0) {
          const deleteIds = toDelete.map((d) => d.id);
          await tx
            .delete(itemTypeOptionValue)
            .where(inArray(itemTypeOptionValue.optionId, deleteIds));
          await tx
            .delete(itemTypeOption)
            .where(inArray(itemTypeOption.id, deleteIds));
        }

        for (let pos = 0; pos < input.options.length; pos++) {
          const o = input.options[pos]!;
          let optionId: string;

          if (o.id) {
            await tx
              .update(itemTypeOption)
              .set({ name: o.name, position: pos })
              .where(eq(itemTypeOption.id, o.id));
            optionId = o.id;

            await tx
              .delete(itemTypeOptionValue)
              .where(eq(itemTypeOptionValue.optionId, optionId));
          } else {
            const [created] = await tx
              .insert(itemTypeOption)
              .values({
                itemTypeId: input.itemTypeId,
                name: o.name,
                position: pos,
              })
              .returning();
            optionId = created!.id;
          }

          for (let vPos = 0; vPos < o.values.length; vPos++) {
            await tx.insert(itemTypeOptionValue).values({
              optionId,
              value: o.values[vPos]!,
              position: vPos,
            });
          }
        }
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
            .where(inArray(statusTransition.fromStatusId, existingStatusIds));
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

        const transitions =
          existingStatusIds.length > 0
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

  saveAttributeDefinitions: publicProcedure
    .input(
      z.object({
        itemTypeId: z.uuid(),
        definitions: z.array(
          z.object({
            id: z.uuid().optional(),
            attrKey: z.string().min(1),
            dataType: z.enum(["text", "number", "boolean", "date", "select"]),
            isRequired: z.boolean().default(false),
            unit: z.string().nullable().optional(),
            options: z.array(z.string()).nullable().optional(),
            defaultValue: z.string().nullable().optional(),
            sortOrder: z.number().int().default(0),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const existing = await tx
          .select({ id: itemTypeAttributeDefinition.id })
          .from(itemTypeAttributeDefinition)
          .where(eq(itemTypeAttributeDefinition.itemTypeId, input.itemTypeId));

        const incomingIds = new Set(
          input.definitions.map((d) => d.id).filter(Boolean),
        );
        const toDelete = existing.filter((e) => !incomingIds.has(e.id));

        if (toDelete.length > 0) {
          await tx.delete(itemTypeAttributeDefinition).where(
            inArray(
              itemTypeAttributeDefinition.id,
              toDelete.map((d) => d.id),
            ),
          );
        }

        for (const d of input.definitions) {
          if (d.id) {
            await tx
              .update(itemTypeAttributeDefinition)
              .set({
                attrKey: d.attrKey,
                dataType: d.dataType,
                isRequired: d.isRequired,
                unit: d.unit ?? null,
                options: d.options ?? null,
                defaultValue: d.defaultValue ?? null,
                sortOrder: d.sortOrder,
              })
              .where(eq(itemTypeAttributeDefinition.id, d.id));
          } else {
            await tx.insert(itemTypeAttributeDefinition).values({
              itemTypeId: input.itemTypeId,
              attrKey: d.attrKey,
              dataType: d.dataType,
              isRequired: d.isRequired,
              unit: d.unit ?? null,
              options: d.options ?? null,
              defaultValue: d.defaultValue ?? null,
              sortOrder: d.sortOrder,
            });
          }
        }

        return tx
          .select()
          .from(itemTypeAttributeDefinition)
          .where(eq(itemTypeAttributeDefinition.itemTypeId, input.itemTypeId))
          .orderBy(asc(itemTypeAttributeDefinition.sortOrder));
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

    const statuses = await ctx.db.select().from(statusDefinition);

    const initialSlugs = new Map<string, Set<string>>();
    const terminalSlugs = new Map<string, Set<string>>();
    for (const s of statuses) {
      if (!s.itemTypeId) continue;
      if (s.isInitial) {
        if (!initialSlugs.has(s.itemTypeId))
          initialSlugs.set(s.itemTypeId, new Set());
        initialSlugs.get(s.itemTypeId)!.add(s.slug);
      }
      if (s.isTerminal) {
        if (!terminalSlugs.has(s.itemTypeId))
          terminalSlugs.set(s.itemTypeId, new Set());
        terminalSlugs.get(s.itemTypeId)!.add(s.slug);
      }
    }

    const itemAgg = await ctx.db
      .select({
        itemTypeId: item.itemTypeId,
        variantId: item.variantId,
        status: item.status,
        total: count(),
        totalValue: sum(item.value),
        totalQuantity: sql<string>`sum(${item.quantity}::numeric)`,
      })
      .from(item)
      .groupBy(item.itemTypeId, item.variantId, item.status);

    type Bucket = {
      prepared: number;
      active: number;
      completed: number;
      totalValue: number;
      totalQuantity: number;
    };
    const emptyBucket = (): Bucket => ({
      prepared: 0,
      active: 0,
      completed: 0,
      totalValue: 0,
      totalQuantity: 0,
    });

    // key = "typeId::variantId" (variantId = "_" for null)
    const bucketMap = new Map<string, Bucket>();
    // also aggregate per type for the "all" total
    const typeBucketMap = new Map<string, Bucket>();

    for (const row of itemAgg) {
      const varKey = `${row.itemTypeId}::${row.variantId ?? "_"}`;
      if (!bucketMap.has(varKey)) bucketMap.set(varKey, emptyBucket());
      const b = bucketMap.get(varKey)!;

      if (!typeBucketMap.has(row.itemTypeId))
        typeBucketMap.set(row.itemTypeId, emptyBucket());
      const tb = typeBucketMap.get(row.itemTypeId)!;

      const isInitial =
        initialSlugs.get(row.itemTypeId)?.has(row.status) ?? false;
      const isTerminal =
        terminalSlugs.get(row.itemTypeId)?.has(row.status) ?? false;

      const cnt = row.total;
      const val = Number(row.totalValue) || 0;
      const qty = Number(row.totalQuantity) || 0;

      b.totalValue += val;
      b.totalQuantity += qty;
      tb.totalValue += val;
      tb.totalQuantity += qty;

      if (isInitial) {
        b.prepared += cnt;
        tb.prepared += cnt;
      } else if (isTerminal) {
        b.completed += cnt;
        tb.completed += cnt;
      } else {
        b.active += cnt;
        tb.active += cnt;
      }
    }

    type Row = {
      itemTypeId: string;
      itemTypeName: string;
      itemTypeIcon: string | null;
      itemTypeColor: string | null;
      quantityUnit: string | null;
      variantId: string | null;
      variantName: string | null;
      sku: string | null;
      prepared: number;
      active: number;
      completed: number;
      totalValue: number;
      totalQuantity: number;
    };

    const rows: Row[] = [];
    const empty = emptyBucket();

    for (const t of types) {
      const typeVariants = variants.filter((v) => v.itemTypeId === t.id);

      if (typeVariants.length === 0) {
        const b = typeBucketMap.get(t.id) ?? empty;
        rows.push({
          itemTypeId: t.id,
          itemTypeName: t.name,
          itemTypeIcon: t.icon,
          itemTypeColor: t.color,
          quantityUnit: t.quantityDefaultUnit,
          variantId: null,
          variantName: null,
          sku: t.codePrefix,
          ...b,
        });
      } else {
        // Type-level summary row that totals across all variants
        const tb = typeBucketMap.get(t.id) ?? empty;
        rows.push({
          itemTypeId: t.id,
          itemTypeName: t.name,
          itemTypeIcon: t.icon,
          itemTypeColor: t.color,
          quantityUnit: t.quantityDefaultUnit,
          variantId: null,
          variantName: null,
          sku: t.codePrefix,
          ...tb,
        });
        for (const v of typeVariants) {
          const b = bucketMap.get(`${t.id}::${v.id}`) ?? empty;
          rows.push({
            itemTypeId: t.id,
            itemTypeName: t.name,
            itemTypeIcon: t.icon,
            itemTypeColor: t.color,
            quantityUnit: t.quantityDefaultUnit,
            variantId: v.id,
            variantName: v.name,
            sku: t.codePrefix,
            ...b,
          });
        }
        const unassigned = bucketMap.get(`${t.id}::_`);
        if (unassigned) {
          rows.push({
            itemTypeId: t.id,
            itemTypeName: t.name,
            itemTypeIcon: t.icon,
            itemTypeColor: t.color,
            quantityUnit: t.quantityDefaultUnit,
            variantId: "_unassigned",
            variantName: "Unassigned",
            sku: t.codePrefix,
            ...unassigned,
          });
        }
      }
    }

    return rows;
  }),
});
