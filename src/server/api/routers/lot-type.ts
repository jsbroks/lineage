import { TRPCError } from "@trpc/server";
import { and, asc, eq, count, inArray, sum, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  lotType,
  lotTypeCategory,
  lotTypeVariant,
  lotTypeOption,
  lotTypeOptionValue,
  lotTypeAttributeDefinition,
  lotTypeIdentifier,
  lot,
  lotTypeStatusDefinition,
  lotTypeStatusTransition,
} from "~/server/db/schema";
import { getActiveOrgId } from "~/server/api/org";

const lotTypeCreateInput = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  categoryId: z.uuid().nullable().optional(),
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
  getByIdentifierValue: protectedProcedure
    .input(z.object({ identifierValue: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const [it] = await ctx.db
        .select()
        .from(lotType)
        .innerJoin(
          lotTypeIdentifier,
          eq(lotType.id, lotTypeIdentifier.lotTypeId),
        )
        .where(
          and(
            eq(lotTypeIdentifier.identifierValue, input.identifierValue),
            eq(lotType.orgId, orgId),
          ),
        )
        .limit(1);
      if (!it) return null;
      return it;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getActiveOrgId(ctx.session);
    return ctx.db
      .select()
      .from(lotType)
      .where(eq(lotType.orgId, orgId))
      .orderBy(asc(lotType.name));
  }),

  listWithStatuses: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getActiveOrgId(ctx.session);
    const types = await ctx.db
      .select()
      .from(lotType)
      .where(eq(lotType.orgId, orgId))
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

  create: protectedProcedure
    .input(lotTypeCreateInput)
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const [createdLotType] = await ctx.db
        .insert(lotType)
        .values({
          orgId,
          name: input.name,
          description: input.description,
          categoryId: input.categoryId,
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

  edit: protectedProcedure
    .input(lotTypeEditInput)
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const [updatedLotType] = await ctx.db
        .update(lotType)
        .set({
          name: input.name,
          description: input.description,
          categoryId: input.categoryId,
          quantityName: input.quantityName ?? null,
          quantityDefaultUnit: input.quantityDefaultUnit,
          icon: input.icon,
          color: input.color,
          codePrefix: input.codePrefix ?? null,
          codeNextNumber: input.codeNextNumber,
        })
        .where(and(eq(lotType.id, input.id), eq(lotType.orgId, orgId)))
        .returning();

      if (!updatedLotType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lot type not found",
        });
      }

      return updatedLotType;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const [deletedLotType] = await ctx.db
        .delete(lotType)
        .where(and(eq(lotType.id, input.id), eq(lotType.orgId, orgId)))
        .returning({ id: lotType.id });

      if (!deletedLotType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lot type not found",
        });
      }

      return deletedLotType;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const [it] = await ctx.db
        .select()
        .from(lotType)
        .where(and(eq(lotType.id, input.id), eq(lotType.orgId, orgId)))
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

  saveVariants: protectedProcedure
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
            defaultUnitCost: z.number().int().nullable().optional(),
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
            defaultUnitCost: v.defaultUnitCost ?? null,
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

  saveOptions: protectedProcedure
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

  saveStatuses: protectedProcedure
    .input(
      z.object({
        lotTypeId: z.uuid(),
        statuses: z.array(
          z.object({
            id: z.uuid().optional(),
            name: z.string().min(1),
            color: z.string().nullable().optional(),
            category: z
              .enum(["unstarted", "in_progress", "done", "canceled"])
              .default("unstarted"),
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
                category: s.category,
                ordinal: s.ordinal,
              })
              .where(eq(lotTypeStatusDefinition.id, s.id));
          } else {
            await tx.insert(lotTypeStatusDefinition).values({
              lotTypeId: input.lotTypeId,
              name: s.name,
              color: s.color,
              category: s.category,
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

  saveAttributeDefinitions: protectedProcedure
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

  resolveByIdentifier: protectedProcedure
    .input(z.object({ identifierValue: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const [row] = await ctx.db
        .select({
          lotTypeId: lotTypeIdentifier.lotTypeId,
          lotTypeName: lotType.name,
          variantId: lotTypeIdentifier.variantId,
          variantName: lotTypeVariant.name,
          identifierType: lotTypeIdentifier.identifierType,
        })
        .from(lotTypeIdentifier)
        .innerJoin(lotType, eq(lotType.id, lotTypeIdentifier.lotTypeId))
        .leftJoin(
          lotTypeVariant,
          eq(lotTypeVariant.id, lotTypeIdentifier.variantId),
        )
        .where(
          and(
            eq(lotTypeIdentifier.identifierValue, input.identifierValue),
            eq(lotType.orgId, orgId),
          ),
        )
        .limit(1);

      return row ?? null;
    }),

  addIdentifier: protectedProcedure
    .input(
      z.object({
        lotTypeId: z.uuid(),
        variantId: z.uuid().nullable().optional(),
        identifierType: z.string().min(1),
        identifierValue: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const [existing] = await ctx.db
        .select({ id: lotTypeIdentifier.id })
        .from(lotTypeIdentifier)
        .innerJoin(lotType, eq(lotType.id, lotTypeIdentifier.lotTypeId))
        .where(
          and(
            eq(lotTypeIdentifier.identifierValue, input.identifierValue),
            eq(lotType.orgId, orgId),
          ),
        )
        .limit(1);

      if (existing) return existing;

      const [created] = await ctx.db
        .insert(lotTypeIdentifier)
        .values({
          lotTypeId: input.lotTypeId,
          orgId,
          variantId: input.variantId ?? null,
          identifierType: input.identifierType,
          identifierValue: input.identifierValue,
        })
        .returning();

      return created;
    }),

  inventoryOverview: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getActiveOrgId(ctx.session);
    const types = await ctx.db
      .select()
      .from(lotType)
      .where(eq(lotType.orgId, orgId))
      .orderBy(asc(lotType.name));

    const variants = await ctx.db
      .select()
      .from(lotTypeVariant)
      .where(eq(lotTypeVariant.isActive, true))
      .orderBy(asc(lotTypeVariant.sortOrder));

    const statuses = await ctx.db.select().from(lotTypeStatusDefinition);

    const statusCategoryById = new Map<
      string,
      { lotTypeId: string; category: string }
    >();
    for (const s of statuses) {
      if (!s.lotTypeId) continue;
      statusCategoryById.set(s.id, {
        lotTypeId: s.lotTypeId,
        category: s.category,
      });
    }

    const lotAgg = await ctx.db
      .select({
        lotTypeId: lot.lotTypeId,
        variantId: lot.variantId,
        statusId: lot.statusId,
        total: count(),
        totalCost: sql<string>`sum(${lot.unitCost}::numeric * ${lot.quantity}::numeric)`,
        totalQuantity: sql<string>`sum(${lot.quantity}::numeric)`,
      })
      .from(lot)
      .groupBy(lot.lotTypeId, lot.variantId, lot.statusId);

    type Bucket = {
      prepared: number;
      active: number;
      completed: number;
      totalCost: number;
      totalQuantity: number;
    };
    const emptyBucket = (): Bucket => ({
      prepared: 0,
      active: 0,
      completed: 0,
      totalCost: 0,
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

      const statusInfo = statusCategoryById.get(row.statusId);
      const cat = statusInfo?.category ?? "unstarted";

      const cnt = row.total;
      const val = Number(row.totalCost) || 0;
      const qty = Number(row.totalQuantity) || 0;

      b.totalCost += val;
      b.totalQuantity += qty;
      tb.totalCost += val;
      tb.totalQuantity += qty;

      if (cat === "unstarted") {
        b.prepared += cnt;
        tb.prepared += cnt;
      } else if (cat === "done" || cat === "canceled") {
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
      totalCost: number;
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
          quantityUnit: t.qtyUom,
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
          quantityUnit: t.qtyUom,
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
            quantityUnit: t.qtyUom,
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
            quantityUnit: t.qtyUom,
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

  // ----- Lot Type Category CRUD -----

  listCategories: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getActiveOrgId(ctx.session);
    return ctx.db
      .select()
      .from(lotTypeCategory)
      .where(eq(lotTypeCategory.orgId, orgId))
      .orderBy(asc(lotTypeCategory.name));
  }),

  createCategory: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().nullable().optional(),
        color: z.string().nullable().optional(),
        icon: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const [created] = await ctx.db
        .insert(lotTypeCategory)
        .values({
          orgId,
          name: input.name,
          description: input.description,
          color: input.color,
          icon: input.icon,
        })
        .returning();
      return created;
    }),

  editCategory: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        name: z.string().min(1),
        description: z.string().nullable().optional(),
        color: z.string().nullable().optional(),
        icon: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const [updated] = await ctx.db
        .update(lotTypeCategory)
        .set({
          name: input.name,
          description: input.description,
          color: input.color,
          icon: input.icon,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(lotTypeCategory.id, input.id),
            eq(lotTypeCategory.orgId, orgId),
          ),
        )
        .returning();
      return updated ?? null;
    }),

  deleteCategory: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      await ctx.db
        .delete(lotTypeCategory)
        .where(
          and(
            eq(lotTypeCategory.id, input.id),
            eq(lotTypeCategory.orgId, orgId),
          ),
        );
    }),
});
