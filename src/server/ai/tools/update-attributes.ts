import { tool } from "ai";
import { z } from "zod/v4";
import { and, desc, eq, inArray } from "drizzle-orm";

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

export function createUpdateAttributesTool(ctx: SchemaContext) {
  return tool({
    description:
      "Propose setting or updating custom attributes on one or more lots. Target lots by specific codes OR by filter criteria (lot type + optional status/variant/location). The attributes are merged into existing values. Returns a pending action that the user must confirm.",
    inputSchema: z.object({
      lotCodes: z
        .array(z.string())
        .optional()
        .describe("Specific lot codes to update"),
      lotTypeName: z
        .string()
        .optional()
        .describe(
          "Lot type name to filter by (use when not specifying codes)",
        ),
      statusName: z.string().optional().describe("Current status to filter by"),
      variantName: z.string().optional().describe("Variant to filter by"),
      locationName: z.string().optional().describe("Location to filter by"),
      limit: z
        .number()
        .optional()
        .default(50)
        .describe(
          "Max lots to update when using filters (default 50). Use listLots first to check how many match.",
        ),
      attributes: z
        .record(z.string(), z.unknown())
        .describe(
          'Key-value pairs to set. Keys must match the lot type\'s attribute definitions (e.g. { "harvested_by": "James" }).',
        ),
    }),
    execute: async ({
      lotCodes,
      lotTypeName,
      statusName,
      variantName,
      locationName,
      limit: maxLots,
      attributes,
    }) => {
      if (!attributes || Object.keys(attributes).length === 0) {
        return { error: "No attributes provided to update" };
      }

      let matchedLots: {
        id: string;
        code: string;
        statusId: string;
        locationId: string | null;
        lotTypeId: string;
        attributes: unknown;
      }[];

      if (lotCodes && lotCodes.length > 0) {
        matchedLots = await db
          .select({
            id: lot.id,
            code: lot.code,
            statusId: lot.statusId,
            locationId: lot.locationId,
            lotTypeId: lot.lotTypeId,
            attributes: lot.attributes,
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

        if (locationName) {
          const locId = resolveLocationId(ctx, locationName);
          if (!locId) return { error: `Unknown location: "${locationName}"` };
          conditions.push(eq(lot.locationId, locId));
        }

        matchedLots = await db
          .select({
            id: lot.id,
            code: lot.code,
            statusId: lot.statusId,
            locationId: lot.locationId,
            lotTypeId: lot.lotTypeId,
            attributes: lot.attributes,
          })
          .from(lot)
          .where(and(...conditions))
          .orderBy(desc(lot.createdAt))
          .limit(maxLots);

        if (matchedLots.length === 0)
          return { error: "No lots match the given filters" };
      } else {
        return {
          error:
            "Provide either lotCodes or lotTypeName to identify lots to update",
        };
      }

      const typeId = matchedLots[0]!.lotTypeId;
      const validAttrs = ctx.attributes.filter((a) => a.lotTypeId === typeId);
      const validKeys = new Set(validAttrs.map((a) => a.attrKey));

      const invalidKeys = Object.keys(attributes).filter(
        (k) => !validKeys.has(k),
      );
      if (invalidKeys.length > 0) {
        return {
          error: `Unknown attribute(s): ${invalidKeys.join(", ")}. Valid attributes for this lot type: ${validAttrs.map((a) => a.attrKey).join(", ")}`,
        };
      }

      const affectedLots = matchedLots.map((i) => ({
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
        description: `Update attributes on ${matchedLots.length} lot(s)`,
        affectedLots,
        changes,
        payload: {
          lotIds: matchedLots.map((i) => i.id),
          attributes,
        },
        requiresConfirmation: true,
      };

      return pendingAction;
    },
  });
}
