import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  itemType,
  item,
  itemCodeSequence,
  itemEvent,
  itemIdentifier,
  itemLineage,
} from "~/server/db/schema";

const createLotInput = z
  .object({
    hostname: z.string().min(1),
    itemTypeId: z.uuid(),
    lotCode: z.string().min(1).optional(),
    useSequence: z.boolean().default(false),
    status: z.string().min(1).default("created"),
    uom: z.string().min(1).default("each"),
    locationId: z.uuid().nullable().optional(),
    notes: z.string().nullable().optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((input, ctx) => {
    if (!input.useSequence && !input.lotCode) {
      ctx.addIssue({
        code: "custom",
        message: "lotCode is required when useSequence is false",
        path: ["lotCode"],
      });
    }
  });

const upsertLotCodeSequenceInput = z.object({
  itemTypeId: z.uuid(),
  prefix: z.string().min(1),
  variantCode: z.string().min(1).default("_"),
  nextNumber: z.number().int().positive(),
});

const batchCreateLotsInput = z
  .object({
    itemTypeId: z.uuid(),
    lotCodes: z.array(z.string().min(1)).max(1000).optional(),
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
    const hasExplicitValues = !!input.lotCodes?.length;
    const hasGenerator = !!input.prefix && !!input.count;

    if (!hasExplicitValues && !hasGenerator) {
      ctx.addIssue({
        code: "custom",
        message:
          "Provide either `lotCodes` or both `prefix` and `count` to generate lot codes.",
      });
    }

    if (hasExplicitValues && hasGenerator) {
      ctx.addIssue({
        code: "custom",
        message:
          "Use either explicit `lotCodes` or generator options (`prefix` + `count`), not both.",
      });
    }
  });

export const lotRouter = createTRPCRouter({
  getCodeSequence: publicProcedure
    .input(z.object({ itemTypeId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const [sequence] = await ctx.db
        .select()
        .from(itemCodeSequence)
        .where(eq(itemCodeSequence.itemTypeId, input.itemTypeId))
        .limit(1);

      return sequence ?? null;
    }),

  upsertCodeSequence: publicProcedure
    .input(upsertLotCodeSequenceInput)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(itemCodeSequence)
        .where(eq(itemCodeSequence.itemTypeId, input.itemTypeId))
        .limit(1);

      if (existing) {
        const [updated] = await ctx.db
          .update(itemCodeSequence)
          .set({
            prefix: input.prefix,
            variantCode: input.variantCode,
            nextNumber: input.nextNumber,
          })
          .where(eq(itemCodeSequence.id, existing.id))
          .returning();

        return updated ?? existing;
      }

      const [created] = await ctx.db
        .insert(itemCodeSequence)
        .values({
          itemTypeId: input.itemTypeId,
          prefix: input.prefix,
          variantCode: input.variantCode,
          nextNumber: input.nextNumber,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save lot code sequence",
        });
      }

      return created;
    }),

  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(item).orderBy(desc(item.createdAt));
  }),

  getByCode: publicProcedure
    .input(z.object({ lotCode: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [currentLot] = await ctx.db
        .select()
        .from(item)
        .where(eq(item.lotCode, input.lotCode))
        .limit(1);

      if (!currentLot) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lot not found",
        });
      }

      const [currentItemType] = await ctx.db
        .select()
        .from(itemType)
        .where(eq(itemType.id, currentLot.itemTypeId))
        .limit(1);

      return {
        lot: currentLot,
        itemType: currentItemType ?? null,
      };
    }),

  create: publicProcedure
    .input(createLotInput)
    .mutation(async ({ ctx, input }) => {
      const createdLot = await ctx.db.transaction(async (tx) => {
        let lotCodeValue = input.lotCode ?? "";

        if (input.useSequence) {
          const [sequence] = await tx
            .select()
            .from(itemCodeSequence)
            .where(eq(itemCodeSequence.itemTypeId, input.itemTypeId))
            .limit(1);

          if (!sequence) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "No lot code sequence configured for this item type",
            });
          }

          const paddedNumber = String(sequence.nextNumber).padStart(5, "0");

          lotCodeValue =
            sequence.variantCode === "_"
              ? `${sequence.prefix}-${paddedNumber}`
              : `${sequence.prefix}-${sequence.variantCode}-${paddedNumber}`;

          await tx
            .update(itemCodeSequence)
            .set({ nextNumber: sequence.nextNumber + 1 })
            .where(eq(itemCodeSequence.id, sequence.id));
        }

        const [newLot] = await tx
          .insert(item)
          .values({
            itemTypeId: input.itemTypeId,
            lotCode: lotCodeValue,
            status: input.status,
            uom: input.uom,
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

        const [linkedIdentifier] = await tx
          .select()
          .from(itemIdentifier)
          .where(eq(itemIdentifier.lotId, newLot.id))
          .limit(1);

        if (!linkedIdentifier) {
          await tx.insert(itemIdentifier).values({
            lotId: newLot.id,
            identifierType: "QR Code",
            identifierValue: `${input.hostname}/l/${newLot.id}`,
            linkedAt: new Date(),
            isActive: true,
          });
        }

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
        .from(itemType)
        .where(eq(itemType.id, createdLot.itemTypeId))
        .limit(1);

      if (!it) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item type not found",
        });
      }

      await ctx.db.insert(itemEvent).values({
        lotId: createdLot.id,
        eventType: "lot_created_manual",
        newStatus: createdLot.status,
        newLocationId: createdLot.locationId,
        message: `${it.name} created manually.`,
        payload: {
          lotCode: createdLot.lotCode,
        },
      });

      return createdLot;
    }),

  getById: publicProcedure
    .input(z.object({ lotId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const [currentLot] = await ctx.db
        .select()
        .from(item)
        .where(eq(item.id, input.lotId))
        .limit(1);

      if (!currentLot) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lot not found",
        });
      }

      const [currentItemType] = await ctx.db
        .select()
        .from(itemType)
        .where(eq(itemType.id, currentLot.itemTypeId))
        .limit(1);

      const identifiers = await ctx.db
        .select()
        .from(itemIdentifier)
        .where(eq(itemIdentifier.lotId, currentLot.id))
        .orderBy(desc(itemIdentifier.createdAt));

      const events = await ctx.db
        .select()
        .from(itemEvent)
        .where(eq(itemEvent.lotId, currentLot.id))
        .orderBy(desc(itemEvent.recordedAt));

      const parentLinks = await ctx.db
        .select()
        .from(itemLineage)
        .where(eq(itemLineage.childLotId, currentLot.id))
        .orderBy(desc(itemLineage.createdAt));

      const childLinks = await ctx.db
        .select()
        .from(itemLineage)
        .where(eq(itemLineage.parentLotId, currentLot.id))
        .orderBy(desc(itemLineage.createdAt));

      const parentLots = parentLinks.length
        ? await ctx.db
            .select()
            .from(item)
            .where(
              inArray(
                item.id,
                parentLinks.map((link) => link.parentLotId),
              ),
            )
        : [];

      const childLots = childLinks.length
        ? await ctx.db
            .select()
            .from(item)
            .where(
              inArray(
                item.id,
                childLinks.map((link) => link.childLotId),
              ),
            )
        : [];

      return {
        lot: currentLot,
        itemType: currentItemType ?? null,
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

  batchCreate: publicProcedure
    .input(batchCreateLotsInput)
    .mutation(async ({ ctx, input }) => {
      const generatedCodes =
        input.lotCodes
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
          message: "No lot codes provided for batch creation.",
        });
      }

      if (uniqueCodes.length !== generatedCodes.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Duplicate lot codes detected in request payload.",
        });
      }

      const existingRows = await ctx.db
        .select({ lotCode: item.lotCode })
        .from(item)
        .where(inArray(item.lotCode, uniqueCodes));

      if (existingRows.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Some lot codes already exist: ${existingRows
            .map((row) => row.lotCode)
            .join(", ")}`,
        });
      }

      const insertedLots = await ctx.db
        .insert(item)
        .values(
          uniqueCodes.map((lotCode) => ({
            itemTypeId: input.itemTypeId,
            lotCode,
            status: input.status,
            uom: input.uom,
            locationId: input.locationId,
            attributes: input.attributes ?? {},
          })),
        )
        .returning();

      return {
        created: insertedLots.length,
        lots: insertedLots,
      };
    }),
});
