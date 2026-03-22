import { and, count, eq, gte, inArray, lt, sql } from "drizzle-orm";

import { db } from "~/server/db";
import {
  lot,
  lotEvent,
  lotType,
  lotTypeStatusDefinition,
  lotTypeVariant,
  location,
} from "~/server/db/schema";

export type StuckLot = {
  lotId: string;
  code: string;
  lotTypeName: string;
  statusName: string;
  variantName: string | null;
  locationName: string | null;
  daysInStatus: number;
  avgDaysInStatus: number;
};

export type ThroughputChange = {
  lotTypeName: string;
  recentCount: number;
  priorCount: number;
  changePercent: number;
};

export type YieldOutlier = {
  lotId: string;
  code: string;
  lotTypeName: string;
  variantName: string | null;
  quantity: number;
  avgQuantity: number;
};

export type AnomalyReport = {
  stuckLots: StuckLot[];
  throughputChanges: ThroughputChange[];
  yieldOutliers: YieldOutlier[];
  generatedAt: string;
};

export async function detectAnomalies(): Promise<AnomalyReport> {
  const [stuckLots, throughputChanges, yieldOutliers] = await Promise.all([
    detectStuckLots(),
    detectThroughputChanges(),
    detectYieldOutliers(),
  ]);

  return {
    stuckLots,
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

async function detectStuckLots(): Promise<StuckLot[]> {
  const nonTerminalLots = await db
    .select({
      id: lot.id,
      code: lot.code,
      lotTypeId: lot.lotTypeId,
      statusId: lot.statusId,
      variantId: lot.variantId,
      locationId: lot.locationId,
      createdAt: lot.createdAt,
      lotTypeName: lotType.name,
      statusName: lotTypeStatusDefinition.name,
    })
    .from(lot)
    .innerJoin(
      lotTypeStatusDefinition,
      eq(lot.statusId, lotTypeStatusDefinition.id),
    )
    .innerJoin(lotType, eq(lot.lotTypeId, lotType.id))
    .where(
      inArray(lotTypeStatusDefinition.category, ["unstarted", "in_progress"]),
    );

  if (nonTerminalLots.length === 0) return [];

  const lotIds = nonTerminalLots.map((i) => i.id);

  const lastStatusChanges = await db
    .select({
      lotId: lotEvent.lotId,
      lastChange: sql<string>`MAX(${lotEvent.recordedAt})`.as("last_change"),
    })
    .from(lotEvent)
    .where(
      and(
        inArray(lotEvent.lotId, lotIds),
        sql`${lotEvent.eventType} IN ('status_change', 'status_changed')`,
      ),
    )
    .groupBy(lotEvent.lotId);

  const lastChangeMap = new Map(
    lastStatusChanges.map((e) => [e.lotId, new Date(e.lastChange)]),
  );

  const variantIds = [
    ...new Set(
      nonTerminalLots
        .map((i) => i.variantId)
        .filter((id): id is string => id != null),
    ),
  ];
  const locationIds = [
    ...new Set(
      nonTerminalLots
        .map((i) => i.locationId)
        .filter((id): id is string => id != null),
    ),
  ];

  const [variants, locations] = await Promise.all([
    variantIds.length > 0
      ? db
          .select({ id: lotTypeVariant.id, name: lotTypeVariant.name })
          .from(lotTypeVariant)
          .where(inArray(lotTypeVariant.id, variantIds))
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
  const lotsWithDwell = nonTerminalLots.map((i) => {
    const statusEnteredAt = lastChangeMap.get(i.id) ?? i.createdAt;
    const dwellHours = (now - statusEnteredAt.getTime()) / (1000 * 60 * 60);
    return { ...i, dwellHours };
  });

  const groups = new Map<string, typeof lotsWithDwell>();
  for (const i of lotsWithDwell) {
    const key = `${i.lotTypeId}::${i.statusId}`;
    const arr = groups.get(key) ?? [];
    arr.push(i);
    groups.set(key, arr);
  }

  const results: StuckLot[] = [];

  for (const [, group] of groups) {
    if (group.length < 3) continue;

    const dwells = group.map((i) => i.dwellHours);
    const avg = mean(dwells);
    const sd = stddev(dwells, avg);
    const threshold = avg + 2 * (sd > 0 ? sd : avg * 0.5);

    for (const i of group) {
      if (i.dwellHours > threshold) {
        results.push({
          lotId: i.id,
          code: i.code,
          lotTypeName: i.lotTypeName,
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
      .select({ lotTypeId: lot.lotTypeId, total: count() })
      .from(lotEvent)
      .innerJoin(lot, eq(lotEvent.lotId, lot.id))
      .where(
        and(
          gte(lotEvent.recordedAt, sevenDaysAgo),
          sql`${lotEvent.eventType} IN ('status_change', 'status_changed')`,
        ),
      )
      .groupBy(lot.lotTypeId),
    db
      .select({ lotTypeId: lot.lotTypeId, total: count() })
      .from(lotEvent)
      .innerJoin(lot, eq(lotEvent.lotId, lot.id))
      .where(
        and(
          gte(lotEvent.recordedAt, fourteenDaysAgo),
          lt(lotEvent.recordedAt, sevenDaysAgo),
          sql`${lotEvent.eventType} IN ('status_change', 'status_changed')`,
        ),
      )
      .groupBy(lot.lotTypeId),
  ]);

  const allTypeIds = [
    ...new Set([
      ...recentCounts.map((r) => r.lotTypeId),
      ...priorCounts.map((r) => r.lotTypeId),
    ]),
  ];

  if (allTypeIds.length === 0) return [];

  const types = await db
    .select({ id: lotType.id, name: lotType.name })
    .from(lotType)
    .where(inArray(lotType.id, allTypeIds));

  const typeNameMap = new Map(types.map((t) => [t.id, t.name]));
  const recentMap = new Map(recentCounts.map((r) => [r.lotTypeId, r.total]));
  const priorMap = new Map(priorCounts.map((r) => [r.lotTypeId, r.total]));

  const results: ThroughputChange[] = [];

  for (const typeId of allTypeIds) {
    const recent = recentMap.get(typeId) ?? 0;
    const prior = priorMap.get(typeId) ?? 0;

    if (prior === 0) continue;

    const changePercent = ((recent - prior) / prior) * 100;

    if (changePercent < -30) {
      results.push({
        lotTypeName: typeNameMap.get(typeId) ?? "Unknown",
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
  const lotsWithQuantity = await db
    .select({
      id: lot.id,
      code: lot.code,
      lotTypeId: lot.lotTypeId,
      variantId: lot.variantId,
      quantity: lot.quantity,
      lotTypeName: lotType.name,
    })
    .from(lot)
    .innerJoin(lotType, eq(lot.lotTypeId, lotType.id))
    .where(sql`${lot.quantity}::numeric > 0`);

  if (lotsWithQuantity.length === 0) return [];

  const variantIds = [
    ...new Set(
      lotsWithQuantity
        .map((i) => i.variantId)
        .filter((id): id is string => id != null),
    ),
  ];

  const variants =
    variantIds.length > 0
      ? await db
          .select({ id: lotTypeVariant.id, name: lotTypeVariant.name })
          .from(lotTypeVariant)
          .where(inArray(lotTypeVariant.id, variantIds))
      : [];

  const variantMap = new Map(variants.map((v) => [v.id, v.name]));

  const groups = new Map<string, typeof lotsWithQuantity>();
  for (const i of lotsWithQuantity) {
    const key = `${i.lotTypeId}::${i.variantId ?? "none"}`;
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
          lotId: i.id,
          code: i.code,
          lotTypeName: i.lotTypeName,
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
