import { tool } from "ai";
import { z } from "zod/v4";
import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  sql,
} from "drizzle-orm";

import { db } from "~/server/db";
import {
  item,
  itemType,
  itemTypeVariant,
  itemTypeStatusDefinition,
  itemLineage,
  itemEvent,
  location,
} from "~/server/db/schema";
import type { SchemaContext } from "./build-schema-context";

function resolveItemTypeId(ctx: SchemaContext, name: string): string | null {
  const lower = name.toLowerCase();
  return ctx.itemTypes.find((t) => t.name.toLowerCase() === lower)?.id ?? null;
}

function resolveStatusId(
  ctx: SchemaContext,
  itemTypeId: string,
  name: string,
): string | null {
  const lower = name.toLowerCase();
  return (
    ctx.statuses.find(
      (s) => s.itemTypeId === itemTypeId && s.name.toLowerCase() === lower,
    )?.id ?? null
  );
}

function resolveVariantId(
  ctx: SchemaContext,
  itemTypeId: string,
  name: string,
): string | null {
  const lower = name.toLowerCase();
  return (
    ctx.variants.find(
      (v) => v.itemTypeId === itemTypeId && v.name.toLowerCase() === lower,
    )?.id ?? null
  );
}

function resolveLocationId(ctx: SchemaContext, name: string): string | null {
  const lower = name.toLowerCase();
  return ctx.locations.find((l) => l.name.toLowerCase() === lower)?.id ?? null;
}

export function createTools(ctx: SchemaContext) {
  const listItems = tool({
    description:
      "Search and filter inventory items. Returns a list of items with their codes, statuses, variants, locations, and quantities.",
    inputSchema: z.object({
      itemTypeName: z.string().describe("Name of the item type to filter by"),
      statusName: z
        .string()
        .optional()
        .describe("Status name to filter by (e.g. 'Colonizing')"),
      variantName: z
        .string()
        .optional()
        .describe("Variant name to filter by"),
      locationName: z
        .string()
        .optional()
        .describe("Location name to filter by"),
      search: z.string().optional().describe("Search term to match item codes"),
      limit: z
        .number()
        .optional()
        .default(50)
        .describe("Max number of items to return (default 50)"),
    }),
    execute: async ({
      itemTypeName,
      statusName,
      variantName,
      locationName,
      search,
      limit: maxResults,
    }) => {
      const typeId = resolveItemTypeId(ctx, itemTypeName);
      if (!typeId)
        return { error: `Unknown item type: "${itemTypeName}"`, items: [] };

      const conditions = [eq(item.itemTypeId, typeId)];

      if (statusName) {
        const statusId = resolveStatusId(ctx, typeId, statusName);
        if (!statusId)
          return { error: `Unknown status: "${statusName}"`, items: [] };
        conditions.push(eq(item.statusId, statusId));
      }

      if (variantName) {
        const variantId = resolveVariantId(ctx, typeId, variantName);
        if (!variantId)
          return { error: `Unknown variant: "${variantName}"`, items: [] };
        conditions.push(eq(item.variantId, variantId));
      }

      if (locationName) {
        const locationId = resolveLocationId(ctx, locationName);
        if (!locationId)
          return { error: `Unknown location: "${locationName}"`, items: [] };
        conditions.push(eq(item.locationId, locationId));
      }

      if (search) {
        conditions.push(ilike(item.code, `%${search}%`));
      }

      const items = await db
        .select({
          id: item.id,
          code: item.code,
          statusId: item.statusId,
          variantId: item.variantId,
          variantName: itemTypeVariant.name,
          locationId: item.locationId,
          locationName: location.name,
          quantity: item.quantity,
          quantityUnit: item.quantityUnit,
          value: item.value,
          attributes: item.attributes,
          createdAt: item.createdAt,
        })
        .from(item)
        .leftJoin(itemTypeVariant, eq(item.variantId, itemTypeVariant.id))
        .leftJoin(location, eq(item.locationId, location.id))
        .where(and(...conditions))
        .orderBy(desc(item.createdAt))
        .limit(maxResults);

      const statusMap = new Map(
        ctx.statuses
          .filter((s) => s.itemTypeId === typeId)
          .map((s) => [s.id, s.name]),
      );

      return {
        totalReturned: items.length,
        items: items.map((i) => ({
          code: i.code,
          status: statusMap.get(i.statusId) ?? i.statusId,
          variant: i.variantName ?? null,
          location: i.locationName ?? null,
          quantity: i.quantity,
          quantityUnit: i.quantityUnit,
          value: i.value,
          attributes: i.attributes,
          createdAt: i.createdAt,
        })),
      };
    },
  });

  const statusCounts = tool({
    description:
      "Get a count of items in each status for a given item type. Great for inventory overviews.",
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

  const getItemDetail = tool({
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

  const getItemLineage = tool({
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

  const aggregateItems = tool({
    description:
      "Aggregate inventory data: count items, sum/avg quantities or values, grouped by status, variant, or location. Use for questions like 'total quantity by status' or 'average value per variant'.",
    inputSchema: z.object({
      itemTypeName: z.string().describe("Name of the item type"),
      groupBy: z
        .array(z.enum(["status", "variant", "location"]))
        .describe("Fields to group by"),
      metric: z
        .enum([
          "count",
          "sum_quantity",
          "avg_quantity",
          "sum_value",
          "avg_value",
        ])
        .describe("What to measure"),
    }),
    execute: async ({ itemTypeName, groupBy, metric }) => {
      const typeId = resolveItemTypeId(ctx, itemTypeName);
      if (!typeId)
        return { error: `Unknown item type: "${itemTypeName}"`, rows: [] };

      const groupByExprs: { key: string; expr: ReturnType<typeof sql> }[] = [];
      let needsVariantJoin = false;
      let needsLocationJoin = false;

      for (const field of groupBy) {
        switch (field) {
          case "status":
            groupByExprs.push({
              key: "status",
              expr: sql`${item.statusId}`,
            });
            break;
          case "variant":
            needsVariantJoin = true;
            groupByExprs.push({
              key: "variant",
              expr: sql`${itemTypeVariant.name}`,
            });
            break;
          case "location":
            needsLocationJoin = true;
            groupByExprs.push({
              key: "location",
              expr: sql`${location.name}`,
            });
            break;
        }
      }

      let metricExpr: ReturnType<typeof sql>;
      switch (metric) {
        case "count":
          metricExpr = sql`COUNT(*)`;
          break;
        case "sum_quantity":
          metricExpr = sql`SUM(${item.quantity}::numeric)`;
          break;
        case "avg_quantity":
          metricExpr = sql`AVG(${item.quantity}::numeric)`;
          break;
        case "sum_value":
          metricExpr = sql`SUM(${item.value}::numeric)`;
          break;
        case "avg_value":
          metricExpr = sql`AVG(${item.value}::numeric)`;
          break;
      }

      const selectCols: Record<string, ReturnType<typeof sql>> = {};
      for (const g of groupByExprs) selectCols[g.key] = g.expr;
      selectCols["metric"] = metricExpr;

      let query = db
        .select(selectCols)
        .from(item)
        .where(eq(item.itemTypeId, typeId))
        .$dynamic();

      if (needsVariantJoin) {
        query = query.leftJoin(
          itemTypeVariant,
          eq(item.variantId, itemTypeVariant.id),
        );
      }
      if (needsLocationJoin) {
        query = query.leftJoin(location, eq(item.locationId, location.id));
      }
      if (groupByExprs.length > 0) {
        query = query.groupBy(...groupByExprs.map((g) => g.expr));
      }

      const rows = await query;

      const statusMap = new Map(
        ctx.statuses
          .filter((s) => s.itemTypeId === typeId)
          .map((s) => [s.id, s.name]),
      );

      return {
        metric,
        groupBy,
        rows: rows.map((row) => {
          const r = row as Record<string, unknown>;
          const out: Record<string, unknown> = { value: r.metric };
          if (r.status)
            out.status =
              statusMap.get(r.status as string) ?? (r.status as string);
          if (r.variant) out.variant = r.variant;
          if (r.location) out.location = r.location;
          return out;
        }),
      };
    },
  });

  return {
    listItems,
    statusCounts,
    getItemDetail,
    getItemLineage,
    aggregateItems,
  };
}
