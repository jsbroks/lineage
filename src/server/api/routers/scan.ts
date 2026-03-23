import { and, eq, inArray } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import * as schema from "~/server/db/schema";
import { getActiveOrgId } from "~/server/api/org";

export type LocationItem = {
  type: "location";
  code: string;
  codeType?: string;
  location: typeof schema.location.$inferSelect;
};

export type LotItem = {
  type: "lot";
  code: string;
  codeType?: string;
  lotType: typeof schema.lotType.$inferSelect;
  lotVariant: typeof schema.lotTypeVariant.$inferSelect | null;
  lot: typeof schema.lot.$inferSelect;
  lotStatus: typeof schema.lotTypeStatusDefinition.$inferSelect | null;
};

export type LotTypeItem = {
  type: "lotType";
  code: string;
  codeType?: string;
  lotType: typeof schema.lotType.$inferSelect;
};

export type UnknownItem = {
  type: "unknown";
  code: string;
  codeType?: string;
};

export const codeInputSchema = z.object({
  code: z.string().min(1),
  codeType: z.string().optional(),
});

export type CodeInput = z.infer<typeof codeInputSchema>;

export type Item = UnknownItem | LocationItem | LotItem | LotTypeItem;

const uuid = z.uuid();

export const scanRouter = createTRPCRouter({
  lookup: protectedProcedure
    .input(
      z.object({
        codes: z.array(codeInputSchema),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const uuids = input.codes
        .map((c) => c.code)
        .filter((c) => uuid.safeParse(c).success);

      const lotTypes = await ctx.db
        .select({
          lotType: schema.lotType,
          code: schema.lotTypeIdentifier.identifierValue,
          codeType: schema.lotTypeIdentifier.identifierType,
        })
        .from(schema.lotType)
        .innerJoin(
          schema.lotTypeIdentifier,
          eq(schema.lotType.id, schema.lotTypeIdentifier.lotTypeId),
        )
        .where(
          and(
            eq(schema.lotType.orgId, orgId),
            inArray(
              schema.lotTypeIdentifier.identifierValue,
              input.codes.map((c) => c.code),
            ),
          ),
        )
        .then((rs) => rs.map((r) => ({ type: "lotType" as const, ...r })));

      const lots: LotItem[] = await ctx.db
        .select({
          code: schema.lot.code,
          lot: schema.lot,
          lotType: schema.lotType,
          lotVariant: schema.lotTypeVariant,
          lotStatus: schema.lotTypeStatusDefinition,
        })
        .from(schema.lot)
        .innerJoin(schema.lotType, eq(schema.lot.lotTypeId, schema.lotType.id))
        .leftJoin(
          schema.lotTypeVariant,
          eq(schema.lot.variantId, schema.lotTypeVariant.id),
        )
        .leftJoin(
          schema.lotTypeStatusDefinition,
          eq(schema.lot.statusId, schema.lotTypeStatusDefinition.id),
        )
        .where(
          and(
            eq(schema.lot.orgId, orgId),
            inArray(
              schema.lot.code,
              input.codes.map((c) => c.code),
            ),
          ),
        )
        .then((rs) => rs.map((r) => ({ type: "lot" as const, ...r })));

      const locations =
        uuids.length > 0
          ? await ctx.db
              .select({
                location: schema.location,
                code: schema.location.id,
              })
              .from(schema.location)
              .where(
                and(
                  eq(schema.location.orgId, orgId),
                  inArray(schema.location.id, uuids),
                ),
              )
              .then((rs) =>
                rs.map((r) => ({ type: "location" as const, ...r })),
              )
          : [];

      const items: Item[] = [...lotTypes, ...lots, ...locations];

      // Find codes in input.codes that have not been added to items (by code value)
      const foundCodesSet = new Set(items.map((i) => i.code));
      const unknownCodes = input.codes
        .filter((c) => !foundCodesSet.has(c.code))
        .map((c) => ({ type: "unknown" as const, ...c }));

      return { lotTypes, lots, locations, unknowns: unknownCodes };
    }),
});
