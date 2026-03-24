import { tool } from "ai";
import { z } from "zod/v4";
import { and, eq, sql } from "drizzle-orm";

import { db } from "~/server/db";
import {
  lot,
  lotTypeVariant,
  lotTypeAttributeDefinition,
  location,
} from "~/server/db/schema";
import type { SchemaContext } from "../build-schema-context";
import {
  resolveLotTypeId,
  resolveStatusId,
  resolveVariantId,
  resolveLocationId,
} from "./resolve";

export function createAggregateLotsTool(ctx: SchemaContext) {
  return tool({
    description:
      "Aggregate inventory data with grouping, metrics, and filters. Supports built-in fields (status, variant, location, quantity, value) and custom attributes via the 'attr:<key>' prefix. Use for questions like 'total quantity by status', 'average spawn_rate per variant', or 'count by substrate_recipe where status is Colonizing'.",
    inputSchema: z.object({
      lotTypeName: z.string().describe("Name of the lot type"),
      groupBy: z
        .array(z.string())
        .max(4)
        .describe(
          "Fields to group by: 'status', 'variant', 'location', or 'attr:<key>' for custom attributes (e.g. 'attr:substrate_recipe')",
        ),
      metrics: z
        .array(
          z.object({
            field: z
              .string()
              .describe(
                "Field to measure: 'quantity', 'cost', or 'attr:<key>' for custom attributes (e.g. 'attr:spawn_rate')",
              ),
            op: z
              .enum(["count", "sum", "avg", "min", "max"])
              .describe("Aggregation operation"),
          }),
        )
        .max(6)
        .describe("What to measure (at least one metric)"),
      filters: z
        .object({
          statusName: z
            .string()
            .optional()
            .describe("Filter to a specific status by name"),
          variantName: z
            .string()
            .optional()
            .describe("Filter to a specific variant by name"),
          locationName: z
            .string()
            .optional()
            .describe("Filter to a specific location by name"),
          attrFilters: z
            .array(
              z.object({
                key: z
                  .string()
                  .describe("Attribute key (without 'attr:' prefix)"),
                op: z
                  .enum(["eq", "gte", "lte"])
                  .describe(
                    "Comparison: 'eq' for exact match, 'gte' for >=, 'lte' for <=",
                  ),
                value: z
                  .string()
                  .describe(
                    "Value to compare against (use ISO date strings for date attributes)",
                  ),
              }),
            )
            .optional()
            .describe("Filters on custom attributes"),
        })
        .optional()
        .describe("Optional filters to narrow results"),
    }),
    execute: async ({ lotTypeName, groupBy, metrics, filters }) => {
      const typeId = resolveLotTypeId(ctx, lotTypeName);
      if (!typeId)
        return { error: `Unknown lot type: "${lotTypeName}"`, rows: [] };

      const attrDefs = await db
        .select()
        .from(lotTypeAttributeDefinition)
        .where(eq(lotTypeAttributeDefinition.lotTypeId, typeId));
      const allowedAttrKeys = new Set(attrDefs.map((d) => d.attrKey));
      const attrTypeMap = new Map(attrDefs.map((d) => [d.attrKey, d.dataType]));

      const BUILTIN_FIELDS = new Set([
        "status",
        "variant",
        "location",
        "quantity",
        "cost",
      ]);

      const resolveField = (field: string) => {
        if (BUILTIN_FIELDS.has(field))
          return { kind: "builtin" as const, key: field };
        if (field.startsWith("attr:")) {
          const key = field.slice(5);
          if (!allowedAttrKeys.has(key))
            return {
              kind: "error" as const,
              key,
              message: `Unknown attribute: ${key}`,
            };
          return { kind: "attr" as const, key };
        }
        return {
          kind: "error" as const,
          key: field,
          message: `Unknown field: ${field}`,
        };
      };

      const groupByExprs: { key: string; expr: ReturnType<typeof sql> }[] = [];
      let needsVariantJoin = false;
      let needsLocationJoin = false;

      for (const field of groupBy) {
        const resolved = resolveField(field);
        if (resolved.kind === "error")
          return { error: resolved.message, rows: [] };

        if (resolved.kind === "builtin") {
          switch (resolved.key) {
            case "status":
              groupByExprs.push({ key: "status", expr: sql`${lot.statusId}` });
              break;
            case "variant":
              needsVariantJoin = true;
              groupByExprs.push({
                key: "variant",
                expr: sql`${lotTypeVariant.name}`,
              });
              break;
            case "location":
              needsLocationJoin = true;
              groupByExprs.push({
                key: "location",
                expr: sql`${location.name}`,
              });
              break;
            default:
              return { error: `Cannot group by '${resolved.key}'`, rows: [] };
          }
        } else {
          const escapedKey = resolved.key.replace(/'/g, "''");
          groupByExprs.push({
            key: field,
            expr: sql`${lot.attributes}->>${sql.raw(`'${escapedKey}'`)}`,
          });
        }
      }

      const metricExprs: {
        key: string;
        label: string;
        expr: ReturnType<typeof sql>;
      }[] = [];
      for (const m of metrics) {
        const resolved = resolveField(m.field);
        if (resolved.kind === "error")
          return { error: resolved.message, rows: [] };

        let valueExpr: ReturnType<typeof sql>;
        if (resolved.kind === "builtin") {
          switch (resolved.key) {
            case "quantity":
              valueExpr = sql`${lot.quantity}::numeric`;
              break;
            case "cost":
              valueExpr = sql`(${lot.unitCost}::numeric * ${lot.quantity}::numeric)`;
              break;
            default:
              if (m.op === "count") {
                valueExpr = sql`1`;
                break;
              }
              return {
                error: `Cannot aggregate '${resolved.key}' with ${m.op}`,
                rows: [],
              };
          }
        } else {
          const escapedKey = resolved.key.replace(/'/g, "''");
          const raw = sql`${lot.attributes}->>${sql.raw(`'${escapedKey}'`)}`;
          valueExpr = sql`CASE WHEN ${raw} ~ '^-?[0-9]*\\.?[0-9]+$' THEN (${raw})::numeric ELSE 0 END`;
        }

        const metricKey = `${m.op}_${m.field}`;
        const label = `${m.op}(${resolved.key})`;
        switch (m.op) {
          case "count":
            metricExprs.push({ key: metricKey, label, expr: sql`COUNT(*)` });
            break;
          case "sum":
            metricExprs.push({
              key: metricKey,
              label,
              expr: sql`SUM(${valueExpr})`,
            });
            break;
          case "avg":
            metricExprs.push({
              key: metricKey,
              label,
              expr: sql`AVG(${valueExpr})`,
            });
            break;
          case "min":
            metricExprs.push({
              key: metricKey,
              label,
              expr: sql`MIN(${valueExpr})`,
            });
            break;
          case "max":
            metricExprs.push({
              key: metricKey,
              label,
              expr: sql`MAX(${valueExpr})`,
            });
            break;
        }
      }

      if (groupByExprs.length === 0 && metricExprs.length === 0)
        return { columns: [], rows: [] };

      const conditions = [eq(lot.lotTypeId, typeId)];

      if (filters?.statusName) {
        const statusId = resolveStatusId(ctx, typeId, filters.statusName);
        if (!statusId)
          return { error: `Unknown status: "${filters.statusName}"`, rows: [] };
        conditions.push(eq(lot.statusId, statusId));
      }
      if (filters?.variantName) {
        const variantId = resolveVariantId(ctx, typeId, filters.variantName);
        if (!variantId)
          return {
            error: `Unknown variant: "${filters.variantName}"`,
            rows: [],
          };
        conditions.push(eq(lot.variantId, variantId));
      }
      if (filters?.locationName) {
        const locationId = resolveLocationId(ctx, filters.locationName);
        if (!locationId)
          return {
            error: `Unknown location: "${filters.locationName}"`,
            rows: [],
          };
        conditions.push(eq(lot.locationId, locationId));
        needsLocationJoin = true;
      }

      if (filters?.attrFilters) {
        for (const af of filters.attrFilters) {
          if (!allowedAttrKeys.has(af.key))
            return {
              error: `Unknown attribute filter key: "${af.key}"`,
              rows: [],
            };
          const escapedKey = af.key.replace(/'/g, "''");
          const jsonbExpr = sql`${lot.attributes}->>${sql.raw(`'${escapedKey}'`)}`;
          const dt = attrTypeMap.get(af.key);

          switch (af.op) {
            case "eq":
              conditions.push(sql`${jsonbExpr} = ${af.value}`);
              break;
            case "gte":
              if (dt === "date") {
                conditions.push(
                  sql`(${jsonbExpr})::timestamp >= ${af.value}::timestamp`,
                );
              } else {
                conditions.push(
                  sql`(${jsonbExpr})::numeric >= ${af.value}::numeric`,
                );
              }
              break;
            case "lte":
              if (dt === "date") {
                conditions.push(
                  sql`(${jsonbExpr})::timestamp <= ${af.value}::timestamp`,
                );
              } else {
                conditions.push(
                  sql`(${jsonbExpr})::numeric <= ${af.value}::numeric`,
                );
              }
              break;
          }
        }
      }

      const selectCols: Record<string, ReturnType<typeof sql>> = {};
      for (const g of groupByExprs) selectCols[g.key] = g.expr;
      for (const m of metricExprs) selectCols[m.key] = m.expr;

      let query = db
        .select(selectCols)
        .from(lot)
        .where(and(...conditions))
        .$dynamic();

      if (needsVariantJoin) {
        query = query.leftJoin(
          lotTypeVariant,
          eq(lot.variantId, lotTypeVariant.id),
        );
      }
      if (needsLocationJoin) {
        query = query.leftJoin(location, eq(lot.locationId, location.id));
      }
      if (groupByExprs.length > 0) {
        query = query.groupBy(...groupByExprs.map((g) => g.expr));
      }

      const rows = await query;

      const statusMap = new Map(
        ctx.statuses
          .filter((s) => s.lotTypeId === typeId)
          .map((s) => [s.id, s.name]),
      );

      const columns = [
        ...groupByExprs.map((g) => g.key),
        ...metricExprs.map((m) => m.label),
      ];

      return {
        columns,
        rows: rows.map((row) => {
          const r = row as Record<string, unknown>;
          const out: Record<string, unknown> = {};
          for (const g of groupByExprs) {
            const val = r[g.key];
            out[g.key] =
              g.key === "status" ? (statusMap.get(val as string) ?? val) : val;
          }
          for (const m of metricExprs) {
            out[m.label] = r[m.key];
          }
          return out;
        }),
      };
    },
  });
}
