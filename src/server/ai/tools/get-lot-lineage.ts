import { tool } from "ai";
import { z } from "zod/v4";
import { eq, inArray } from "drizzle-orm";

import { db } from "~/server/db";
import { lot, lotLineage } from "~/server/db/schema";
import type { SchemaContext } from "../build-schema-context";

export function createGetLotLineageTool(ctx: SchemaContext) {
  return tool({
    description:
      "Get the lineage (parent-child relationships) for a specific lot. Shows what lots it came from (parents) and what it was used to make (children).",
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

      const parentLinks = await db
        .select()
        .from(lotLineage)
        .where(eq(lotLineage.childLotId, found.id));

      const childLinks = await db
        .select()
        .from(lotLineage)
        .where(eq(lotLineage.parentLotId, found.id));

      const relatedIds = [
        ...parentLinks.map((l) => l.parentLotId),
        ...childLinks.map((l) => l.childLotId),
      ];

      const relatedLots =
        relatedIds.length > 0
          ? await db
              .select({
                id: lot.id,
                code: lot.code,
                lotTypeId: lot.lotTypeId,
                statusId: lot.statusId,
              })
              .from(lot)
              .where(inArray(lot.id, relatedIds))
          : [];

      const relatedMap = new Map(relatedLots.map((i) => [i.id, i]));

      const formatRelated = (id: string, relationship: string) => {
        const rel = relatedMap.get(id);
        if (!rel) return { id, relationship };
        const typeName =
          ctx.lotTypes.find((t) => t.id === rel.lotTypeId)?.name ?? null;
        const relStatusName =
          ctx.statuses.find((s) => s.id === rel.statusId)?.name ?? null;
        return {
          code: rel.code,
          lotType: typeName,
          status: relStatusName,
          relationship,
        };
      };

      return {
        lot: lotCode,
        parents: parentLinks.map((l) =>
          formatRelated(l.parentLotId, l.relationship),
        ),
        children: childLinks.map((l) =>
          formatRelated(l.childLotId, l.relationship),
        ),
      };
    },
  });
}
