import { tool } from "ai";
import { z } from "zod/v4";
import { and, eq, inArray } from "drizzle-orm";

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

export function createMoveItemsTool(ctx: SchemaContext) {
  return tool({
    description:
      "Propose moving items to a new location. Target items by specific codes OR by filter criteria (item type + optional status/variant/location). Returns a pending action that the user must confirm.",
    inputSchema: z.object({
      itemCodes: z
        .array(z.string())
        .optional()
        .describe("Specific item codes to move"),
      itemTypeName: z
        .string()
        .optional()
        .describe(
          "Item type name to filter by (use when not specifying codes)",
        ),
      statusName: z.string().optional().describe("Current status to filter by"),
      variantName: z.string().optional().describe("Variant to filter by"),
      currentLocationName: z
        .string()
        .optional()
        .describe("Current location to filter by"),
      newLocationName: z
        .string()
        .describe("Target location name to move items to"),
    }),
    execute: async ({
      itemCodes,
      itemTypeName,
      statusName,
      variantName,
      currentLocationName,
      newLocationName,
    }) => {
      const newLocationId = resolveLocationId(ctx, newLocationName);
      if (!newLocationId) {
        const valid = ctx.locations.map((l) => l.name);
        return {
          error: `Unknown location "${newLocationName}". Valid locations: ${valid.join(", ")}`,
        };
      }

      let matchedItems: {
        id: string;
        code: string;
        statusId: string;
        locationId: string | null;
      }[];

      if (itemCodes && itemCodes.length > 0) {
        matchedItems = await db
          .select({
            id: item.id,
            code: item.code,
            statusId: item.statusId,
            locationId: item.locationId,
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

        if (currentLocationName) {
          const locId = resolveLocationId(ctx, currentLocationName);
          if (!locId)
            return { error: `Unknown location: "${currentLocationName}"` };
          conditions.push(eq(item.locationId, locId));
        }

        matchedItems = await db
          .select({
            id: item.id,
            code: item.code,
            statusId: item.statusId,
            locationId: item.locationId,
          })
          .from(item)
          .where(and(...conditions))
          .limit(200);

        if (matchedItems.length === 0)
          return { error: "No items match the given filters" };
      } else {
        return {
          error:
            "Provide either itemCodes or itemTypeName to identify items to move",
        };
      }

      const itemsToMove = matchedItems.filter(
        (i) => i.locationId !== newLocationId,
      );
      if (itemsToMove.length === 0) {
        return {
          error: `All matching items are already at "${newLocationName}"`,
        };
      }

      const affectedItems = itemsToMove.map((i) => ({
        id: i.id,
        code: i.code,
        currentStatus: ctx.statuses.find((s) => s.id === i.statusId)?.name,
        currentLocation: i.locationId
          ? ctx.locations.find((l) => l.id === i.locationId)?.name
          : undefined,
      }));

      const pendingAction: PendingAction = {
        type: "moveItems",
        description: `Move ${itemsToMove.length} item(s) to "${newLocationName}"`,
        affectedItems,
        changes: { location: `→ ${newLocationName}` },
        payload: {
          itemIds: itemsToMove.map((i) => i.id),
          locationId: newLocationId,
        },
        requiresConfirmation: true,
      };

      return pendingAction;
    },
  });
}
