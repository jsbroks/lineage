import { tool } from "ai";
import { z } from "zod/v4";

import { detectAnomalies } from "../anomaly-detection";
import type { SchemaContext } from "../build-schema-context";

export function createDetectAnomaliesTool(_ctx: SchemaContext) {
  return tool({
    description:
      "Detect anomalies in the inventory: stuck lots (in a status much longer than peers), throughput drops (fewer status transitions this week vs last week), and yield outliers (unusual quantities by type/variant). Call this when the user asks about problems, issues, anomalies, stuck lots, things that need attention, or anything unusual.",
    inputSchema: z.object({
      scope: z
        .enum(["all", "stuckLots", "throughputChanges", "yieldOutliers"])
        .default("all")
        .describe(
          "Which anomaly type to check. Use 'all' for a full scan, or a specific type if the user asked about something particular.",
        ),
    }),
    execute: async ({ scope }) => {
      const report = await detectAnomalies();

      if (scope === "stuckLots") {
        return {
          stuckLots: report.stuckLots,
          generatedAt: report.generatedAt,
        };
      }
      if (scope === "throughputChanges") {
        return {
          throughputChanges: report.throughputChanges,
          generatedAt: report.generatedAt,
        };
      }
      if (scope === "yieldOutliers") {
        return {
          yieldOutliers: report.yieldOutliers,
          generatedAt: report.generatedAt,
        };
      }

      return report;
    },
  });
}
