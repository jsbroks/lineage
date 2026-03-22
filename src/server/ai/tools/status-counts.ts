import { tool } from "ai";
import { z } from "zod/v4";
import { count, eq } from "drizzle-orm";

import { db } from "~/server/db";
import { lot } from "~/server/db/schema";
import type { SchemaContext } from "../build-schema-context";
import { resolveLotTypeId } from "./resolve";

export function createStatusCountsTool(ctx: SchemaContext) {
  return tool({
    description:
      "Get a count of lots in each status for a given lot type. Focus on non-terminal (in-progress) statuses for inventory overviews — terminal/completed counts grow monotonically and are not useful as insights or percentages.",
    inputSchema: z.object({
      lotTypeName: z.string().describe("Name of the lot type"),
    }),
    execute: async ({ lotTypeName }) => {
      const typeId = resolveLotTypeId(ctx, lotTypeName);
      if (!typeId)
        return { error: `Unknown lot type: "${lotTypeName}"`, counts: [] };

      const rows = await db
        .select({
          statusId: lot.statusId,
          total: count(),
        })
        .from(lot)
        .where(eq(lot.lotTypeId, typeId))
        .groupBy(lot.statusId);

      const statusMap = new Map(
        ctx.statuses
          .filter((s) => s.lotTypeId === typeId)
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
