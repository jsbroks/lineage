import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  lotType,
  lotTypeVariant,
  lotTypeAttributeDefinition,
  lot,
  lotEvent,
  lotLineage,
  lotIdentifier,
  location,
  lotTypeStatusDefinition,
} from "~/server/db/schema";
import { getActiveOrgId } from "~/server/api/org";
import { resolveStatusId } from "~/server/api/helpers/resolve-status";

const createLotInput = z
  .object({
    hostname: z.string().min(1),
    lotTypeId: z.uuid(),
    variantId: z.uuid().nullable().optional(),
    code: z.string().min(1).optional(),
    useSequence: z.boolean().default(false),
    status: z.string().min(1).default("created"),
    uom: z.string().min(1).default("each"),
    locationId: z.uuid().nullable().optional(),
    notes: z.string().nullable().optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((input, ctx) => {
    if (!input.useSequence && !input.code) {
      ctx.addIssue({
        code: "custom",
        message: "code is required when useSequence is false",
        path: ["code"],
      });
    }
  });

const batchCreateLotsInput = z
  .object({
    lotTypeId: z.uuid(),
    variantId: z.uuid().nullable().optional(),
    useSequence: z.boolean().default(false),
    codes: z.array(z.string().min(1)).max(1000).optional(),
    prefix: z.string().min(1).optional(),
    start: z.number().int().positive().default(1),
    count: z.number().int().positive().max(1000).optional(),
    padTo: z.number().int().nonnegative().max(12).default(0),
    status: z.string().min(1).default("created"),
    locationId: z.uuid().nullable().optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((input, ctx) => {
    if (input.useSequence) {
      if (!input.count) {
        ctx.addIssue({
          code: "custom",
          message: "`count` is required when using sequence generation.",
          path: ["count"],
        });
      }
      return;
    }

    const hasExplicitValues = !!input.codes?.length;
    const hasGenerator = !!input.prefix && !!input.count;

    if (!hasExplicitValues && !hasGenerator) {
      ctx.addIssue({
        code: "custom",
        message:
          "Provide either `codes`, both `prefix` and `count`, or set `useSequence` to true.",
      });
    }

    if (hasExplicitValues && hasGenerator) {
      ctx.addIssue({
        code: "custom",
        message:
          "Use either explicit `codes` or generator options (`prefix` + `count`), not both.",
      });
    }
  });

export const lotRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getActiveOrgId(ctx.session);
    return ctx.db
      .select()
      .from(lot)
      .where(eq(lot.orgId, orgId))
      .orderBy(desc(lot.createdAt));
  }),

  recentActivity: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const events = await ctx.db
        .select({
          id: lotEvent.id,
          lotId: lotEvent.lotId,
          name: lotEvent.name,
          eventType: lotEvent.eventType,
          attributes: lotEvent.attributes,
          recordedAt: lotEvent.recordedAt,
          lotCode: lot.code,
          lotTypeName: lotType.name,
          lotTypeIcon: lotType.icon,
          lotTypeColor: lotType.color,
        })
        .from(lotEvent)
        .innerJoin(lot, eq(lotEvent.lotId, lot.id))
        .innerJoin(lotType, eq(lot.lotTypeId, lotType.id))
        .where(eq(lot.orgId, orgId))
        .orderBy(desc(lotEvent.recordedAt))
        .limit(input.limit);

      return events;
    }),

  getByCode: protectedProcedure
    .input(z.object({ code: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const [currentLot] = await ctx.db
        .select()
        .from(lot)
        .where(and(eq(lot.code, input.code), eq(lot.orgId, orgId)))
        .limit(1);

      if (!currentLot) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lot not found",
        });
      }

      const [currentLotType] = await ctx.db
        .select()
        .from(lotType)
        .where(eq(lotType.id, currentLot.lotTypeId))
        .limit(1);

      const [status] = await ctx.db
        .select({
          name: lotTypeStatusDefinition.name,
          color: lotTypeStatusDefinition.color,
        })
        .from(lotTypeStatusDefinition)
        .where(eq(lotTypeStatusDefinition.id, currentLot.statusId))
        .limit(1);

      const [variant] = currentLot.variantId
        ? await ctx.db
            .select({ name: lotTypeVariant.name })
            .from(lotTypeVariant)
            .where(eq(lotTypeVariant.id, currentLot.variantId))
            .limit(1)
        : [undefined];

      return {
        lot: currentLot,
        lotType: currentLotType ?? null,
        status: status ?? null,
        variant: variant ?? null,
      };
    }),

  create: protectedProcedure
    .input(createLotInput)
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const createdLot = await ctx.db.transaction(async (tx) => {
        const [it] = await tx
          .select()
          .from(lotType)
          .where(eq(lotType.id, input.lotTypeId))
          .limit(1);

        const resolvedStatusId = await resolveStatusId(
          tx,
          input.lotTypeId,
          input.status,
        );

        let codeValue = input.code ?? "";

        if (input.useSequence) {
          if (!it?.codePrefix) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "No code sequence configured for this lot type",
            });
          }

          const paddedNumber = String(it.codeNextNumber).padStart(5, "0");
          codeValue = `${it.codePrefix}-${paddedNumber}`;

          await tx
            .update(lotType)
            .set({ codeNextNumber: it.codeNextNumber + 1 })
            .where(eq(lotType.id, it.id));
        }

        const [newLot] = await tx
          .insert(lot)
          .values({
            orgId,
            lotTypeId: input.lotTypeId,
            variantId: input.variantId ?? null,
            code: codeValue,
            statusId: resolvedStatusId,
            quantityUnit: it?.qtyUom ?? "each",
            locationId: input.locationId,
            notes: input.notes,
            attributes: input.attributes ?? {},
          })
          .returning();

        if (!newLot) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create lot",
          });
        }

        await tx.insert(lotIdentifier).values({
          orgId,
          lotId: newLot.id,
          identifierType: "Code",
          identifierValue: codeValue,
        });

        return newLot;
      });

      if (!createdLot) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create lot",
        });
      }
      const [it] = await ctx.db
        .select()
        .from(lotType)
        .where(eq(lotType.id, createdLot.lotTypeId))
        .limit(1);

      if (!it) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lot type not found",
        });
      }

      await ctx.db.insert(lotEvent).values({
        lotId: createdLot.id,
        name: "Created",
        eventType: "creation",
        attributes: {
          source: "manual",
          code: createdLot.code,
          statusId: createdLot.statusId,
          locationId: createdLot.locationId,
        },
      });

      return createdLot;
    }),

  getById: protectedProcedure
    .input(z.object({ lotId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const [currentLot] = await ctx.db
        .select()
        .from(lot)
        .where(and(eq(lot.id, input.lotId), eq(lot.orgId, orgId)))
        .limit(1);

      if (!currentLot) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lot not found",
        });
      }

      const [currentLotType] = await ctx.db
        .select()
        .from(lotType)
        .where(eq(lotType.id, currentLot.lotTypeId))
        .limit(1);

      const identifiers = await ctx.db
        .select()
        .from(lotIdentifier)
        .where(eq(lotIdentifier.lotId, currentLot.id))
        .orderBy(desc(lotIdentifier.createdAt));

      const events = await ctx.db
        .select()
        .from(lotEvent)
        .where(eq(lotEvent.lotId, currentLot.id))
        .orderBy(desc(lotEvent.recordedAt));

      const parentLinks = await ctx.db
        .select()
        .from(lotLineage)
        .where(eq(lotLineage.childLotId, currentLot.id))
        .orderBy(desc(lotLineage.createdAt));

      const childLinks = await ctx.db
        .select()
        .from(lotLineage)
        .where(eq(lotLineage.parentLotId, currentLot.id))
        .orderBy(desc(lotLineage.createdAt));

      const parentLots = parentLinks.length
        ? await ctx.db
            .select()
            .from(lot)
            .where(
              inArray(
                lot.id,
                parentLinks.map((link) => link.parentLotId),
              ),
            )
        : [];

      const childLots = childLinks.length
        ? await ctx.db
            .select()
            .from(lot)
            .where(
              inArray(
                lot.id,
                childLinks.map((link) => link.childLotId),
              ),
            )
        : [];

      const [currentVariant] = currentLot.variantId
        ? await ctx.db
            .select()
            .from(lotTypeVariant)
            .where(eq(lotTypeVariant.id, currentLot.variantId))
            .limit(1)
        : [undefined];

      const [currentLocation] = currentLot.locationId
        ? await ctx.db
            .select()
            .from(location)
            .where(eq(location.id, currentLot.locationId))
            .limit(1)
        : [undefined];

      return {
        lot: currentLot,
        lotType: currentLotType ?? null,
        variant: currentVariant ?? null,
        location: currentLocation ?? null,
        identifiers,
        events,
        parentLineage: parentLinks.map((link) => ({
          link,
          lot:
            parentLots.find((parentLot) => parentLot.id === link.parentLotId) ??
            null,
        })),
        childLineage: childLinks.map((link) => ({
          link,
          lot:
            childLots.find((childLot) => childLot.id === link.childLotId) ??
            null,
        })),
      };
    }),

  batchCreate: protectedProcedure
    .input(batchCreateLotsInput)
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      return ctx.db.transaction(async (tx) => {
        const resolvedStatusId = await resolveStatusId(
          tx,
          input.lotTypeId,
          input.status,
        );

        let uniqueCodes: string[];

        if (input.useSequence) {
          const [it] = await tx
            .select()
            .from(lotType)
            .where(eq(lotType.id, input.lotTypeId))
            .limit(1);

          if (!it?.codePrefix) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message:
                "No code sequence configured for this lot type. Set a code prefix first.",
            });
          }

          const batchCount = input.count ?? 0;
          const startNum = it.codeNextNumber;
          uniqueCodes = Array.from({ length: batchCount }, (_, i) => {
            const padded = String(startNum + i).padStart(5, "0");
            return `${it.codePrefix}-${padded}`;
          });

          await tx
            .update(lotType)
            .set({ codeNextNumber: startNum + batchCount })
            .where(eq(lotType.id, it.id));
        } else {
          const generatedCodes =
            input.codes
              ?.map((code) => code.trim())
              .filter((code) => code.length > 0) ??
            Array.from({ length: input.count ?? 0 }, (_, index) => {
              const sequenceNumber = String(input.start + index).padStart(
                input.padTo,
                "0",
              );
              return `${input.prefix ?? ""}${sequenceNumber}`;
            });

          uniqueCodes = [...new Set(generatedCodes)];

          if (uniqueCodes.length !== generatedCodes.length) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Duplicate lot codes detected in request payload.",
            });
          }
        }

        if (uniqueCodes.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No lot codes to create.",
          });
        }

        const existingRows = await tx
          .select({ code: lot.code })
          .from(lot)
          .where(inArray(lot.code, uniqueCodes));

        if (existingRows.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Some lot codes already exist: ${existingRows
              .map((row) => row.code)
              .join(", ")}`,
          });
        }

        const insertedLots = await tx
          .insert(lot)
          .values(
            uniqueCodes.map((code) => ({
              orgId,
              lotTypeId: input.lotTypeId,
              variantId: input.variantId ?? null,
              code,
              statusId: resolvedStatusId,
              locationId: input.locationId,
              attributes: input.attributes ?? {},
            })),
          )
          .returning();

        if (insertedLots.length > 0) {
          const [it] = await tx
            .select({ name: lotType.name })
            .from(lotType)
            .where(eq(lotType.id, input.lotTypeId))
            .limit(1);

          const typeName = it?.name ?? "Lot";

          await tx.insert(lotEvent).values(
            insertedLots.map((created) => ({
              lotId: created.id,
              name: "Created",
              eventType: "creation",
              attributes: {
                source: "batch",
                code: created.code,
                batchSize: insertedLots.length,
                statusId: created.statusId,
                locationId: created.locationId,
              },
            })),
          );
        }

        return {
          created: insertedLots.length,
          lots: insertedLots,
        };
      });
    }),

  listByType: protectedProcedure
    .input(
      z.object({
        lotTypeId: z.uuid(),
        status: z.string().optional(),
        variantId: z.uuid().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const conditions = [
        eq(lot.orgId, orgId),
        eq(lot.lotTypeId, input.lotTypeId),
      ];
      if (input.status) conditions.push(eq(lot.statusId, input.status));
      if (input.variantId) conditions.push(eq(lot.variantId, input.variantId));
      if (input.search) conditions.push(ilike(lot.code, `%${input.search}%`));

      const lots = await ctx.db
        .select({
          id: lot.id,
          code: lot.code,
          status: lot.statusId,
          variantId: lot.variantId,
          variantName: lotTypeVariant.name,
          locationId: lot.locationId,
          locationName: location.name,
          quantity: lot.quantity,
          quantityUom: lot.quantityUnit,
          notes: lot.notes,
          createdAt: lot.createdAt,
          updatedAt: lot.updatedAt,
        })
        .from(lot)
        .leftJoin(lotTypeVariant, eq(lot.variantId, lotTypeVariant.id))
        .leftJoin(location, eq(lot.locationId, location.id))
        .where(and(...conditions))
        .orderBy(desc(lot.createdAt), desc(lot.code))
        .limit(500);

      return lots;
    }),

  listForPrint: protectedProcedure
    .input(
      z.object({
        lotIds: z.array(z.uuid()).min(1).max(500),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: lot.id,
          code: lot.code,
          typeName: lotType.name,
          variantName: lotTypeVariant.name,
        })
        .from(lot)
        .innerJoin(lotType, eq(lot.lotTypeId, lotType.id))
        .leftJoin(lotTypeVariant, eq(lot.variantId, lotTypeVariant.id))
        .where(inArray(lot.id, input.lotIds));

      return rows;
    }),

  statusCountsByType: protectedProcedure
    .input(z.object({ lotTypeId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          status: lot.statusId,
          total: count(),
        })
        .from(lot)
        .where(eq(lot.lotTypeId, input.lotTypeId))
        .groupBy(lot.statusId);

      const statuses = await ctx.db
        .select()
        .from(lotTypeStatusDefinition)
        .where(eq(lotTypeStatusDefinition.lotTypeId, input.lotTypeId))
        .orderBy(asc(lotTypeStatusDefinition.ordinal));

      return { counts: rows, statuses };
    }),

  updateAttributes: protectedProcedure
    .input(
      z.object({
        lotId: z.uuid(),
        attributes: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(lot)
        .where(eq(lot.id, input.lotId))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lot not found",
        });
      }

      const oldAttrs = (existing.attributes as Record<string, unknown>) ?? {};
      const newAttrs = input.attributes;

      const [updated] = await ctx.db
        .update(lot)
        .set({ attributes: newAttrs, updatedAt: new Date() })
        .where(eq(lot.id, input.lotId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lot not found",
        });
      }

      const changes: Record<string, { from: unknown; to: unknown }> = {};
      const allKeys = new Set([
        ...Object.keys(oldAttrs),
        ...Object.keys(newAttrs),
      ]);
      for (const key of allKeys) {
        const oldVal = oldAttrs[key] ?? null;
        const newVal = newAttrs[key] ?? null;
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changes[key] = { from: oldVal, to: newVal };
        }
      }

      if (Object.keys(changes).length > 0) {
        const changedKeys = Object.keys(changes);
        const summary =
          changedKeys.length <= 3
            ? changedKeys.join(", ")
            : `${changedKeys.slice(0, 3).join(", ")} +${changedKeys.length - 3} more`;

        await ctx.db.insert(lotEvent).values({
          lotId: input.lotId,
          name: `${summary} updated`,
          eventType: "attribute_change",
          attributes: { changes },
        });
      }

      return updated;
    }),

  bulkSetLocation: protectedProcedure
    .input(
      z.object({
        lotIds: z.array(z.uuid()).min(1).max(1000),
        locationId: z.uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [loc] = await ctx.db
        .select({ name: location.name })
        .from(location)
        .where(eq(location.id, input.locationId))
        .limit(1);

      const updated = await ctx.db
        .update(lot)
        .set({ locationId: input.locationId, updatedAt: new Date() })
        .where(inArray(lot.id, input.lotIds))
        .returning({ id: lot.id });

      if (updated.length > 0) {
        await ctx.db.insert(lotEvent).values(
          updated.map((u) => ({
            lotId: u.id,
            name: "Move",
            eventType: "move",
            attributes: {
              newLocationId: input.locationId,
              locationName: loc?.name ?? null,
            },
          })),
        );
      }

      return { updated: updated.length };
    }),

  bulkUpdateStatus: protectedProcedure
    .input(
      z.object({
        lotIds: z.array(z.uuid()).min(1).max(1000),
        status: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const oldLots = await ctx.db
        .select({ id: lot.id, statusId: lot.statusId })
        .from(lot)
        .where(inArray(lot.id, input.lotIds));

      const updated = await ctx.db
        .update(lot)
        .set({ statusId: input.status, updatedAt: new Date() })
        .where(inArray(lot.id, input.lotIds))
        .returning({ id: lot.id });

      if (updated.length > 0) {
        const oldStatusMap = new Map(oldLots.map((i) => [i.id, i.statusId]));

        await ctx.db.insert(lotEvent).values(
          updated
            .filter((u) => oldStatusMap.get(u.id) !== input.status)
            .map((u) => {
              const oldStatusId = oldStatusMap.get(u.id);
              return {
                lotId: u.id,
                name: "Status Change",
                eventType: "status_change",
                attributes: {
                  oldStatus: oldStatusId ?? null,
                  newStatus: input.status,
                },
              };
            }),
        );
      }

      return { updated: updated.length };
    }),

  bulkSetVariant: protectedProcedure
    .input(
      z.object({
        lotIds: z.array(z.uuid()).min(1).max(1000),
        variantId: z.uuid().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const oldLots = await ctx.db
        .select({ id: lot.id, variantId: lot.variantId })
        .from(lot)
        .where(inArray(lot.id, input.lotIds));
      const oldVariantMap = new Map(oldLots.map((i) => [i.id, i.variantId]));

      const insertVariantEvents = async (updatedIds: string[]) => {
        const changed = updatedIds.filter(
          (id) => oldVariantMap.get(id) !== input.variantId,
        );
        if (changed.length === 0) return;

        await ctx.db.insert(lotEvent).values(
          changed.map((id) => {
            const oldVarId = oldVariantMap.get(id) ?? null;
            return {
              lotId: id,
              name: "Variant Change",
              eventType: "attribute_change",
              attributes: {
                oldVariantId: oldVarId,
                newVariantId: input.variantId,
              },
            };
          }),
        );
      };

      if (!input.variantId) {
        const updated = await ctx.db
          .update(lot)
          .set({ variantId: null, updatedAt: new Date() })
          .where(inArray(lot.id, input.lotIds))
          .returning({ id: lot.id });
        await insertVariantEvents(updated.map((u) => u.id));
        return { updated: updated.length };
      }

      const [variant] = await ctx.db
        .select()
        .from(lotTypeVariant)
        .where(eq(lotTypeVariant.id, input.variantId))
        .limit(1);

      if (!variant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Variant not found",
        });
      }

      const hasDefaults =
        variant.defaultValue !== null ||
        variant.defaultValueCurrency !== null ||
        variant.defaultQuantity !== null ||
        variant.defaultQuantityUnit !== null ||
        variant.defaultAttributes !== null;

      if (!hasDefaults) {
        const updated = await ctx.db
          .update(lot)
          .set({ variantId: input.variantId, updatedAt: new Date() })
          .where(inArray(lot.id, input.lotIds))
          .returning({ id: lot.id });
        await insertVariantEvents(updated.map((u) => u.id));
        return { updated: updated.length };
      }

      const defaults: Record<string, unknown> = {
        variantId: input.variantId,
        updatedAt: new Date(),
      };
      if (variant.defaultValue !== null) defaults.value = variant.defaultValue;
      if (variant.defaultValueCurrency !== null)
        defaults.valueCurrency = variant.defaultValueCurrency;
      if (variant.defaultQuantity !== null)
        defaults.quantity = variant.defaultQuantity;
      if (variant.defaultQuantityUnit !== null)
        defaults.quantityUnit = variant.defaultQuantityUnit;

      if (variant.defaultAttributes !== null) {
        const variantAttrs = variant.defaultAttributes as Record<
          string,
          unknown
        >;
        const lots = await ctx.db
          .select({ id: lot.id, attributes: lot.attributes })
          .from(lot)
          .where(inArray(lot.id, input.lotIds));

        const updatedIds: string[] = [];
        for (const it of lots) {
          const existing = (it.attributes ?? {}) as Record<string, unknown>;
          await ctx.db
            .update(lot)
            .set({
              ...(defaults as typeof lot.$inferInsert),
              attributes: { ...variantAttrs, ...existing },
            })
            .where(eq(lot.id, it.id));
          updatedIds.push(it.id);
        }
        await insertVariantEvents(updatedIds);
        return { updated: updatedIds.length };
      }

      const updated = await ctx.db
        .update(lot)
        .set(defaults as typeof lot.$inferInsert)
        .where(inArray(lot.id, input.lotIds))
        .returning({ id: lot.id });
      await insertVariantEvents(updated.map((u) => u.id));
      return { updated: updated.length };
    }),

  bulkSetAttributes: protectedProcedure
    .input(
      z.object({
        lotIds: z.array(z.uuid()).min(1).max(1000),
        attributes: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const lots = await ctx.db
        .select({ id: lot.id, attributes: lot.attributes })
        .from(lot)
        .where(inArray(lot.id, input.lotIds));

      let updatedCount = 0;
      const eventRows: {
        lotId: string;
        name: string;
        eventType: string;
        attributes: Record<string, unknown>;
      }[] = [];

      for (const existing of lots) {
        const oldAttrs = (existing.attributes as Record<string, unknown>) ?? {};
        const merged = { ...oldAttrs, ...input.attributes };
        await ctx.db
          .update(lot)
          .set({ attributes: merged, updatedAt: new Date() })
          .where(eq(lot.id, existing.id));
        updatedCount++;

        const changes: Record<string, { from: unknown; to: unknown }> = {};
        for (const key of Object.keys(input.attributes)) {
          const oldVal = oldAttrs[key] ?? null;
          const newVal = input.attributes[key] ?? null;
          if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes[key] = { from: oldVal, to: newVal };
          }
        }

        if (Object.keys(changes).length > 0) {
          const changedKeys = Object.keys(changes);
          const summary =
            changedKeys.length <= 3
              ? changedKeys.join(", ")
              : `${changedKeys.slice(0, 3).join(", ")} +${changedKeys.length - 3} more`;

          eventRows.push({
            lotId: existing.id,
            name: `${summary} updated`,
            eventType: "attribute_change",
            attributes: { changes },
          });
        }
      }

      if (eventRows.length > 0) {
        await ctx.db.insert(lotEvent).values(eventRows);
      }

      return { updated: updatedCount };
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ lotIds: z.array(z.uuid()).min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(lotLineage)
        .where(inArray(lotLineage.parentLotId, input.lotIds));
      await ctx.db
        .delete(lotLineage)
        .where(inArray(lotLineage.childLotId, input.lotIds));
      await ctx.db
        .delete(lotEvent)
        .where(inArray(lotEvent.lotId, input.lotIds));
      await ctx.db
        .delete(lotIdentifier)
        .where(inArray(lotIdentifier.lotId, input.lotIds));

      const deleted = await ctx.db
        .delete(lot)
        .where(inArray(lot.id, input.lotIds))
        .returning({ id: lot.id });

      return { deleted: deleted.length };
    }),

  resolveIdentifier: protectedProcedure
    .input(z.object({ identifierValue: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);

      const [ident] = await ctx.db
        .select({ lotId: lotIdentifier.lotId })
        .from(lotIdentifier)
        .where(
          and(
            eq(lotIdentifier.orgId, orgId),
            eq(lotIdentifier.identifierValue, input.identifierValue),
          ),
        )
        .limit(1);

      if (!ident) return null;

      const [currentLot] = await ctx.db
        .select()
        .from(lot)
        .where(eq(lot.id, ident.lotId))
        .limit(1);

      if (!currentLot) return null;

      const [currentLotType] = await ctx.db
        .select()
        .from(lotType)
        .where(eq(lotType.id, currentLot.lotTypeId))
        .limit(1);

      const [status] = await ctx.db
        .select({
          name: lotTypeStatusDefinition.name,
          color: lotTypeStatusDefinition.color,
        })
        .from(lotTypeStatusDefinition)
        .where(eq(lotTypeStatusDefinition.id, currentLot.statusId))
        .limit(1);

      const [variant] = currentLot.variantId
        ? await ctx.db
            .select({ name: lotTypeVariant.name })
            .from(lotTypeVariant)
            .where(eq(lotTypeVariant.id, currentLot.variantId))
            .limit(1)
        : [undefined];

      return {
        lot: currentLot,
        lotType: currentLotType ?? null,
        status: status ?? null,
        variant: variant ?? null,
      };
    }),

  addIdentifier: protectedProcedure
    .input(
      z.object({
        lotId: z.uuid(),
        identifierType: z.string().min(1),
        identifierValue: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);

      const [existing] = await ctx.db
        .select()
        .from(lotIdentifier)
        .where(
          and(
            eq(lotIdentifier.orgId, orgId),
            eq(lotIdentifier.identifierValue, input.identifierValue),
          ),
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This identifier is already linked to a lot.",
        });
      }

      const [created] = await ctx.db
        .insert(lotIdentifier)
        .values({
          orgId,
          lotId: input.lotId,
          identifierType: input.identifierType,
          identifierValue: input.identifierValue,
        })
        .returning();

      return created;
    }),

  aggregate: protectedProcedure
    .input(
      z.object({
        lotTypeId: z.uuid(),
        groupBy: z.array(z.string()).max(4),
        metrics: z
          .array(
            z.object({
              field: z.string(),
              op: z.enum(["count", "sum", "avg", "min", "max"]),
            }),
          )
          .max(6),
        filters: z
          .object({
            status: z.string().optional(),
            variantId: z.uuid().optional(),
            locationId: z.uuid().optional(),
            attrFilters: z
              .array(
                z.object({
                  key: z.string(),
                  op: z.enum(["eq", "gte", "lte"]),
                  value: z.string(),
                }),
              )
              .optional(),
          })
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const BUILTIN_FIELDS = new Set([
        "status",
        "variant",
        "location",
        "quantity",
        "value",
      ]);

      const attrDefs = await ctx.db
        .select()
        .from(lotTypeAttributeDefinition)
        .where(eq(lotTypeAttributeDefinition.lotTypeId, input.lotTypeId));

      const allowedAttrKeys = new Set(attrDefs.map((d) => d.attrKey));
      const attrTypeMap = new Map(attrDefs.map((d) => [d.attrKey, d.dataType]));

      const resolveField = (field: string) => {
        if (BUILTIN_FIELDS.has(field))
          return { kind: "builtin" as const, key: field };
        if (field.startsWith("attr:")) {
          const key = field.slice(5);
          if (!allowedAttrKeys.has(key)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Unknown attribute field: ${key}`,
            });
          }
          return { kind: "attr" as const, key };
        }
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unknown field: ${field}`,
        });
      };

      const groupByExprs: {
        field: string;
        label: string;
        expr: ReturnType<typeof sql>;
      }[] = [];
      for (const field of input.groupBy) {
        const resolved = resolveField(field);
        if (resolved.kind === "builtin") {
          switch (resolved.key) {
            case "status":
              groupByExprs.push({
                field,
                label: "Status",
                expr: sql`${lotTypeStatusDefinition.name}`,
              });
              break;
            case "variant":
              groupByExprs.push({
                field,
                label: "Variant",
                expr: sql`${lotTypeVariant.name}`,
              });
              break;
            case "location":
              groupByExprs.push({
                field,
                label: "Location",
                expr: sql`${location.name}`,
              });
              break;
            default:
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Cannot group by ${resolved.key}`,
              });
          }
        } else {
          groupByExprs.push({
            field,
            label: resolved.key,
            expr: sql`${lot.attributes}->>${sql.raw(`'${resolved.key.replace(/'/g, "''")}'`)}`,
          });
        }
      }

      const metricExprs: {
        field: string;
        label: string;
        expr: ReturnType<typeof sql>;
      }[] = [];
      for (const m of input.metrics) {
        const resolved = resolveField(m.field);
        let valueExpr: ReturnType<typeof sql>;

        if (resolved.kind === "builtin") {
          switch (resolved.key) {
            case "quantity":
              valueExpr = sql`${lot.quantity}::numeric`;
              break;
            case "value":
              valueExpr = sql`${lot.value}::numeric`;
              break;
            default:
              if (m.op === "count") {
                valueExpr = sql`1`;
                break;
              }
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Cannot aggregate ${resolved.key} with ${m.op}`,
              });
          }
        } else {
          const escapedKey = resolved.key.replace(/'/g, "''");
          const raw = sql`${lot.attributes}->>${sql.raw(`'${escapedKey}'`)}`;
          valueExpr = sql`CASE WHEN ${raw} ~ '^-?[0-9]*\\.?[0-9]+$' THEN (${raw})::numeric ELSE 0 END`;
        }

        const label = `${m.op}(${resolved.kind === "attr" ? resolved.key : resolved.key})`;
        switch (m.op) {
          case "count":
            metricExprs.push({
              field: `${m.op}_${m.field}`,
              label,
              expr: sql`COUNT(*)`,
            });
            break;
          case "sum":
            metricExprs.push({
              field: `${m.op}_${m.field}`,
              label,
              expr: sql`SUM(${valueExpr})`,
            });
            break;
          case "avg":
            metricExprs.push({
              field: `${m.op}_${m.field}`,
              label,
              expr: sql`AVG(${valueExpr})`,
            });
            break;
          case "min":
            metricExprs.push({
              field: `${m.op}_${m.field}`,
              label,
              expr: sql`MIN(${valueExpr})`,
            });
            break;
          case "max":
            metricExprs.push({
              field: `${m.op}_${m.field}`,
              label,
              expr: sql`MAX(${valueExpr})`,
            });
            break;
        }
      }

      const conditions = [
        eq(lot.orgId, orgId),
        eq(lot.lotTypeId, input.lotTypeId),
      ];
      if (input.filters?.status)
        conditions.push(eq(lot.statusId, input.filters.status));
      if (input.filters?.variantId)
        conditions.push(eq(lot.variantId, input.filters.variantId));
      if (input.filters?.locationId)
        conditions.push(eq(lot.locationId, input.filters.locationId));

      if (input.filters?.attrFilters) {
        for (const af of input.filters.attrFilters) {
          if (!allowedAttrKeys.has(af.key)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Unknown attribute filter key: ${af.key}`,
            });
          }
          const escapedKey = af.key.replace(/'/g, "''");
          const jsonbExpr = sql`${lot.attributes}->>${sql.raw(`'${escapedKey}'`)}`;
          const dt = attrTypeMap.get(af.key);

          switch (af.op) {
            case "eq":
              conditions.push(sql`lower(${jsonbExpr}) = lower(${af.value})`);
              break;
            case "gte":
              if (dt === "date") {
                conditions.push(
                  sql`(${jsonbExpr})::timestamp >= ${af.value}::timestamp`,
                );
              } else {
                conditions.push(
                  sql`(${jsonbExpr})::numeric >= ${af.value}::numeric`,
                );
              }
              break;
            case "lte":
              if (dt === "date") {
                conditions.push(
                  sql`(${jsonbExpr})::timestamp <= ${af.value}::timestamp`,
                );
              } else {
                conditions.push(
                  sql`(${jsonbExpr})::numeric <= ${af.value}::numeric`,
                );
              }
              break;
          }
        }
      }

      const needsStatusJoin = input.groupBy.includes("status");
      const needsVariantJoin = input.groupBy.includes("variant");
      const needsLocationJoin =
        input.groupBy.includes("location") || !!input.filters?.locationId;

      const selectCols: Record<string, ReturnType<typeof sql>> = {};
      for (const g of groupByExprs) selectCols[g.field] = g.expr;
      for (const m of metricExprs) selectCols[m.field] = m.expr;

      if (groupByExprs.length === 0 && metricExprs.length === 0) {
        return { columns: [], rows: [] };
      }

      let query = ctx.db.select(selectCols).from(lot).$dynamic();

      if (needsStatusJoin) {
        query = query.leftJoin(
          lotTypeStatusDefinition,
          eq(lot.statusId, lotTypeStatusDefinition.id),
        );
      }
      if (needsVariantJoin) {
        query = query.leftJoin(
          lotTypeVariant,
          eq(lot.variantId, lotTypeVariant.id),
        );
      }
      if (needsLocationJoin) {
        query = query.leftJoin(location, eq(lot.locationId, location.id));
      }

      query = query.where(and(...conditions));

      if (groupByExprs.length > 0) {
        query = query.groupBy(...groupByExprs.map((g) => g.expr));
      }

      const rows = await query;

      const hasValueMetric = input.metrics.some((m) => m.field === "value");
      let valueCurrency: string | null = null;
      if (hasValueMetric) {
        const [currencyRow] = await ctx.db
          .select({ cur: sql<string>`${lot.valueCurrency}` })
          .from(lot)
          .where(
            and(
              eq(lot.lotTypeId, input.lotTypeId),
              sql`${lot.valueCurrency} IS NOT NULL`,
            ),
          )
          .groupBy(lot.valueCurrency)
          .orderBy(sql`COUNT(*) DESC`)
          .limit(1);
        valueCurrency = currencyRow?.cur ?? null;
      }

      const valueMetricKeys = new Set(
        input.metrics
          .filter((m) => m.field === "value" && m.op !== "count")
          .map((m) => `${m.op}_${m.field}`),
      );

      const columns = [
        ...groupByExprs.map((g) => ({ key: g.field, label: g.label })),
        ...metricExprs.map((m) => ({
          key: m.field,
          label: m.label,
          isCurrency: valueMetricKeys.has(m.field),
        })),
      ];

      return {
        columns,
        valueCurrency,
        rows: rows.map((row) => {
          const out: Record<string, string | number> = {};
          for (const col of columns) {
            const val = (row as Record<string, unknown>)[col.key];
            out[col.key] = typeof val === "number" ? val : String(val ?? "");
          }
          return out;
        }),
      };
    }),
});
