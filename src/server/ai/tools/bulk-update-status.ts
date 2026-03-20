import { tool } from "ai";
import { z } from "zod/v4";
import { and, eq } from "drizzle-orm";

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

export function createBulkUpdateStatusTool(ctx: SchemaContext) {
  return tool({
    description:
      "Propose updating the status of multiple items matching filter criteria. Use for bulk operations like 'Mark all Colonizing blocks as Ready to Fruit'. Returns a pending action that the user must confirm.",
    inputSchema: z.object({
      itemTypeName: z.string().describe("Item type name to filter by"),
      currentStatusName: z
        .string()
        .optional()
        .describe("Current status to filter by"),
      variantName: z.string().optional().describe("Variant to filter by"),
      locationName: z.string().optional().describe("Location to filter by"),
      newStatusName: z.string().describe("Target status name"),
    }),
    execute: async ({
      itemTypeName,
      currentStatusName,
      variantName,
      locationName,
      newStatusName,
    }) => {
      const typeId = resolveItemTypeId(ctx, itemTypeName);
      if (!typeId) return { error: `Unknown item type: "${itemTypeName}"` };

      const newStatusId = resolveStatusId(ctx, typeId, newStatusName);
      if (!newStatusId) {
        const valid = ctx.statuses
          .filter((s) => s.itemTypeId === typeId)
          .map((s) => s.name);
        return {
          error: `Unknown status "${newStatusName}". Valid statuses: ${valid.join(", ")}`,
        };
      }

      const conditions = [eq(item.itemTypeId, typeId)];

      if (currentStatusName) {
        const statusId = resolveStatusId(ctx, typeId, currentStatusName);
        if (!statusId)
          return { error: `Unknown status: "${currentStatusName}"` };
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

      const matchedItems = await db
        .select({
          id: item.id,
          code: item.code,
          statusId: item.statusId,
          locationId: item.locationId,
        })
        .from(item)
        .where(and(...conditions))
        .limit(500);

      if (matchedItems.length === 0)
        return { error: "No items match the given filters" };

      const itemsToUpdate = matchedItems.filter(
        (i) => i.statusId !== newStatusId,
      );
      if (itemsToUpdate.length === 0) {
        return {
          error: `All matching items are already in status "${newStatusName}"`,
        };
      }

      const affectedItems = itemsToUpdate.map((i) => ({
        id: i.id,
        code: i.code,
        currentStatus: ctx.statuses.find((s) => s.id === i.statusId)?.name,
        currentLocation: i.locationId
          ? ctx.locations.find((l) => l.id === i.locationId)?.name
          : undefined,
      }));

      const fromLabel = currentStatusName ?? "various statuses";

      const pendingAction: PendingAction = {
        type: "bulkUpdateStatus",
        description: `Update ${itemsToUpdate.length} ${itemTypeName} item(s) from ${fromLabel} to "${newStatusName}"`,
        affectedItems,
        changes: { status: `${fromLabel} → ${newStatusName}` },
        payload: {
          itemIds: itemsToUpdate.map((i) => i.id),
          statusId: newStatusId,
        },
        requiresConfirmation: true,
      };

      return pendingAction;
    },
  });
}
