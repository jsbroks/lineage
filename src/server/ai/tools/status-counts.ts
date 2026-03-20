import { tool } from "ai";
import { z } from "zod/v4";
import { count, eq } from "drizzle-orm";

import { db } from "~/server/db";
import { item } from "~/server/db/schema";
import type { SchemaContext } from "../build-schema-context";
import { resolveItemTypeId } from "./resolve";

export function createStatusCountsTool(ctx: SchemaContext) {
  return tool({
    description:
      "Get a count of items in each status for a given item type. Focus on non-terminal (in-progress) statuses for inventory overviews — terminal/completed counts grow monotonically and are not useful as insights or percentages.",
    inputSchema: z.object({
      itemTypeName: z.string().describe("Name of the item type"),
    }),
    execute: async ({ itemTypeName }) => {
      const typeId = resolveItemTypeId(ctx, itemTypeName);
      if (!typeId)
        return { error: `Unknown item type: "${itemTypeName}"`, counts: [] };

      const rows = await db
        .select({
          statusId: item.statusId,
          total: count(),
        })
        .from(item)
        .where(eq(item.itemTypeId, typeId))
        .groupBy(item.statusId);

      const statusMap = new Map(
        ctx.statuses
          .filter((s) => s.itemTypeId === typeId)
          .map((s) => [s.id, s]),
      );

      return {
        counts: rows.map((r) => {
          const status = statusMap.get(r.statusId);
          return {
            status: status?.name ?? r.statusId,
            isInitial: status?.isInitial ?? false,
            isTerminal: status?.isTerminal ?? false,
            count: r.total,
          };
        }),
      };
    },
  });
}
