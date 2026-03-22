import { tool } from "ai";
import { z } from "zod/v4";
import { and, eq } from "drizzle-orm";

import { db } from "~/server/db";
import { lot } from "~/server/db/schema";
import type { SchemaContext } from "../build-schema-context";
import {
  resolveLotTypeId,
  resolveStatusId,
  resolveVariantId,
  resolveLocationId,
} from "./resolve";
import type { PendingAction } from "./pending-action";

export function createBulkUpdateStatusTool(ctx: SchemaContext) {
  return tool({
    description:
      "Propose updating the status of multiple lots matching filter criteria. Use for bulk operations like 'Mark all Colonizing blocks as Ready to Fruit'. Returns a pending action that the user must confirm.",
    inputSchema: z.object({
      lotTypeName: z.string().describe("Lot type name to filter by"),
      currentStatusName: z
        .string()
        .optional()
        .describe("Current status to filter by"),
      variantName: z.string().optional().describe("Variant to filter by"),
      locationName: z.string().optional().describe("Location to filter by"),
      newStatusName: z.string().describe("Target status name"),
    }),
    execute: async ({
      lotTypeName,
      currentStatusName,
      variantName,
      locationName,
      newStatusName,
    }) => {
      const typeId = resolveLotTypeId(ctx, lotTypeName);
      if (!typeId) return { error: `Unknown lot type: "${lotTypeName}"` };

      const newStatusId = resolveStatusId(ctx, typeId, newStatusName);
      if (!newStatusId) {
        const valid = ctx.statuses
          .filter((s) => s.lotTypeId === typeId)
          .map((s) => s.name);
        return {
          error: `Unknown status "${newStatusName}". Valid statuses: ${valid.join(", ")}`,
        };
      }

      const conditions = [eq(lot.lotTypeId, typeId)];

      if (currentStatusName) {
        const statusId = resolveStatusId(ctx, typeId, currentStatusName);
        if (!statusId)
          return { error: `Unknown status: "${currentStatusName}"` };
        conditions.push(eq(lot.statusId, statusId));
      }

      if (variantName) {
        const variantId = resolveVariantId(ctx, typeId, variantName);
        if (!variantId) return { error: `Unknown variant: "${variantName}"` };
        conditions.push(eq(lot.variantId, variantId));
      }

      if (locationName) {
        const locId = resolveLocationId(ctx, locationName);
        if (!locId) return { error: `Unknown location: "${locationName}"` };
        conditions.push(eq(lot.locationId, locId));
      }

      const matchedLots = await db
        .select({
          id: lot.id,
          code: lot.code,
          statusId: lot.statusId,
          locationId: lot.locationId,
        })
        .from(lot)
        .where(and(...conditions))
        .limit(500);

      if (matchedLots.length === 0)
        return { error: "No lots match the given filters" };

      const lotsToUpdate = matchedLots.filter(
        (i) => i.statusId !== newStatusId,
      );
      if (lotsToUpdate.length === 0) {
        return {
          error: `All matching lots are already in status "${newStatusName}"`,
        };
      }

      const affectedLots = lotsToUpdate.map((i) => ({
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
        description: `Update ${lotsToUpdate.length} ${lotTypeName} lot(s) from ${fromLabel} to "${newStatusName}"`,
        affectedLots,
        changes: { status: `${fromLabel} → ${newStatusName}` },
        payload: {
          lotIds: lotsToUpdate.map((i) => i.id),
          statusId: newStatusId,
        },
        requiresConfirmation: true,
      };

      return pendingAction;
    },
  });
}
