import { tool } from "ai";
import { z } from "zod/v4";
import { eq } from "drizzle-orm";

import { db } from "~/server/db";
import { lot } from "~/server/db/schema";
import type { SchemaContext } from "../build-schema-context";
import { resolveStatusId } from "./resolve";
import type { PendingAction } from "./pending-action";

export function createUpdateLotStatusTool(ctx: SchemaContext) {
  return tool({
    description:
      "Propose updating the status of a single lot by its code. Returns a pending action that the user must confirm before it executes. Use when the user asks to change, mark, or set a lot's status.",
    inputSchema: z.object({
      lotCode: z.string().describe("The lot code (e.g. 'BLK-042')"),
      newStatusName: z
        .string()
        .describe("The target status name (e.g. 'Contaminated')"),
    }),
    execute: async ({ lotCode, newStatusName }) => {
      const [found] = await db
        .select()
        .from(lot)
        .where(eq(lot.code, lotCode))
        .limit(1);

      if (!found) return { error: `Lot not found: "${lotCode}"` };

      const currentStatus = ctx.statuses.find((s) => s.id === found.statusId);
      const currentStatusName = currentStatus?.name ?? "Unknown";

      const newStatusId = resolveStatusId(ctx, found.lotTypeId, newStatusName);
      if (!newStatusId) {
        const valid = ctx.statuses
          .filter((s) => s.lotTypeId === found.lotTypeId)
          .map((s) => s.name);
        return {
          error: `Unknown status "${newStatusName}" for this lot type. Valid statuses: ${valid.join(", ")}`,
        };
      }

      if (found.statusId === newStatusId) {
        return { error: `${lotCode} is already in status "${newStatusName}"` };
      }

      const currentLocation = found.locationId
        ? (ctx.locations.find((l) => l.id === found.locationId)?.name ?? null)
        : null;

      const pendingAction: PendingAction = {
        type: "updateLotStatus",
        description: `Update ${lotCode} from "${currentStatusName}" to "${newStatusName}"`,
        affectedLots: [
          {
            id: found.id,
            code: found.code,
            currentStatus: currentStatusName,
            currentLocation: currentLocation ?? undefined,
          },
        ],
        changes: { status: `${currentStatusName} → ${newStatusName}` },
        payload: { lotIds: [found.id], statusId: newStatusId },
        requiresConfirmation: true,
      };

      return pendingAction;
    },
  });
}
