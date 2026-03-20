import { tool } from "ai";
import { z } from "zod/v4";
import { eq, inArray } from "drizzle-orm";

import { db } from "~/server/db";
import { item, itemLineage } from "~/server/db/schema";
import type { SchemaContext } from "../build-schema-context";

export function createGetItemLineageTool(ctx: SchemaContext) {
  return tool({
    description:
      "Get the lineage (parent-child relationships) for a specific item. Shows what items it came from (parents) and what it was used to make (children).",
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

      const parentLinks = await db
        .select()
        .from(itemLineage)
        .where(eq(itemLineage.childItemId, found.id));

      const childLinks = await db
        .select()
        .from(itemLineage)
        .where(eq(itemLineage.parentItemId, found.id));

      const relatedIds = [
        ...parentLinks.map((l) => l.parentItemId),
        ...childLinks.map((l) => l.childItemId),
      ];

      const relatedItems =
        relatedIds.length > 0
          ? await db
              .select({
                id: item.id,
                code: item.code,
                itemTypeId: item.itemTypeId,
                statusId: item.statusId,
              })
              .from(item)
              .where(inArray(item.id, relatedIds))
          : [];

      const relatedMap = new Map(relatedItems.map((i) => [i.id, i]));

      const formatRelated = (id: string, relationship: string) => {
        const rel = relatedMap.get(id);
        if (!rel) return { id, relationship };
        const typeName =
          ctx.itemTypes.find((t) => t.id === rel.itemTypeId)?.name ?? null;
        const relStatusName =
          ctx.statuses.find((s) => s.id === rel.statusId)?.name ?? null;
        return {
          code: rel.code,
          itemType: typeName,
          status: relStatusName,
          relationship,
        };
      };

      return {
        item: itemCode,
        parents: parentLinks.map((l) =>
          formatRelated(l.parentItemId, l.relationship),
        ),
        children: childLinks.map((l) =>
          formatRelated(l.childItemId, l.relationship),
        ),
      };
    },
  });
}
