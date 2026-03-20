import { tool } from "ai";
import { z } from "zod/v4";
import { and, desc, eq, ilike } from "drizzle-orm";

import { db } from "~/server/db";
import { item, itemTypeVariant, location } from "~/server/db/schema";
import type { SchemaContext } from "../build-schema-context";
import {
  resolveItemTypeId,
  resolveStatusId,
  resolveVariantId,
  resolveLocationId,
} from "./resolve";

export function createListItemsTool(ctx: SchemaContext) {
  return tool({
    description:
      "Search and filter inventory items. Returns a list of items with their codes, statuses, variants, locations, and quantities.",
    inputSchema: z.object({
      itemTypeName: z.string().describe("Name of the item type to filter by"),
      statusName: z
        .string()
        .optional()
        .describe("Status name to filter by (e.g. 'Colonizing')"),
      variantName: z.string().optional().describe("Variant name to filter by"),
      locationName: z
        .string()
        .optional()
        .describe("Location name to filter by"),
      search: z.string().optional().describe("Search term to match item codes"),
      limit: z
        .number()
        .optional()
        .default(50)
        .describe("Max number of items to return (default 50)"),
    }),
    execute: async ({
      itemTypeName,
      statusName,
      variantName,
      locationName,
      search,
      limit: maxResults,
    }) => {
      const typeId = resolveItemTypeId(ctx, itemTypeName);
      if (!typeId)
        return { error: `Unknown item type: "${itemTypeName}"`, items: [] };

      const conditions = [eq(item.itemTypeId, typeId)];

      if (statusName) {
        const statusId = resolveStatusId(ctx, typeId, statusName);
        if (!statusId)
          return { error: `Unknown status: "${statusName}"`, items: [] };
        conditions.push(eq(item.statusId, statusId));
      }

      if (variantName) {
        const variantId = resolveVariantId(ctx, typeId, variantName);
        if (!variantId)
          return { error: `Unknown variant: "${variantName}"`, items: [] };
        conditions.push(eq(item.variantId, variantId));
      }

      if (locationName) {
        const locationId = resolveLocationId(ctx, locationName);
        if (!locationId)
          return { error: `Unknown location: "${locationName}"`, items: [] };
        conditions.push(eq(item.locationId, locationId));
      }

      if (search) {
        conditions.push(ilike(item.code, `%${search}%`));
      }

      const items = await db
        .select({
          id: item.id,
          code: item.code,
          statusId: item.statusId,
          variantId: item.variantId,
          variantName: itemTypeVariant.name,
          locationId: item.locationId,
          locationName: location.name,
          quantity: item.quantity,
          quantityUnit: item.quantityUnit,
          value: item.value,
          attributes: item.attributes,
          createdAt: item.createdAt,
        })
        .from(item)
        .leftJoin(itemTypeVariant, eq(item.variantId, itemTypeVariant.id))
        .leftJoin(location, eq(item.locationId, location.id))
        .where(and(...conditions))
        .orderBy(desc(item.createdAt))
        .limit(maxResults);

      const statusMap = new Map(
        ctx.statuses
          .filter((s) => s.itemTypeId === typeId)
          .map((s) => [s.id, s.name]),
      );

      return {
        totalReturned: items.length,
        items: items.map((i) => ({
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
