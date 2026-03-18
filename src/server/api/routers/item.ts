import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  itemType,
  item,
  itemEvent,
  itemIdentifier,
  itemLineage,
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
    codes: z.array(z.string().min(1)).max(1000).optional(),
    prefix: z.string().min(1).optional(),
    start: z.number().int().positive().default(1),
    count: z.number().int().positive().max(1000).optional(),
    padTo: z.number().int().nonnegative().max(12).default(0),
    status: z.string().min(1).default("created"),
    uom: z.string().min(1).default("each"),
    locationId: z.uuid().nullable().optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((input, ctx) => {
    const hasExplicitValues = !!input.codes?.length;
    const hasGenerator = !!input.prefix && !!input.count;

    if (!hasExplicitValues && !hasGenerator) {
      ctx.addIssue({
        code: "custom",
        message:
          "Provide either `codes` or both `prefix` and `count` to generate item codes.",
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

      return {
        item: currentItem,
        itemType: currentItemType ?? null,
      };
    }),

  create: publicProcedure
    .input(createItemInput)
    .mutation(async ({ ctx, input }) => {
      const createdItem = await ctx.db.transaction(async (tx) => {
        let codeValue = input.code ?? "";

        if (input.useSequence) {
          const [it] = await tx
            .select()
            .from(itemType)
            .where(eq(itemType.id, input.itemTypeId))
            .limit(1);

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
            status: input.status,
            uom: input.uom,
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
        newStatus: createdItem.status,
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

      return {
        item: currentItem,
        itemType: currentItemType ?? null,
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
            childItems.find(
              (childItem) => childItem.id === link.childItemId,
            ) ?? null,
        })),
      };
    }),

  batchCreate: publicProcedure
    .input(batchCreateItemsInput)
    .mutation(async ({ ctx, input }) => {
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

      const uniqueCodes = [...new Set(generatedCodes)];

      if (uniqueCodes.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No item codes provided for batch creation.",
        });
      }

      if (uniqueCodes.length !== generatedCodes.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Duplicate item codes detected in request payload.",
        });
      }

      const existingRows = await ctx.db
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

      const insertedItems = await ctx.db
        .insert(item)
        .values(
          uniqueCodes.map((code) => ({
            itemTypeId: input.itemTypeId,
            code,
            status: input.status,
            uom: input.uom,
            locationId: input.locationId,
            attributes: input.attributes ?? {},
          })),
        )
        .returning();

      return {
        created: insertedItems.length,
        items: insertedItems,
      };
    }),
});
