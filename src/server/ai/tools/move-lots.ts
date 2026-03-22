import { tool } from "ai";
import { z } from "zod/v4";
import { and, eq, inArray } from "drizzle-orm";

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

export function createMoveLotsTool(ctx: SchemaContext) {
  return tool({
    description:
      "Propose moving lots to a new location. Target lots by specific codes OR by filter criteria (lot type + optional status/variant/location). Returns a pending action that the user must confirm.",
    inputSchema: z.object({
      lotCodes: z
        .array(z.string())
        .optional()
        .describe("Specific lot codes to move"),
      lotTypeName: z
        .string()
        .optional()
        .describe("Lot type name to filter by (use when not specifying codes)"),
      statusName: z.string().optional().describe("Current status to filter by"),
      variantName: z.string().optional().describe("Variant to filter by"),
      currentLocationName: z
        .string()
        .optional()
        .describe("Current location to filter by"),
      newLocationName: z
        .string()
        .describe("Target location name to move lots to"),
    }),
    execute: async ({
      lotCodes,
      lotTypeName,
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

      let matchedLots: {
        id: string;
        code: string;
        statusId: string;
        locationId: string | null;
      }[];

      if (lotCodes && lotCodes.length > 0) {
        matchedLots = await db
          .select({
            id: lot.id,
            code: lot.code,
            statusId: lot.statusId,
            locationId: lot.locationId,
          })
          .from(lot)
          .where(inArray(lot.code, lotCodes));

        if (matchedLots.length === 0)
          return { error: "No lots found matching the provided codes" };

        const notFound = lotCodes.filter(
          (c) => !matchedLots.some((i) => i.code === c),
        );
        if (notFound.length > 0) {
          return { error: `Lots not found: ${notFound.join(", ")}` };
        }
      } else if (lotTypeName) {
        const typeId = resolveLotTypeId(ctx, lotTypeName);
        if (!typeId) return { error: `Unknown lot type: "${lotTypeName}"` };

        const conditions = [eq(lot.lotTypeId, typeId)];

        if (statusName) {
          const statusId = resolveStatusId(ctx, typeId, statusName);
          if (!statusId) return { error: `Unknown status: "${statusName}"` };
          conditions.push(eq(lot.statusId, statusId));
        }

        if (variantName) {
          const variantId = resolveVariantId(ctx, typeId, variantName);
          if (!variantId) return { error: `Unknown variant: "${variantName}"` };
          conditions.push(eq(lot.variantId, variantId));
        }

        if (currentLocationName) {
          const locId = resolveLocationId(ctx, currentLocationName);
          if (!locId)
            return { error: `Unknown location: "${currentLocationName}"` };
          conditions.push(eq(lot.locationId, locId));
        }

        matchedLots = await db
          .select({
            id: lot.id,
            code: lot.code,
            statusId: lot.statusId,
            locationId: lot.locationId,
          })
          .from(lot)
          .where(and(...conditions))
          .limit(200);

        if (matchedLots.length === 0)
          return { error: "No lots match the given filters" };
      } else {
        return {
          error:
            "Provide either lotCodes or lotTypeName to identify lots to move",
        };
      }

      const lotsToMove = matchedLots.filter(
        (i) => i.locationId !== newLocationId,
      );
      if (lotsToMove.length === 0) {
        return {
          error: `All matching lots are already at "${newLocationName}"`,
        };
      }

      const affectedLots = lotsToMove.map((i) => ({
        id: i.id,
        code: i.code,
        currentStatus: ctx.statuses.find((s) => s.id === i.statusId)?.name,
        currentLocation: i.locationId
          ? ctx.locations.find((l) => l.id === i.locationId)?.name
          : undefined,
      }));

      const pendingAction: PendingAction = {
        type: "moveLots",
        description: `Move ${lotsToMove.length} lot(s) to "${newLocationName}"`,
        affectedLots,
        changes: { location: `→ ${newLocationName}` },
        payload: {
          lotIds: lotsToMove.map((i) => i.id),
          locationId: newLocationId,
        },
        requiresConfirmation: true,
      };

      return pendingAction;
    },
  });
}
