import { TRPCError } from "@trpc/server";
import { asc, eq, count, inArray, sum, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  lotType,
  lotTypeVariant,
  lotTypeOption,
  lotTypeOptionValue,
  lotTypeAttributeDefinition,
  lot,
  lotTypeStatusDefinition,
  lotTypeStatusTransition,
} from "~/server/db/schema";

const lotTypeCreateInput = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.string().min(1),
  quantityName: z.string().nullable().optional(),
  quantityDefaultUnit: z.string().min(1).optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  codePrefix: z.string().min(1).nullable().optional(),
  codeNextNumber: z.number().int().positive().optional(),
});

const lotTypeEditInput = lotTypeCreateInput.extend({
  id: z.uuid(),
});

export const lotTypeRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(lotType).orderBy(asc(lotType.name));
  }),

  listWithStatuses: publicProcedure.query(async ({ ctx }) => {
    const types = await ctx.db
      .select()
      .from(lotType)
      .orderBy(asc(lotType.name));
    const statuses = await ctx.db
      .select()
      .from(lotTypeStatusDefinition)
      .orderBy(asc(lotTypeStatusDefinition.ordinal));

    const statusesByType = new Map<string, (typeof statuses)[number][]>();
    for (const s of statuses) {
      if (!statusesByType.has(s.lotTypeId)) {
        statusesByType.set(s.lotTypeId, []);
      }
      statusesByType.get(s.lotTypeId)!.push(s);
    }

    return types.map((t) => ({
      ...t,
      statuses: statusesByType.get(t.id) ?? [],
    }));
  }),

  create: publicProcedure
    .input(lotTypeCreateInput)
    .mutation(async ({ ctx, input }) => {
      const [createdLotType] = await ctx.db
        .insert(lotType)
        .values({
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

      return createdLotType;
    }),

  edit: publicProcedure
    .input(lotTypeEditInput)
    .mutation(async ({ ctx, input }) => {
      const [updatedLotType] = await ctx.db
        .update(lotType)
        .set({
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
        .where(eq(lotType.id, input.id))
        .returning();

      if (!updatedLotType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lot type not found",
        });
      }

      return updatedLotType;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deletedLotType] = await ctx.db
        .delete(lotType)
        .where(eq(lotType.id, input.id))
        .returning({ id: lotType.id });

      if (!deletedLotType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lot type not found",
        });
      }

      return deletedLotType;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const [it] = await ctx.db
        .select()
        .from(lotType)
        .where(eq(lotType.id, input.id))
        .limit(1);

      if (!it) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lot type not found",
        });
      }

      const variants = await ctx.db
        .select()
        .from(lotTypeVariant)
        .where(eq(lotTypeVariant.lotTypeId, input.id))
        .orderBy(asc(lotTypeVariant.sortOrder));

      const options = await ctx.db
        .select()
        .from(lotTypeOption)
        .where(eq(lotTypeOption.lotTypeId, input.id))
        .orderBy(asc(lotTypeOption.position));

      const optionIds = options.map((o) => o.id);
      const optionValues =
        optionIds.length > 0
          ? await ctx.db
              .select()
              .from(lotTypeOptionValue)
              .where(inArray(lotTypeOptionValue.optionId, optionIds))
              .orderBy(asc(lotTypeOptionValue.position))
          : [];

      const statuses = await ctx.db
        .select()
        .from(lotTypeStatusDefinition)
        .where(eq(lotTypeStatusDefinition.lotTypeId, input.id))
        .orderBy(asc(lotTypeStatusDefinition.ordinal));

      const statusIds = statuses.map((s) => s.id);
      const transitions =
        statusIds.length > 0
          ? await ctx.db
              .select()
              .from(lotTypeStatusTransition)
              .where(inArray(lotTypeStatusTransition.fromStatusId, statusIds))
          : [];

      const attributeDefinitions = await ctx.db
        .select()
        .from(lotTypeAttributeDefinition)
        .where(eq(lotTypeAttributeDefinition.lotTypeId, input.id))
        .orderBy(asc(lotTypeAttributeDefinition.sortOrder));

      return {
        lotType: it,
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
        lotTypeId: z.uuid(),
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
          .from(lotTypeVariant)
          .where(eq(lotTypeVariant.lotTypeId, input.lotTypeId));

        const incomingNames = new Set(input.variants.map((v) => v.name));
        const existingByName = new Map(existing.map((v) => [v.name, v]));
        const toRemove = existing.filter((e) => !incomingNames.has(e.name));

        if (toRemove.length > 0) {
          const assignedCounts = await tx
            .select({ variantId: lot.variantId, total: count() })
            .from(lot)
            .where(
              inArray(
                lot.variantId,
                toRemove.map((v) => v.id),
              ),
            )
            .groupBy(lot.variantId);

          const assignedSet = new Set(
            assignedCounts
              .filter((r) => r.variantId !== null)
              .map((r) => r.variantId!),
          );

          for (const v of toRemove) {
            if (assignedSet.has(v.id)) {
              await tx
                .update(lotTypeVariant)
                .set({ isActive: false })
                .where(eq(lotTypeVariant.id, v.id));
            } else {
              await tx
                .delete(lotTypeVariant)
                .where(eq(lotTypeVariant.id, v.id));
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
              .update(lotTypeVariant)
              .set({
                name: v.name,
                isDefault: v.isDefault,
                isActive: v.isActive,
                sortOrder: v.sortOrder,
                ...defaults,
              })
              .where(eq(lotTypeVariant.id, match.id));
          } else {
            await tx.insert(lotTypeVariant).values({
              lotTypeId: input.lotTypeId,
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
          .from(lotTypeVariant)
          .where(eq(lotTypeVariant.lotTypeId, input.lotTypeId))
          .orderBy(asc(lotTypeVariant.sortOrder));
      });
    }),

  saveOptions: publicProcedure
    .input(
      z.object({
        lotTypeId: z.uuid(),
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
          .from(lotTypeOption)
          .where(eq(lotTypeOption.lotTypeId, input.lotTypeId));

        const incomingIds = new Set(
          input.options.map((o) => o.id).filter(Boolean),
        );
        const toDelete = existingOptions.filter((e) => !incomingIds.has(e.id));

        if (toDelete.length > 0) {
          const deleteIds = toDelete.map((d) => d.id);
          await tx
            .delete(lotTypeOptionValue)
            .where(inArray(lotTypeOptionValue.optionId, deleteIds));
          await tx
            .delete(lotTypeOption)
            .where(inArray(lotTypeOption.id, deleteIds));
        }

        for (let pos = 0; pos < input.options.length; pos++) {
          const o = input.options[pos]!;
          let optionId: string;

          if (o.id) {
            await tx
              .update(lotTypeOption)
              .set({ name: o.name, position: pos })
              .where(eq(lotTypeOption.id, o.id));
            optionId = o.id;

            await tx
              .delete(lotTypeOptionValue)
              .where(eq(lotTypeOptionValue.optionId, optionId));
          } else {
            const [created] = await tx
              .insert(lotTypeOption)
              .values({
                lotTypeId: input.lotTypeId,
                name: o.name,
                position: pos,
              })
              .returning();
            optionId = created!.id;
          }

          for (let vPos = 0; vPos < o.values.length; vPos++) {
            await tx.insert(lotTypeOptionValue).values({
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
        lotTypeId: z.uuid(),
        statuses: z.array(
          z.object({
            id: z.uuid().optional(),
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
          .from(lotTypeStatusDefinition)
          .where(eq(lotTypeStatusDefinition.lotTypeId, input.lotTypeId));

        const incomingIds = new Set(
          input.statuses.map((s) => s.id).filter(Boolean),
        );
        const toDelete = existing.filter((e) => !incomingIds.has(e.id));

        if (toDelete.length > 0) {
          const deleteIds = toDelete.map((d) => d.id);
          await tx
            .delete(lotTypeStatusTransition)
            .where(inArray(lotTypeStatusTransition.fromStatusId, deleteIds));
          await tx
            .delete(lotTypeStatusTransition)
            .where(inArray(lotTypeStatusTransition.toStatusId, deleteIds));
          await tx
            .delete(lotTypeStatusDefinition)
            .where(inArray(lotTypeStatusDefinition.id, deleteIds));
        }

        for (const s of input.statuses) {
          if (s.id) {
            await tx
              .update(lotTypeStatusDefinition)
              .set({
                name: s.name,
                color: s.color,
                isInitial: s.isInitial,
                isTerminal: s.isTerminal,
                ordinal: s.ordinal,
              })
              .where(eq(lotTypeStatusDefinition.id, s.id));
          } else {
            await tx.insert(lotTypeStatusDefinition).values({
              lotTypeId: input.lotTypeId,
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
          .from(lotTypeStatusDefinition)
          .where(eq(lotTypeStatusDefinition.lotTypeId, input.lotTypeId));

        const nameToId = new Map(saved.map((s) => [s.name, s.id]));

        const existingStatusIds = saved.map((s) => s.id);
        if (existingStatusIds.length > 0) {
          await tx
            .delete(lotTypeStatusTransition)
            .where(
              inArray(lotTypeStatusTransition.fromStatusId, existingStatusIds),
            );
        }

        for (const t of input.transitions) {
          const fromId = nameToId.get(t.fromSlug);
          const toId = nameToId.get(t.toSlug);
          if (fromId && toId) {
            await tx.insert(lotTypeStatusTransition).values({
              fromStatusId: fromId,
              toStatusId: toId,
            });
          }
        }

        const transitions =
          existingStatusIds.length > 0
            ? await tx
                .select()
                .from(lotTypeStatusTransition)
                .where(
                  inArray(
                    lotTypeStatusTransition.fromStatusId,
                    existingStatusIds,
                  ),
                )
            : [];

        return { statuses: saved, transitions };
      });
    }),

  saveAttributeDefinitions: publicProcedure
    .input(
      z.object({
        lotTypeId: z.uuid(),
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
          .select({ id: lotTypeAttributeDefinition.id })
          .from(lotTypeAttributeDefinition)
          .where(eq(lotTypeAttributeDefinition.lotTypeId, input.lotTypeId));

        const incomingIds = new Set(
          input.definitions.map((d) => d.id).filter(Boolean),
        );
        const toDelete = existing.filter((e) => !incomingIds.has(e.id));

        if (toDelete.length > 0) {
          await tx.delete(lotTypeAttributeDefinition).where(
            inArray(
              lotTypeAttributeDefinition.id,
              toDelete.map((d) => d.id),
            ),
          );
        }

        for (const d of input.definitions) {
          if (d.id) {
            await tx
              .update(lotTypeAttributeDefinition)
              .set({
                attrKey: d.attrKey,
                dataType: d.dataType,
                isRequired: d.isRequired,
                unit: d.unit ?? null,
                options: d.options ?? null,
                defaultValue: d.defaultValue ?? null,
                sortOrder: d.sortOrder,
              })
              .where(eq(lotTypeAttributeDefinition.id, d.id));
          } else {
            await tx.insert(lotTypeAttributeDefinition).values({
              lotTypeId: input.lotTypeId,
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
          .from(lotTypeAttributeDefinition)
          .where(eq(lotTypeAttributeDefinition.lotTypeId, input.lotTypeId))
          .orderBy(asc(lotTypeAttributeDefinition.sortOrder));
      });
    }),

  inventoryOverview: publicProcedure.query(async ({ ctx }) => {
    const types = await ctx.db
      .select()
      .from(lotType)
      .orderBy(asc(lotType.name));

    const variants = await ctx.db
      .select()
      .from(lotTypeVariant)
      .where(eq(lotTypeVariant.isActive, true))
      .orderBy(asc(lotTypeVariant.sortOrder));

    const statuses = await ctx.db.select().from(lotTypeStatusDefinition);

    const initialIds = new Map<string, Set<string>>();
    const terminalIds = new Map<string, Set<string>>();
    for (const s of statuses) {
      if (!s.lotTypeId) continue;
      if (s.isInitial) {
        if (!initialIds.has(s.lotTypeId))
          initialIds.set(s.lotTypeId, new Set());
        initialIds.get(s.lotTypeId)!.add(s.id);
      }
      if (s.isTerminal) {
        if (!terminalIds.has(s.lotTypeId))
          terminalIds.set(s.lotTypeId, new Set());
        terminalIds.get(s.lotTypeId)!.add(s.id);
      }
    }

    const lotAgg = await ctx.db
      .select({
        lotTypeId: lot.lotTypeId,
        variantId: lot.variantId,
        statusId: lot.statusId,
        total: count(),
        totalValue: sum(lot.value),
        totalQuantity: sql<string>`sum(${lot.quantity}::numeric)`,
      })
      .from(lot)
      .groupBy(lot.lotTypeId, lot.variantId, lot.statusId);

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

    const bucketMap = new Map<string, Bucket>();
    const typeBucketMap = new Map<string, Bucket>();

    for (const row of lotAgg) {
      const varKey = `${row.lotTypeId}::${row.variantId ?? "_"}`;
      if (!bucketMap.has(varKey)) bucketMap.set(varKey, emptyBucket());
      const b = bucketMap.get(varKey)!;

      if (!typeBucketMap.has(row.lotTypeId))
        typeBucketMap.set(row.lotTypeId, emptyBucket());
      const tb = typeBucketMap.get(row.lotTypeId)!;

      const isInitial =
        initialIds.get(row.lotTypeId)?.has(row.statusId) ?? false;
      const isTerminal =
        terminalIds.get(row.lotTypeId)?.has(row.statusId) ?? false;

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
      lotTypeId: string;
      lotTypeName: string;
      lotTypeIcon: string | null;
      lotTypeColor: string | null;
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
      const typeVariants = variants.filter((v) => v.lotTypeId === t.id);

      if (typeVariants.length === 0) {
        const b = typeBucketMap.get(t.id) ?? empty;
        rows.push({
          lotTypeId: t.id,
          lotTypeName: t.name,
          lotTypeIcon: t.icon,
          lotTypeColor: t.color,
          quantityUnit: t.quantityDefaultUnit,
          variantId: null,
          variantName: null,
          sku: t.codePrefix,
          ...b,
        });
      } else {
        const tb = typeBucketMap.get(t.id) ?? empty;
        rows.push({
          lotTypeId: t.id,
          lotTypeName: t.name,
          lotTypeIcon: t.icon,
          lotTypeColor: t.color,
          quantityUnit: t.quantityDefaultUnit,
          variantId: null,
          variantName: null,
          sku: t.codePrefix,
          ...tb,
        });
        for (const v of typeVariants) {
          const b = bucketMap.get(`${t.id}::${v.id}`) ?? empty;
          rows.push({
            lotTypeId: t.id,
            lotTypeName: t.name,
            lotTypeIcon: t.icon,
            lotTypeColor: t.color,
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
            lotTypeId: t.id,
            lotTypeName: t.name,
            lotTypeIcon: t.icon,
            lotTypeColor: t.color,
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
