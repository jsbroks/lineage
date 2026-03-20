import { tool } from "ai";
import { z } from "zod/v4";
import { desc, eq } from "drizzle-orm";

import { db } from "~/server/db";
import {
  item,
  itemType,
  itemTypeVariant,
  itemEvent,
  location,
} from "~/server/db/schema";
import type { SchemaContext } from "../build-schema-context";

export function createGetItemDetailTool(ctx: SchemaContext) {
  return tool({
    description:
      "Get detailed information about a specific item by its code, including its full attributes, location, recent events, and lineage.",
    inputSchema: z.object({
      itemCode: z.string().describe("The item code (e.g. 'LM-00042')"),
    }),
    execute: async ({ itemCode }) => {
      const [found] = await db
        .select()
        .from(item)
        .where(eq(item.code, itemCode))
        .limit(1);

      if (!found) return { error: `Item not found: "${itemCode}"` };

      const [foundType] = await db
        .select()
        .from(itemType)
        .where(eq(itemType.id, found.itemTypeId))
        .limit(1);

      const statusName =
        ctx.statuses.find((s) => s.id === found.statusId)?.name ??
        found.statusId;

      const [foundVariant] = found.variantId
        ? await db
            .select({ name: itemTypeVariant.name })
            .from(itemTypeVariant)
            .where(eq(itemTypeVariant.id, found.variantId))
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
          eventType: itemEvent.eventType,
          message: itemEvent.message,
          recordedAt: itemEvent.recordedAt,
        })
        .from(itemEvent)
        .where(eq(itemEvent.itemId, found.id))
        .orderBy(desc(itemEvent.recordedAt))
        .limit(10);

      return {
        code: found.code,
        itemType: foundType?.name ?? null,
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
