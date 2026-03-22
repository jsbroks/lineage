import { tool } from "ai";
import { z } from "zod/v4";
import { and, desc, eq, ilike } from "drizzle-orm";

import { db } from "~/server/db";
import { lot, lotTypeVariant, location } from "~/server/db/schema";
import type { SchemaContext } from "../build-schema-context";
import {
  resolveLotTypeId,
  resolveStatusId,
  resolveVariantId,
  resolveLocationId,
} from "./resolve";

export function createListLotsTool(ctx: SchemaContext) {
  return tool({
    description:
      "Search and filter inventory lots. Returns a list of lots with their codes, statuses, variants, locations, and quantities.",
    inputSchema: z.object({
      lotTypeName: z.string().describe("Name of the lot type to filter by"),
      statusName: z
        .string()
        .optional()
        .describe("Status name to filter by (e.g. 'Colonizing')"),
      variantName: z.string().optional().describe("Variant name to filter by"),
      locationName: z
        .string()
        .optional()
        .describe("Location name to filter by"),
      search: z.string().optional().describe("Search term to match lot codes"),
      limit: z
        .number()
        .optional()
        .default(50)
        .describe("Max number of lots to return (default 50)"),
    }),
    execute: async ({
      lotTypeName,
      statusName,
      variantName,
      locationName,
      search,
      limit: maxResults,
    }) => {
      const typeId = resolveLotTypeId(ctx, lotTypeName);
      if (!typeId)
        return { error: `Unknown lot type: "${lotTypeName}"`, lots: [] };

      const conditions = [eq(lot.lotTypeId, typeId)];

      if (statusName) {
        const statusId = resolveStatusId(ctx, typeId, statusName);
        if (!statusId)
          return { error: `Unknown status: "${statusName}"`, lots: [] };
        conditions.push(eq(lot.statusId, statusId));
      }

      if (variantName) {
        const variantId = resolveVariantId(ctx, typeId, variantName);
        if (!variantId)
          return { error: `Unknown variant: "${variantName}"`, lots: [] };
        conditions.push(eq(lot.variantId, variantId));
      }

      if (locationName) {
        const locationId = resolveLocationId(ctx, locationName);
        if (!locationId)
          return { error: `Unknown location: "${locationName}"`, lots: [] };
        conditions.push(eq(lot.locationId, locationId));
      }

      if (search) {
        conditions.push(ilike(lot.code, `%${search}%`));
      }

      const lots = await db
        .select({
          id: lot.id,
          code: lot.code,
          statusId: lot.statusId,
          variantId: lot.variantId,
          variantName: lotTypeVariant.name,
          locationId: lot.locationId,
          locationName: location.name,
          quantity: lot.quantity,
          quantityUnit: lot.quantityUnit,
          value: lot.value,
          attributes: lot.attributes,
          createdAt: lot.createdAt,
        })
        .from(lot)
        .leftJoin(lotTypeVariant, eq(lot.variantId, lotTypeVariant.id))
        .leftJoin(location, eq(lot.locationId, location.id))
        .where(and(...conditions))
        .orderBy(desc(lot.createdAt))
        .limit(maxResults);

      const statusMap = new Map(
        ctx.statuses
          .filter((s) => s.lotTypeId === typeId)
          .map((s) => [s.id, s.name]),
      );

      return {
        totalReturned: lots.length,
        lots: lots.map((i) => ({
          code: i.code,
          status: statusMap.get(i.statusId) ?? i.statusId,
          variant: i.variantName ?? null,
          location: i.locationName ?? null,
          quantity: i.quantity,
          quantityUnit: i.quantityUnit,
          value: i.value,
          attributes: i.attributes,
          createdAt: i.createdAt,
        })),
      };
    },
  });
}
