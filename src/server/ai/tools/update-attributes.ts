import { tool } from "ai";
import { z } from "zod/v4";
import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "~/server/db";
import { item } from "~/server/db/schema";
import type { SchemaContext } from "../build-schema-context";
import {
  resolveItemTypeId,
  resolveStatusId,
  resolveVariantId,
  resolveLocationId,
} from "./resolve";
import type { PendingAction } from "./pending-action";

export function createUpdateAttributesTool(ctx: SchemaContext) {
  return tool({
    description:
      "Propose setting or updating custom attributes on one or more items. Target items by specific codes OR by filter criteria (item type + optional status/variant/location). The attributes are merged into existing values. Returns a pending action that the user must confirm.",
    inputSchema: z.object({
      itemCodes: z
        .array(z.string())
        .optional()
        .describe("Specific item codes to update"),
      itemTypeName: z
        .string()
        .optional()
        .describe(
          "Item type name to filter by (use when not specifying codes)",
        ),
      statusName: z.string().optional().describe("Current status to filter by"),
      variantName: z.string().optional().describe("Variant to filter by"),
      locationName: z.string().optional().describe("Location to filter by"),
      limit: z
        .number()
        .optional()
        .default(50)
        .describe(
          "Max items to update when using filters (default 50). Use listItems first to check how many match.",
        ),
      attributes: z
        .record(z.string(), z.unknown())
        .describe(
          'Key-value pairs to set. Keys must match the item type\'s attribute definitions (e.g. { "harvested_by": "James" }).',
        ),
    }),
    execute: async ({
      itemCodes,
      itemTypeName,
      statusName,
      variantName,
      locationName,
      limit: maxItems,
      attributes,
    }) => {
      if (!attributes || Object.keys(attributes).length === 0) {
        return { error: "No attributes provided to update" };
      }

      let matchedItems: {
        id: string;
        code: string;
        statusId: string;
        locationId: string | null;
        itemTypeId: string;
        attributes: unknown;
      }[];

      if (itemCodes && itemCodes.length > 0) {
        matchedItems = await db
          .select({
            id: item.id,
            code: item.code,
            statusId: item.statusId,
            locationId: item.locationId,
            itemTypeId: item.itemTypeId,
            attributes: item.attributes,
          })
          .from(item)
          .where(inArray(item.code, itemCodes));

        if (matchedItems.length === 0)
          return { error: "No items found matching the provided codes" };

        const notFound = itemCodes.filter(
          (c) => !matchedItems.some((i) => i.code === c),
        );
        if (notFound.length > 0) {
          return { error: `Items not found: ${notFound.join(", ")}` };
        }
      } else if (itemTypeName) {
        const typeId = resolveItemTypeId(ctx, itemTypeName);
        if (!typeId) return { error: `Unknown item type: "${itemTypeName}"` };

        const conditions = [eq(item.itemTypeId, typeId)];

        if (statusName) {
          const statusId = resolveStatusId(ctx, typeId, statusName);
          if (!statusId) return { error: `Unknown status: "${statusName}"` };
          conditions.push(eq(item.statusId, statusId));
        }

        if (variantName) {
          const variantId = resolveVariantId(ctx, typeId, variantName);
          if (!variantId) return { error: `Unknown variant: "${variantName}"` };
          conditions.push(eq(item.variantId, variantId));
        }

        if (locationName) {
          const locId = resolveLocationId(ctx, locationName);
          if (!locId) return { error: `Unknown location: "${locationName}"` };
          conditions.push(eq(item.locationId, locId));
        }

        matchedItems = await db
          .select({
            id: item.id,
            code: item.code,
            statusId: item.statusId,
            locationId: item.locationId,
            itemTypeId: item.itemTypeId,
            attributes: item.attributes,
          })
          .from(item)
          .where(and(...conditions))
          .orderBy(desc(item.createdAt))
          .limit(maxItems);

        if (matchedItems.length === 0)
          return { error: "No items match the given filters" };
      } else {
        return {
          error:
            "Provide either itemCodes or itemTypeName to identify items to update",
        };
      }

      const typeId = matchedItems[0]!.itemTypeId;
      const validAttrs = ctx.attributes.filter((a) => a.itemTypeId === typeId);
      const validKeys = new Set(validAttrs.map((a) => a.attrKey));

      const invalidKeys = Object.keys(attributes).filter(
        (k) => !validKeys.has(k),
      );
      if (invalidKeys.length > 0) {
        return {
          error: `Unknown attribute(s): ${invalidKeys.join(", ")}. Valid attributes for this item type: ${validAttrs.map((a) => a.attrKey).join(", ")}`,
        };
      }

      const affectedItems = matchedItems.map((i) => ({
        id: i.id,
        code: i.code,
        currentStatus: ctx.statuses.find((s) => s.id === i.statusId)?.name,
        currentLocation: i.locationId
          ? ctx.locations.find((l) => l.id === i.locationId)?.name
          : undefined,
      }));

      const changes: Record<string, string> = {};
      for (const [key, value] of Object.entries(attributes)) {
        const label = validAttrs.find((a) => a.attrKey === key)?.attrKey ?? key;
        changes[label] = String(value);
      }

      const pendingAction: PendingAction = {
        type: "updateAttributes",
        description: `Update attributes on ${matchedItems.length} item(s)`,
        affectedItems,
        changes,
        payload: {
          itemIds: matchedItems.map((i) => i.id),
          attributes,
        },
        requiresConfirmation: true,
      };

      return pendingAction;
    },
  });
}
