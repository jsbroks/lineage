import { tool } from "ai";
import { z } from "zod/v4";
import { desc, eq } from "drizzle-orm";

import { db } from "~/server/db";
import {
  lot,
  lotType,
  lotTypeVariant,
  lotEvent,
  location,
} from "~/server/db/schema";
import type { SchemaContext } from "../build-schema-context";

export function createGetLotDetailTool(ctx: SchemaContext) {
  return tool({
    description:
      "Get detailed information about a specific lot by its code, including its full attributes, location, recent events, and lineage.",
    inputSchema: z.object({
      lotCode: z.string().describe("The lot code (e.g. 'LM-00042')"),
    }),
    execute: async ({ lotCode }) => {
      const [found] = await db
        .select()
        .from(lot)
        .where(eq(lot.code, lotCode))
        .limit(1);

      if (!found) return { error: `Lot not found: "${lotCode}"` };

      const [foundType] = await db
        .select()
        .from(lotType)
        .where(eq(lotType.id, found.lotTypeId))
        .limit(1);

      const statusName =
        ctx.statuses.find((s) => s.id === found.statusId)?.name ??
        found.statusId;

      const [foundVariant] = found.variantId
        ? await db
            .select({ name: lotTypeVariant.name })
            .from(lotTypeVariant)
            .where(eq(lotTypeVariant.id, found.variantId))
            .limit(1)
        : [undefined];

      const [foundLocation] = found.locationId
        ? await db
            .select({ name: location.name })
            .from(location)
            .where(eq(location.id, found.locationId))
            .limit(1)
        : [undefined];

      const events = await db
        .select({
          name: lotEvent.name,
          eventType: lotEvent.eventType,
          attributes: lotEvent.attributes,
          recordedAt: lotEvent.recordedAt,
        })
        .from(lotEvent)
        .where(eq(lotEvent.lotId, found.id))
        .orderBy(desc(lotEvent.recordedAt))
        .limit(10);

      return {
        code: found.code,
        lotType: foundType?.name ?? null,
        status: statusName,
        variant: foundVariant?.name ?? null,
        location: foundLocation?.name ?? null,
        quantity: found.quantity,
        quantityUnit: found.quantityUnit,
        value: found.value,
        attributes: found.attributes,
        createdAt: found.createdAt,
        recentEvents: events,
      };
    },
  });
}
