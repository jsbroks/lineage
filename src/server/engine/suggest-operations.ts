/**
 * Given a set of items the user has scanned / selected, returns operation
 * types ranked by how well the items satisfy their input port definitions.
 *
 * Scoring per operation type:
 *
 *   For each INPUT port:
 *     +3  required port fully satisfied (item type match + status match + qty in range)
 *     +2  required port item type matches but status doesn't match preconditions
 *     +1  optional port satisfied
 *     -10 required port with zero matching items (hard penalty)
 *
 *   Bonus:
 *     +2  every required port is satisfied (ready to execute)
 *
 * Operations with score <= 0 are excluded from results.
 */

import { asc, eq, inArray } from "drizzle-orm";
import {
  item,
  operationType,
  operationTypeInputItem,
} from "~/server/db/schema";
import type { db as dbInstance } from "~/server/db";

type Db = typeof dbInstance;

type ItemSummary = {
  id: string;
  itemTypeId: string;
  statusId: string;
};

export type PortMatch = {
  referenceKey: string;
  itemTypeId: string;
  required: boolean;
  preconditionsStatuses: string[] | null;
  qtyMin: number;
  qtyMax: number | null;
  matchedItemIds: string[];
  satisfied: boolean;
  statusMismatch: boolean;
};

export type SuggestedOperation = {
  operationType: {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
  };
  score: number;
  ready: boolean;
  ports: PortMatch[];
};

export async function suggestOperations(
  db: Db,
  itemIds: string[],
): Promise<SuggestedOperation[]> {
  if (itemIds.length === 0) return [];

  const items = await db
    .select({
      id: item.id,
      itemTypeId: item.itemTypeId,
      statusId: item.statusId,
    })
    .from(item)
    .where(inArray(item.id, itemIds));

  if (items.length === 0) return [];

  const itemsByType = new Map<string, ItemSummary[]>();
  for (const l of items) {
    const arr = itemsByType.get(l.itemTypeId) ?? [];
    arr.push(l);
    itemsByType.set(l.itemTypeId, arr);
  }

  const opTypes = await db
    .select()
    .from(operationType)
    .orderBy(asc(operationType.name));

  const allPorts = await db
    .select()
    .from(operationTypeInputItem);

  const portsByOpType = new Map<string, typeof allPorts>();
  for (const port of allPorts) {
    const arr = portsByOpType.get(port.operationTypeId) ?? [];
    arr.push(port);
    portsByOpType.set(port.operationTypeId, arr);
  }

  const results: SuggestedOperation[] = [];

  for (const opType of opTypes) {
    const inputPorts = portsByOpType.get(opType.id) ?? [];
    if (inputPorts.length === 0) continue;

    let score = 0;
    let allRequiredSatisfied = true;
    const portMatches: PortMatch[] = [];

    for (const port of inputPorts) {
      const candidates = itemsByType.get(port.itemTypeId) ?? [];
      const qtyMin = Number(port.qtyMin ?? 0);
      const qtyMax = port.qtyMax ? Number(port.qtyMax) : null;

      const statusOk =
        port.preconditionsStatuses && port.preconditionsStatuses.length > 0
          ? new Set(port.preconditionsStatuses)
          : null;

      const fullyMatched = statusOk
        ? candidates.filter((c) => statusOk.has(c.statusId))
        : candidates;

      const statusMismatch =
        candidates.length > 0 && fullyMatched.length < candidates.length;

      const matched = qtyMax ? fullyMatched.slice(0, qtyMax) : fullyMatched;

      const satisfied = matched.length >= qtyMin && matched.length > 0;

      if (port.required) {
        if (satisfied) {
          score += 3;
        } else if (candidates.length > 0) {
          score += 1;
          allRequiredSatisfied = false;
        } else {
          score -= 10;
          allRequiredSatisfied = false;
        }
      } else {
        if (satisfied) score += 1;
      }

      portMatches.push({
        referenceKey: port.referenceKey,
        itemTypeId: port.itemTypeId,
        required: port.required,
        preconditionsStatuses: port.preconditionsStatuses,
        qtyMin,
        qtyMax,
        matchedItemIds: matched.map((l) => l.id),
        satisfied,
        statusMismatch,
      });
    }

    if (allRequiredSatisfied) score += 2;

    if (score <= 0) continue;

    results.push({
      operationType: {
        id: opType.id,
        name: opType.name,
        description: opType.description,
        icon: opType.icon,
      },
      score,
      ready: allRequiredSatisfied,
      ports: portMatches,
    });
  }

  results.sort((a, b) => {
    if (a.ready !== b.ready) return a.ready ? -1 : 1;
    return b.score - a.score;
  });

  return results;
}
