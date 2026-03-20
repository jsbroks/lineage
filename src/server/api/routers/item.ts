import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  itemType,
  itemTypeVariant,
  itemTypeAttributeDefinition,
  item,
  itemEvent,
  itemIdentifier,
  itemLineage,
  location,
  itemTypeStatusDefinition,
} from "~/server/db/schema";

const createItemInput = z
  .object({
    hostname: z.string().min(1),
    itemTypeId: z.uuid(),
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

const batchCreateItemsInput = z
  .object({
    itemTypeId: z.uuid(),
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

export const itemRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(item).orderBy(desc(item.createdAt));
  }),

  getByCode: publicProcedure
    .input(z.object({ code: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [currentItem] = await ctx.db
        .select()
        .from(item)
        .where(eq(item.code, input.code))
        .limit(1);

      if (!currentItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item not found",
        });
      }

      const [currentItemType] = await ctx.db
        .select()
        .from(itemType)
        .where(eq(itemType.id, currentItem.itemTypeId))
        .limit(1);

      const [status] = await ctx.db
        .select({ name: itemTypeStatusDefinition.name, color: itemTypeStatusDefinition.color })
        .from(itemTypeStatusDefinition)
        .where(eq(itemTypeStatusDefinition.id, currentItem.statusId))
        .limit(1);

      const [variant] = currentItem.variantId
        ? await ctx.db
            .select({ name: itemTypeVariant.name })
            .from(itemTypeVariant)
            .where(eq(itemTypeVariant.id, currentItem.variantId))
            .limit(1)
        : [undefined];

      return {
        item: currentItem,
        itemType: currentItemType ?? null,
        status: status ?? null,
        variant: variant ?? null,
      };
    }),

  create: publicProcedure
    .input(createItemInput)
    .mutation(async ({ ctx, input }) => {
      const createdItem = await ctx.db.transaction(async (tx) => {
        const [it] = await tx
          .select()
          .from(itemType)
          .where(eq(itemType.id, input.itemTypeId))
          .limit(1);

        let codeValue = input.code ?? "";

        if (input.useSequence) {
          if (!it?.codePrefix) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "No code sequence configured for this item type",
            });
          }

          const paddedNumber = String(it.codeNextNumber).padStart(5, "0");
          codeValue = `${it.codePrefix}-${paddedNumber}`;

          await tx
            .update(itemType)
            .set({ codeNextNumber: it.codeNextNumber + 1 })
            .where(eq(itemType.id, it.id));
        }

        const [newItem] = await tx
          .insert(item)
          .values({
            itemTypeId: input.itemTypeId,
            code: codeValue,
            statusId: input.status,
            quantityUnit: it?.quantityDefaultUnit ?? "each",
            locationId: input.locationId,
            notes: input.notes,
            attributes: input.attributes ?? {},
          })
          .returning();

        if (!newItem) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create item",
          });
        }

        const [linkedIdentifier] = await tx
          .select()
          .from(itemIdentifier)
          .where(eq(itemIdentifier.itemId, newItem.id))
          .limit(1);

        if (!linkedIdentifier) {
          await tx.insert(itemIdentifier).values({
            itemId: newItem.id,
            identifierType: "QR Code",
            identifierValue: `${input.hostname}/l/${newItem.id}`,
            linkedAt: new Date(),
            isActive: true,
          });
        }

        return newItem;
      });

      if (!createdItem) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create item",
        });
      }
      const [it] = await ctx.db
        .select()
        .from(itemType)
        .where(eq(itemType.id, createdItem.itemTypeId))
        .limit(1);

      if (!it) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item type not found",
        });
      }

      await ctx.db.insert(itemEvent).values({
        itemId: createdItem.id,
        eventType: "item_created_manual",
        newStatus: createdItem.statusId,
        newLocationId: createdItem.locationId,
        message: `${it.name} created manually.`,
        payload: {
          code: createdItem.code,
        },
      });

      return createdItem;
    }),

  getById: publicProcedure
    .input(z.object({ itemId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const [currentItem] = await ctx.db
        .select()
        .from(item)
        .where(eq(item.id, input.itemId))
        .limit(1);

      if (!currentItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item not found",
        });
      }

      const [currentItemType] = await ctx.db
        .select()
        .from(itemType)
        .where(eq(itemType.id, currentItem.itemTypeId))
        .limit(1);

      const identifiers = await ctx.db
        .select()
        .from(itemIdentifier)
        .where(eq(itemIdentifier.itemId, currentItem.id))
        .orderBy(desc(itemIdentifier.createdAt));

      const events = await ctx.db
        .select()
        .from(itemEvent)
        .where(eq(itemEvent.itemId, currentItem.id))
        .orderBy(desc(itemEvent.recordedAt));

      const parentLinks = await ctx.db
        .select()
        .from(itemLineage)
        .where(eq(itemLineage.childItemId, currentItem.id))
        .orderBy(desc(itemLineage.createdAt));

      const childLinks = await ctx.db
        .select()
        .from(itemLineage)
        .where(eq(itemLineage.parentItemId, currentItem.id))
        .orderBy(desc(itemLineage.createdAt));

      const parentItems = parentLinks.length
        ? await ctx.db
            .select()
            .from(item)
            .where(
              inArray(
                item.id,
                parentLinks.map((link) => link.parentItemId),
              ),
            )
        : [];

      const childItems = childLinks.length
        ? await ctx.db
            .select()
            .from(item)
            .where(
              inArray(
                item.id,
                childLinks.map((link) => link.childItemId),
              ),
            )
        : [];

      const [currentVariant] = currentItem.variantId
        ? await ctx.db
            .select()
            .from(itemTypeVariant)
            .where(eq(itemTypeVariant.id, currentItem.variantId))
            .limit(1)
        : [undefined];

      const [currentLocation] = currentItem.locationId
        ? await ctx.db
            .select()
            .from(location)
            .where(eq(location.id, currentItem.locationId))
            .limit(1)
        : [undefined];

      return {
        item: currentItem,
        itemType: currentItemType ?? null,
        variant: currentVariant ?? null,
        location: currentLocation ?? null,
        identifiers,
        events,
        parentLineage: parentLinks.map((link) => ({
          link,
          item:
            parentItems.find(
              (parentItem) => parentItem.id === link.parentItemId,
            ) ?? null,
        })),
        childLineage: childLinks.map((link) => ({
          link,
          item:
            childItems.find((childItem) => childItem.id === link.childItemId) ??
            null,
        })),
      };
    }),

  batchCreate: publicProcedure
    .input(batchCreateItemsInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        let uniqueCodes: string[];

        if (input.useSequence) {
          const [it] = await tx
            .select()
            .from(itemType)
            .where(eq(itemType.id, input.itemTypeId))
            .limit(1);

          if (!it?.codePrefix) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message:
                "No code sequence configured for this item type. Set a code prefix first.",
            });
          }

          const batchCount = input.count ?? 0;
          const startNum = it.codeNextNumber;
          uniqueCodes = Array.from({ length: batchCount }, (_, i) => {
            const padded = String(startNum + i).padStart(5, "0");
            return `${it.codePrefix}-${padded}`;
          });

          await tx
            .update(itemType)
            .set({ codeNextNumber: startNum + batchCount })
            .where(eq(itemType.id, it.id));
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
              message: "Duplicate item codes detected in request payload.",
            });
          }
        }

        if (uniqueCodes.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No item codes to create.",
          });
        }

        const existingRows = await tx
          .select({ code: item.code })
          .from(item)
          .where(inArray(item.code, uniqueCodes));

        if (existingRows.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Some item codes already exist: ${existingRows
              .map((row) => row.code)
              .join(", ")}`,
          });
        }

        const insertedItems = await tx
          .insert(item)
          .values(
            uniqueCodes.map((code) => ({
              itemTypeId: input.itemTypeId,
              variantId: input.variantId ?? null,
              code,
              statusId: input.status,
              locationId: input.locationId,
              attributes: input.attributes ?? {},
            })),
          )
          .returning();

        if (insertedItems.length > 0) {
          const [it] = await tx
            .select({ name: itemType.name })
            .from(itemType)
            .where(eq(itemType.id, input.itemTypeId))
            .limit(1);

          const typeName = it?.name ?? "Item";

          await tx.insert(itemEvent).values(
            insertedItems.map((created) => ({
              itemId: created.id,
              eventType: "item_created_batch",
              newStatus: created.statusId,
              newLocationId: created.locationId,
              message: `${typeName} created via batch.`,
              payload: {
                code: created.code,
                batchSize: insertedItems.length,
              },
            })),
          );
        }

        return {
          created: insertedItems.length,
          items: insertedItems,
        };
      });
    }),

  listByType: publicProcedure
    .input(
      z.object({
        itemTypeId: z.uuid(),
        status: z.string().optional(),
        variantId: z.uuid().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(item.itemTypeId, input.itemTypeId)];
      if (input.status) conditions.push(eq(item.statusId, input.status));
      if (input.variantId) conditions.push(eq(item.variantId, input.variantId));
      if (input.search) conditions.push(ilike(item.code, `%${input.search}%`));

      const items = await ctx.db
        .select({
          id: item.id,
          code: item.code,
          status: item.statusId,
          variantId: item.variantId,
          variantName: itemTypeVariant.name,
          locationId: item.locationId,
          locationName: location.name,
          quantity: item.quantity,
          quantityUom: item.quantityUnit,
          notes: item.notes,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })
        .from(item)
        .leftJoin(itemTypeVariant, eq(item.variantId, itemTypeVariant.id))
        .leftJoin(location, eq(item.locationId, location.id))
        .where(and(...conditions))
        .orderBy(desc(item.createdAt), desc(item.code))
        .limit(500);

      return items;
    }),

  listForPrint: publicProcedure
    .input(
      z.object({
        itemIds: z.array(z.uuid()).min(1).max(500),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: item.id,
          code: item.code,
          typeName: itemType.name,
          variantName: itemTypeVariant.name,
        })
        .from(item)
        .innerJoin(itemType, eq(item.itemTypeId, itemType.id))
        .leftJoin(itemTypeVariant, eq(item.variantId, itemTypeVariant.id))
        .where(inArray(item.id, input.itemIds));

      return rows;
    }),

  statusCountsByType: publicProcedure
    .input(z.object({ itemTypeId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          status: item.statusId,
          total: count(),
        })
        .from(item)
        .where(eq(item.itemTypeId, input.itemTypeId))
        .groupBy(item.statusId);

      const statuses = await ctx.db
        .select()
        .from(itemTypeStatusDefinition)
        .where(eq(itemTypeStatusDefinition.itemTypeId, input.itemTypeId))
        .orderBy(asc(itemTypeStatusDefinition.ordinal));

      return { counts: rows, statuses };
    }),

  updateAttributes: publicProcedure
    .input(
      z.object({
        itemId: z.uuid(),
        attributes: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(item)
        .where(eq(item.id, input.itemId))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item not found",
        });
      }

      const oldAttrs = (existing.attributes as Record<string, unknown>) ?? {};
      const newAttrs = input.attributes;

      const [updated] = await ctx.db
        .update(item)
        .set({ attributes: newAttrs, updatedAt: new Date() })
        .where(eq(item.id, input.itemId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item not found",
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

        await ctx.db.insert(itemEvent).values(
          Object.entries(changes).map(([key, value]) => {
            const hasFrom =
              value.from !== null &&
              value.from !== undefined &&
              value.from !== "";
            const hasTo =
              value.to !== null && value.to !== undefined && value.to !== "";
            const message =
              hasFrom && hasTo
                ? `${key} changed from ${JSON.stringify(value.from)} to ${JSON.stringify(value.to)}.`
                : hasFrom
                  ? `${key} changed from ${JSON.stringify(value.from)}.`
                  : hasTo
                    ? `${key} changed to ${JSON.stringify(value.to)}.`
                    : `${key} changed.`;

            return {
              itemId: input.itemId,
              eventType: "attributes_updated",
              message: message,
              payload: { changes },
            };
          }),
        );
      }

      return updated;
    }),

  bulkSetLocation: publicProcedure
    .input(
      z.object({
        itemIds: z.array(z.uuid()).min(1).max(1000),
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
        .update(item)
        .set({ locationId: input.locationId, updatedAt: new Date() })
        .where(inArray(item.id, input.itemIds))
        .returning({ id: item.id });

      if (updated.length > 0) {
        await ctx.db.insert(itemEvent).values(
          updated.map((u) => ({
            itemId: u.id,
            eventType: "location_changed",
            newLocationId: input.locationId,
            message: `Moved to ${loc?.name ?? "location"}.`,
            payload: {},
          })),
        );
      }

      return { updated: updated.length };
    }),

  bulkUpdateStatus: publicProcedure
    .input(
      z.object({
        itemIds: z.array(z.uuid()).min(1).max(1000),
        status: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db
        .update(item)
        .set({ statusId: input.status, updatedAt: new Date() })
        .where(inArray(item.id, input.itemIds))
        .returning({ id: item.id });

      return { updated: updated.length };
    }),

  bulkSetVariant: publicProcedure
    .input(
      z.object({
        itemIds: z.array(z.uuid()).min(1).max(1000),
        variantId: z.uuid().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.variantId) {
        const updated = await ctx.db
          .update(item)
          .set({ variantId: null, updatedAt: new Date() })
          .where(inArray(item.id, input.itemIds))
          .returning({ id: item.id });
        return { updated: updated.length };
      }

      const [variant] = await ctx.db
        .select()
        .from(itemTypeVariant)
        .where(eq(itemTypeVariant.id, input.variantId))
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
          .update(item)
          .set({ variantId: input.variantId, updatedAt: new Date() })
          .where(inArray(item.id, input.itemIds))
          .returning({ id: item.id });
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
        const items = await ctx.db
          .select({ id: item.id, attributes: item.attributes })
          .from(item)
          .where(inArray(item.id, input.itemIds));

        let updated = 0;
        for (const it of items) {
          const existing = (it.attributes ?? {}) as Record<string, unknown>;
          await ctx.db
            .update(item)
            .set({
              ...(defaults as typeof item.$inferInsert),
              attributes: { ...variantAttrs, ...existing },
            })
            .where(eq(item.id, it.id));
          updated++;
        }
        return { updated };
      }

      const updated = await ctx.db
        .update(item)
        .set(defaults as typeof item.$inferInsert)
        .where(inArray(item.id, input.itemIds))
        .returning({ id: item.id });
      return { updated: updated.length };
    }),

  bulkSetAttributes: publicProcedure
    .input(
      z.object({
        itemIds: z.array(z.uuid()).min(1).max(1000),
        attributes: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const items = await ctx.db
        .select({ id: item.id, attributes: item.attributes })
        .from(item)
        .where(inArray(item.id, input.itemIds));

      let updatedCount = 0;
      for (const existing of items) {
        const oldAttrs =
          (existing.attributes as Record<string, unknown>) ?? {};
        const merged = { ...oldAttrs, ...input.attributes };
        await ctx.db
          .update(item)
          .set({ attributes: merged, updatedAt: new Date() })
          .where(eq(item.id, existing.id));
        updatedCount++;
      }

      return { updated: updatedCount };
    }),

  bulkDelete: publicProcedure
    .input(z.object({ itemIds: z.array(z.uuid()).min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(itemEvent)
        .where(inArray(itemEvent.itemId, input.itemIds));
      await ctx.db
        .delete(itemIdentifier)
        .where(inArray(itemIdentifier.itemId, input.itemIds));
      await ctx.db
        .delete(itemLineage)
        .where(inArray(itemLineage.parentItemId, input.itemIds));
      await ctx.db
        .delete(itemLineage)
        .where(inArray(itemLineage.childItemId, input.itemIds));

      const deleted = await ctx.db
        .delete(item)
        .where(inArray(item.id, input.itemIds))
        .returning({ id: item.id });

      return { deleted: deleted.length };
    }),

  aggregate: publicProcedure
    .input(
      z.object({
        itemTypeId: z.uuid(),
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
      const BUILTIN_FIELDS = new Set([
        "status",
        "variant",
        "location",
        "quantity",
        "value",
      ]);

      const attrDefs = await ctx.db
        .select()
        .from(itemTypeAttributeDefinition)
        .where(eq(itemTypeAttributeDefinition.itemTypeId, input.itemTypeId));

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
                expr: sql`${itemTypeStatusDefinition.name}`,
              });
              break;
            case "variant":
              groupByExprs.push({
                field,
                label: "Variant",
                expr: sql`${itemTypeVariant.name}`,
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
            expr: sql`${item.attributes}->>${sql.raw(`'${resolved.key.replace(/'/g, "''")}'`)}`,
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
              valueExpr = sql`${item.quantity}::numeric`;
              break;
            case "value":
              valueExpr = sql`${item.value}::numeric`;
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
          const raw = sql`${item.attributes}->>${sql.raw(`'${escapedKey}'`)}`;
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

      const conditions = [eq(item.itemTypeId, input.itemTypeId)];
      if (input.filters?.status)
        conditions.push(eq(item.statusId, input.filters.status));
      if (input.filters?.variantId)
        conditions.push(eq(item.variantId, input.filters.variantId));
      if (input.filters?.locationId)
        conditions.push(eq(item.locationId, input.filters.locationId));

      if (input.filters?.attrFilters) {
        for (const af of input.filters.attrFilters) {
          if (!allowedAttrKeys.has(af.key)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Unknown attribute filter key: ${af.key}`,
            });
          }
          const escapedKey = af.key.replace(/'/g, "''");
          const jsonbExpr = sql`${item.attributes}->>${sql.raw(`'${escapedKey}'`)}`;
          const dt = attrTypeMap.get(af.key);

          switch (af.op) {
            case "eq":
              conditions.push(sql`${jsonbExpr} = ${af.value}`);
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

      let query = ctx.db.select(selectCols).from(item).$dynamic();

      if (needsStatusJoin) {
        query = query.leftJoin(
          itemTypeStatusDefinition,
          eq(item.statusId, itemTypeStatusDefinition.id),
        );
      }
      if (needsVariantJoin) {
        query = query.leftJoin(
          itemTypeVariant,
          eq(item.variantId, itemTypeVariant.id),
        );
      }
      if (needsLocationJoin) {
        query = query.leftJoin(location, eq(item.locationId, location.id));
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
          .select({ cur: sql<string>`${item.valueCurrency}` })
          .from(item)
          .where(
            and(
              eq(item.itemTypeId, input.itemTypeId),
              sql`${item.valueCurrency} IS NOT NULL`,
            ),
          )
          .groupBy(item.valueCurrency)
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
