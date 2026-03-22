import { and, count, eq, gte, inArray, lt, sql } from "drizzle-orm";

import { db } from "~/server/db";
import {
  item,
  itemEvent,
  itemType,
  itemTypeStatusDefinition,
  itemTypeVariant,
  location,
} from "~/server/db/schema";

export type StuckItem = {
  itemId: string;
  code: string;
  itemTypeName: string;
  statusName: string;
  variantName: string | null;
  locationName: string | null;
  daysInStatus: number;
  avgDaysInStatus: number;
};

export type ThroughputChange = {
  itemTypeName: string;
  recentCount: number;
  priorCount: number;
  changePercent: number;
};

export type YieldOutlier = {
  itemId: string;
  code: string;
  itemTypeName: string;
  variantName: string | null;
  quantity: number;
  avgQuantity: number;
};

export type AnomalyReport = {
  stuckItems: StuckItem[];
  throughputChanges: ThroughputChange[];
  yieldOutliers: YieldOutlier[];
  generatedAt: string;
};

export async function detectAnomalies(): Promise<AnomalyReport> {
  const [stuckItems, throughputChanges, yieldOutliers] = await Promise.all([
    detectStuckItems(),
    detectThroughputChanges(),
    detectYieldOutliers(),
  ]);

  return {
    stuckItems,
    throughputChanges,
    yieldOutliers,
    generatedAt: new Date().toISOString(),
  };
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[], avg: number): number {
  const variance =
    values.reduce((a, v) => a + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

async function detectStuckItems(): Promise<StuckItem[]> {
  const nonTerminalItems = await db
    .select({
      id: item.id,
      code: item.code,
      itemTypeId: item.itemTypeId,
      statusId: item.statusId,
      variantId: item.variantId,
      locationId: item.locationId,
      createdAt: item.createdAt,
      itemTypeName: itemType.name,
      statusName: itemTypeStatusDefinition.name,
    })
    .from(item)
    .innerJoin(
      itemTypeStatusDefinition,
      eq(item.statusId, itemTypeStatusDefinition.id),
    )
    .innerJoin(itemType, eq(item.itemTypeId, itemType.id))
    .where(eq(itemTypeStatusDefinition.isTerminal, false));

  if (nonTerminalItems.length === 0) return [];

  const itemIds = nonTerminalItems.map((i) => i.id);

  const lastStatusChanges = await db
    .select({
      itemId: itemEvent.itemId,
      lastChange: sql<string>`MAX(${itemEvent.recordedAt})`.as("last_change"),
    })
    .from(itemEvent)
    .where(
      and(
        inArray(itemEvent.itemId, itemIds),
        sql`${itemEvent.eventType} IN ('status_change', 'status_changed')`,
      ),
    )
    .groupBy(itemEvent.itemId);

  const lastChangeMap = new Map(
    lastStatusChanges.map((e) => [e.itemId, new Date(e.lastChange)]),
  );

  const variantIds = [
    ...new Set(
      nonTerminalItems
        .map((i) => i.variantId)
        .filter((id): id is string => id != null),
    ),
  ];
  const locationIds = [
    ...new Set(
      nonTerminalItems
        .map((i) => i.locationId)
        .filter((id): id is string => id != null),
    ),
  ];

  const [variants, locations] = await Promise.all([
    variantIds.length > 0
      ? db
          .select({ id: itemTypeVariant.id, name: itemTypeVariant.name })
          .from(itemTypeVariant)
          .where(inArray(itemTypeVariant.id, variantIds))
      : Promise.resolve([]),
    locationIds.length > 0
      ? db
          .select({ id: location.id, name: location.name })
          .from(location)
          .where(inArray(location.id, locationIds))
      : Promise.resolve([]),
  ]);

  const variantMap = new Map(variants.map((v) => [v.id, v.name]));
  const locationMap = new Map(locations.map((l) => [l.id, l.name]));

  const now = Date.now();
  const itemsWithDwell = nonTerminalItems.map((i) => {
    const statusEnteredAt = lastChangeMap.get(i.id) ?? i.createdAt;
    const dwellHours = (now - statusEnteredAt.getTime()) / (1000 * 60 * 60);
    return { ...i, dwellHours };
  });

  const groups = new Map<string, typeof itemsWithDwell>();
  for (const i of itemsWithDwell) {
    const key = `${i.itemTypeId}::${i.statusId}`;
    const arr = groups.get(key) ?? [];
    arr.push(i);
    groups.set(key, arr);
  }

  const results: StuckItem[] = [];

  for (const [, group] of groups) {
    if (group.length < 3) continue;

    const dwells = group.map((i) => i.dwellHours);
    const avg = mean(dwells);
    const sd = stddev(dwells, avg);
    const threshold = avg + 2 * (sd > 0 ? sd : avg * 0.5);

    for (const i of group) {
      if (i.dwellHours > threshold) {
        results.push({
          itemId: i.id,
          code: i.code,
          itemTypeName: i.itemTypeName,
          statusName: i.statusName,
          variantName: i.variantId
            ? (variantMap.get(i.variantId) ?? null)
            : null,
          locationName: i.locationId
            ? (locationMap.get(i.locationId) ?? null)
            : null,
          daysInStatus: Math.round((i.dwellHours / 24) * 10) / 10,
          avgDaysInStatus: Math.round((avg / 24) * 10) / 10,
        });
      }
    }
  }

  results.sort(
    (a, b) =>
      b.daysInStatus - b.avgDaysInStatus - (a.daysInStatus - a.avgDaysInStatus),
  );
  return results.slice(0, 20);
}

async function detectThroughputChanges(): Promise<ThroughputChange[]> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [recentCounts, priorCounts] = await Promise.all([
    db
      .select({ itemTypeId: item.itemTypeId, total: count() })
      .from(itemEvent)
      .innerJoin(item, eq(itemEvent.itemId, item.id))
      .where(
        and(
          gte(itemEvent.recordedAt, sevenDaysAgo),
          sql`${itemEvent.eventType} IN ('status_change', 'status_changed')`,
        ),
      )
      .groupBy(item.itemTypeId),
    db
      .select({ itemTypeId: item.itemTypeId, total: count() })
      .from(itemEvent)
      .innerJoin(item, eq(itemEvent.itemId, item.id))
      .where(
        and(
          gte(itemEvent.recordedAt, fourteenDaysAgo),
          lt(itemEvent.recordedAt, sevenDaysAgo),
          sql`${itemEvent.eventType} IN ('status_change', 'status_changed')`,
        ),
      )
      .groupBy(item.itemTypeId),
  ]);

  const allTypeIds = [
    ...new Set([
      ...recentCounts.map((r) => r.itemTypeId),
      ...priorCounts.map((r) => r.itemTypeId),
    ]),
  ];

  if (allTypeIds.length === 0) return [];

  const types = await db
    .select({ id: itemType.id, name: itemType.name })
    .from(itemType)
    .where(inArray(itemType.id, allTypeIds));

  const typeNameMap = new Map(types.map((t) => [t.id, t.name]));
  const recentMap = new Map(recentCounts.map((r) => [r.itemTypeId, r.total]));
  const priorMap = new Map(priorCounts.map((r) => [r.itemTypeId, r.total]));

  const results: ThroughputChange[] = [];

  for (const typeId of allTypeIds) {
    const recent = recentMap.get(typeId) ?? 0;
    const prior = priorMap.get(typeId) ?? 0;

    if (prior === 0) continue;

    const changePercent = ((recent - prior) / prior) * 100;

    if (changePercent < -30) {
      results.push({
        itemTypeName: typeNameMap.get(typeId) ?? "Unknown",
        recentCount: recent,
        priorCount: prior,
        changePercent: Math.round(changePercent),
      });
    }
  }

  results.sort((a, b) => a.changePercent - b.changePercent);
  return results;
}

async function detectYieldOutliers(): Promise<YieldOutlier[]> {
  const itemsWithQuantity = await db
    .select({
      id: item.id,
      code: item.code,
      itemTypeId: item.itemTypeId,
      variantId: item.variantId,
      quantity: item.quantity,
      itemTypeName: itemType.name,
    })
    .from(item)
    .innerJoin(itemType, eq(item.itemTypeId, itemType.id))
    .where(sql`${item.quantity}::numeric > 0`);

  if (itemsWithQuantity.length === 0) return [];

  const variantIds = [
    ...new Set(
      itemsWithQuantity
        .map((i) => i.variantId)
        .filter((id): id is string => id != null),
    ),
  ];

  const variants =
    variantIds.length > 0
      ? await db
          .select({ id: itemTypeVariant.id, name: itemTypeVariant.name })
          .from(itemTypeVariant)
          .where(inArray(itemTypeVariant.id, variantIds))
      : [];

  const variantMap = new Map(variants.map((v) => [v.id, v.name]));

  const groups = new Map<string, typeof itemsWithQuantity>();
  for (const i of itemsWithQuantity) {
    const key = `${i.itemTypeId}::${i.variantId ?? "none"}`;
    const arr = groups.get(key) ?? [];
    arr.push(i);
    groups.set(key, arr);
  }

  const results: YieldOutlier[] = [];

  for (const [, group] of groups) {
    if (group.length < 3) continue;

    const quantities = group.map((i) => Number(i.quantity));
    const avg = mean(quantities);
    const sd = stddev(quantities, avg);

    if (sd === 0) continue;

    for (const i of group) {
      const qty = Number(i.quantity);
      if (Math.abs(qty - avg) > 2 * sd) {
        results.push({
          itemId: i.id,
          code: i.code,
          itemTypeName: i.itemTypeName,
          variantName: i.variantId
            ? (variantMap.get(i.variantId) ?? null)
            : null,
          quantity: qty,
          avgQuantity: Math.round(avg * 100) / 100,
        });
      }
    }
  }

  results.sort(
    (a, b) =>
      Math.abs(b.quantity - b.avgQuantity) -
      Math.abs(a.quantity - a.avgQuantity),
  );
  return results.slice(0, 20);
}
