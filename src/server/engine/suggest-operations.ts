/**
 * Given a set of lots the user has scanned / selected, returns operation
 * types ranked by how well the lots satisfy their input port definitions.
 *
 * Scoring per operation type:
 *
 *   For each INPUT port:
 *     +3  required port fully satisfied (item type match + status match + qty in range)
 *     +2  required port item type matches but status doesn't match preconditions
 *     +1  optional port satisfied
 *     -10 required port with zero matching lots (hard penalty)
 *
 *   Bonus:
 *     +2  every required port is satisfied (ready to execute)
 *
 * Operations with score <= 0 are excluded from results.
 */

import { asc, eq, inArray } from "drizzle-orm";
import { item, operationType, operationTypePort } from "~/server/db/schema";
import type { db as dbInstance } from "~/server/db";

type Db = typeof dbInstance;

type LotSummary = {
  id: string;
  itemTypeId: string;
  status: string;
};

export type PortMatch = {
  portRole: string;
  direction: "input" | "output";
  itemTypeId: string;
  isRequired: boolean;
  preconditionsStatuses: string[] | null;
  qtyMin: number;
  qtyMax: number | null;
  matchedLotIds: string[];
  satisfied: boolean;
  statusMismatch: boolean;
};

export type SuggestedOperation = {
  operationType: {
    id: string;
    slug: string;
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
  lotIds: string[],
): Promise<SuggestedOperation[]> {
  if (lotIds.length === 0) return [];

  // 1. Load the scanned lots
  const lots = await db
    .select({
      id: item.id,
      itemTypeId: item.itemTypeId,
      status: item.status,
    })
    .from(item)
    .where(inArray(item.id, lotIds));

  if (lots.length === 0) return [];

  // Index lots by item type for fast lookup
  const lotsByItemType = new Map<string, LotSummary[]>();
  for (const l of lots) {
    const arr = lotsByItemType.get(l.itemTypeId) ?? [];
    arr.push(l);
    lotsByItemType.set(l.itemTypeId, arr);
  }

  // 2. Load all operation types + their input ports
  const opTypes = await db
    .select()
    .from(operationType)
    .orderBy(asc(operationType.name));

  const allPorts = await db
    .select()
    .from(operationTypePort)
    .where(eq(operationTypePort.direction, "input"));

  const portsByOpType = new Map<string, typeof allPorts>();
  for (const port of allPorts) {
    const arr = portsByOpType.get(port.operationTypeId) ?? [];
    arr.push(port);
    portsByOpType.set(port.operationTypeId, arr);
  }

  // 3. Score each operation type
  const results: SuggestedOperation[] = [];

  for (const opType of opTypes) {
    const inputPorts = portsByOpType.get(opType.id) ?? [];
    if (inputPorts.length === 0) continue;

    let score = 0;
    let allRequiredSatisfied = true;
    const portMatches: PortMatch[] = [];

    for (const port of inputPorts) {
      const candidates = lotsByItemType.get(port.itemTypeId) ?? [];
      const qtyMin = Number(port.qtyMin ?? 0);
      const qtyMax = port.qtyMax ? Number(port.qtyMax) : null;

      // Filter by precondition statuses
      const statusOk =
        port.preconditionsStatuses && port.preconditionsStatuses.length > 0
          ? new Set(port.preconditionsStatuses)
          : null;

      const fullyMatched = statusOk
        ? candidates.filter((c) => statusOk.has(c.status))
        : candidates;

      const statusMismatch =
        candidates.length > 0 && fullyMatched.length < candidates.length;

      // Apply qty constraints to select which lots actually fill this port
      const matched = qtyMax ? fullyMatched.slice(0, qtyMax) : fullyMatched;

      const satisfied = matched.length >= qtyMin && matched.length > 0;

      if (port.isRequired) {
        if (satisfied) {
          score += 3;
        } else if (candidates.length > 0) {
          // Item type matches but status preconditions don't
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
        portRole: port.portRole,
        direction: port.direction as "input" | "output",
        itemTypeId: port.itemTypeId,
        isRequired: port.isRequired,
        preconditionsStatuses: port.preconditionsStatuses,
        qtyMin,
        qtyMax,
        matchedLotIds: matched.map((l) => l.id),
        satisfied,
        statusMismatch,
      });
    }

    if (allRequiredSatisfied) score += 2;

    if (score <= 0) continue;

    results.push({
      operationType: {
        id: opType.id,
        slug: opType.slug,
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
    // Ready operations first, then by score descending
    if (a.ready !== b.ready) return a.ready ? -1 : 1;
    return b.score - a.score;
  });

  return results;
}
