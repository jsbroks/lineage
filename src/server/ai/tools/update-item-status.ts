import { tool } from "ai";
import { z } from "zod/v4";
import { eq } from "drizzle-orm";

import { db } from "~/server/db";
import { item } from "~/server/db/schema";
import type { SchemaContext } from "../build-schema-context";
import { resolveStatusId } from "./resolve";
import type { PendingAction } from "./pending-action";

export function createUpdateItemStatusTool(ctx: SchemaContext) {
  return tool({
    description:
      "Propose updating the status of a single item by its code. Returns a pending action that the user must confirm before it executes. Use when the user asks to change, mark, or set an item's status.",
    inputSchema: z.object({
      itemCode: z.string().describe("The item code (e.g. 'BLK-042')"),
      newStatusName: z
        .string()
        .describe("The target status name (e.g. 'Contaminated')"),
    }),
    execute: async ({ itemCode, newStatusName }) => {
      const [found] = await db
        .select()
        .from(item)
        .where(eq(item.code, itemCode))
        .limit(1);

      if (!found) return { error: `Item not found: "${itemCode}"` };

      const currentStatus = ctx.statuses.find((s) => s.id === found.statusId);
      const currentStatusName = currentStatus?.name ?? "Unknown";

      const newStatusId = resolveStatusId(ctx, found.itemTypeId, newStatusName);
      if (!newStatusId) {
        const valid = ctx.statuses
          .filter((s) => s.itemTypeId === found.itemTypeId)
          .map((s) => s.name);
        return {
          error: `Unknown status "${newStatusName}" for this item type. Valid statuses: ${valid.join(", ")}`,
        };
      }

      if (found.statusId === newStatusId) {
        return { error: `${itemCode} is already in status "${newStatusName}"` };
      }

      const currentLocation = found.locationId
        ? (ctx.locations.find((l) => l.id === found.locationId)?.name ?? null)
        : null;

      const pendingAction: PendingAction = {
        type: "updateItemStatus",
        description: `Update ${itemCode} from "${currentStatusName}" to "${newStatusName}"`,
        affectedItems: [
          {
            id: found.id,
            code: found.code,
            currentStatus: currentStatusName,
            currentLocation: currentLocation ?? undefined,
          },
        ],
        changes: { status: `${currentStatusName} → ${newStatusName}` },
        payload: { itemIds: [found.id], statusId: newStatusId },
        requiresConfirmation: true,
      };

      return pendingAction;
    },
  });
}
