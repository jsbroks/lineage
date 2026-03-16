import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { itemType, lot, lotEvent, lotIdentifier } from "~/server/db/schema";

const resolveIdentifierInput = z.object({
  identifierValue: z.string().min(1),
  identifierType: z.string().min(1).default("qr"),
  resolve: z.boolean().default(false),
});

const batchCreateUnassignedIdentifiersInput = z
  .object({
    identifierType: z.string().min(1).default("qr"),
    values: z.array(z.string().min(1)).max(1000).optional(),
    prefix: z.string().min(1).optional(),
    start: z.number().int().positive().default(1),
    count: z.number().int().positive().max(1000).optional(),
    padTo: z.number().int().nonnegative().max(12).default(0),
    createItemTypeId: z.uuid().nullable().optional(),
    createStatus: z.string().nullable().optional(),
    assignedTo: z.uuid().nullable().optional(),
    label: z.string().nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((input, ctx) => {
    const hasExplicitValues = !!input.values?.length;
    const hasGenerator = !!input.prefix && !!input.count;

    if (!hasExplicitValues && !hasGenerator) {
      ctx.addIssue({
        code: "custom",
        message:
          "Provide either `values` or both `prefix` and `count` to generate identifiers.",
      });
    }

    if (hasExplicitValues && hasGenerator) {
      ctx.addIssue({
        code: "custom",
        message:
          "Use either explicit `values` or generator options (`prefix` + `count`), not both.",
      });
    }
  });

export const lotRouter = createTRPCRouter({
  batchCreateUnassignedIdentifiers: publicProcedure
    .input(batchCreateUnassignedIdentifiersInput)
    .mutation(async ({ ctx, input }) => {
      const generatedValues =
        input.values
          ?.map((value) => value.trim())
          .filter((value) => value.length > 0) ??
        Array.from({ length: input.count ?? 0 }, (_, index) => {
          const sequenceNumber = String(input.start + index).padStart(
            input.padTo,
            "0",
          );
          return `${input.prefix ?? ""}${sequenceNumber}`;
        });

      const uniqueValues = [...new Set(generatedValues)];

      if (uniqueValues.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No identifier values provided for batch creation.",
        });
      }

      if (uniqueValues.length !== generatedValues.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Duplicate values detected in request payload.",
        });
      }

      const existingRows = await ctx.db
        .select({
          identifierValue: lotIdentifier.identifierValue,
        })
        .from(lotIdentifier)
        .where(
          and(
            eq(lotIdentifier.identifierType, input.identifierType),
            inArray(lotIdentifier.identifierValue, uniqueValues),
          ),
        );

      if (existingRows.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Some identifiers already exist: ${existingRows
            .map((row) => row.identifierValue)
            .join(", ")}`,
        });
      }

      const insertedRows = await ctx.db
        .insert(lotIdentifier)
        .values(
          uniqueValues.map((identifierValue) => ({
            identifierType: input.identifierType,
            identifierValue,
            lotId: null,
            createItemTypeId: input.createItemTypeId,
            createStatus: input.createStatus,
            assignedTo: input.assignedTo,
            label: input.label,
            isActive: input.isActive,
          })),
        )
        .returning();

      return {
        created: insertedRows.length,
        identifiers: insertedRows,
      };
    }),

  resolveIdentifier: publicProcedure
    .input(resolveIdentifierInput)
    .query(async ({ ctx, input }) => {
      const [existingIdentifier] = await ctx.db
        .select()
        .from(lotIdentifier)
        .where(
          and(
            eq(lotIdentifier.identifierValue, input.identifierValue),
            eq(lotIdentifier.identifierType, input.identifierType),
          ),
        )
        .limit(1);

      if (!existingIdentifier) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Identifier not found",
        });
      }

      if (existingIdentifier.lotId) {
        const [existingLot] = await ctx.db
          .select()
          .from(lot)
          .where(eq(lot.id, existingIdentifier.lotId))
          .limit(1);

        if (!existingLot) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Linked lot not found for identifier",
          });
        }

        return {
          lot: existingLot,
          identifier: existingIdentifier,
          createdLot: false,
        };
      }

      if (!input.resolve) {
        return {
          lot: null,
          identifier: existingIdentifier,
          createdLot: false,
        };
      }

      if (!existingIdentifier.createItemTypeId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Identifier cannot be converted: create_item_type_id is missing",
        });
      }

      const [createdLot] = await ctx.db
        .insert(lot)
        .values({
          itemTypeId: existingIdentifier.createItemTypeId,
          lotCode: existingIdentifier.identifierValue,
          status: existingIdentifier.createStatus ?? "created",
        })
        .returning();

      if (!createdLot) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create lot from identifier",
        });
      }

      const [updatedIdentifier] = await ctx.db
        .update(lotIdentifier)
        .set({
          lotId: createdLot.id,
          linkedAt: new Date(),
        })
        .where(eq(lotIdentifier.id, existingIdentifier.id))
        .returning();

      if (!updatedIdentifier) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update identifier",
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

      await ctx.db.insert(lotEvent).values({
        lotId: createdLot.id,
        eventType: "lot_created_from_identifier",
        oldStatus: null,
        newStatus: updatedIdentifier.createStatus,
        // recordedBy: userId,
        message: `${it?.name} created from ${existingIdentifier.identifierType}.`,
        payload: {
          identifierType: existingIdentifier.identifierType,
          identifierValue: existingIdentifier.identifierValue,
          lotIdentifierId: existingIdentifier.id,
        },
      });

      return {
        lot: createdLot,
        identifier: updatedIdentifier ?? existingIdentifier,
        createdLot: true,
      };
    }),
});
