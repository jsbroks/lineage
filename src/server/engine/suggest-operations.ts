/**
 * Given a set of lots the user has scanned / selected, returns operation
 * types ranked by how well the lots satisfy their input port definitions.
 *
 * Scoring per operation type:
 *
 *   For each INPUT port:
 *     +3  required port fully satisfied (lot type match + status match + qty in range)
 *     +2  required port lot type matches but status doesn't match preconditions
 *     +1  optional port satisfied
 *     -10 required port with zero matching lots (hard penalty)
 *
 *   Bonus:
 *     +2  every required port is satisfied (ready to execute)
 *
 * Operations with score <= 0 are excluded from results.
 */

import { asc, eq, inArray } from "drizzle-orm";
import {
  lot,
  lotTypeStatusDefinition,
  operationType,
  operationTypeInput,
  operationTypeInputLotConfig,
} from "~/server/db/schema";
import type { db as dbInstance } from "~/server/db";

type Db = typeof dbInstance;

type LotSummary = {
  id: string;
  lotTypeId: string;
  statusId: string;
};

export type LotInputMatch = {
  referenceKey: string;
  lotTypeId: string;
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
    name: string;
    description: string | null;
    icon: string | null;
  };
  score: number;
  ready: boolean;
  ports: LotInputMatch[];
};

export async function suggestOperations(
  db: Db,
  lotIds: string[],
): Promise<SuggestedOperation[]> {
  if (lotIds.length === 0) return [];

  const lots = await db
    .select({
      id: lot.id,
      lotTypeId: lot.lotTypeId,
      statusId: lot.statusId,
    })
    .from(lot)
    .where(inArray(lot.id, lotIds));

  if (lots.length === 0) return [];

  const lotsByType = new Map<string, LotSummary[]>();
  for (const l of lots) {
    const arr = lotsByType.get(l.lotTypeId) ?? [];
    arr.push(l);
    lotsByType.set(l.lotTypeId, arr);
  }

  const opTypes = await db
    .select()
    .from(operationType)
    .orderBy(asc(operationType.name));

  const allLotInputs = await db
    .select()
    .from(operationTypeInput)
    .where(eq(operationTypeInput.type, "lots"));

  const allLotConfigs =
    allLotInputs.length > 0
      ? await db
          .select()
          .from(operationTypeInputLotConfig)
          .where(
            inArray(
              operationTypeInputLotConfig.inputId,
              allLotInputs.map((i) => i.id),
            ),
          )
      : [];

  const configByInputId = new Map(allLotConfigs.map((c) => [c.inputId, c]));

  type LotPort = (typeof allLotInputs)[number] & {
    lotTypeId: string;
    minCount: number;
    maxCount: number | null;
    preconditionsStatuses: string[] | null;
  };

  const ports: LotPort[] = allLotInputs
    .map((inp) => {
      const cfg = configByInputId.get(inp.id);
      if (!cfg) return null;
      return {
        ...inp,
        lotTypeId: cfg.lotTypeId,
        minCount: cfg.minCount,
        maxCount: cfg.maxCount,
        preconditionsStatuses: cfg.preconditionsStatuses,
      };
    })
    .filter((p): p is LotPort => p !== null);

  const portsByOpType = new Map<string, LotPort[]>();
  for (const port of ports) {
    const arr = portsByOpType.get(port.operationTypeId) ?? [];
    arr.push(port);
    portsByOpType.set(port.operationTypeId, arr);
  }

  const portLotTypeIds = [...new Set(ports.map((p) => p.lotTypeId))];
  const statusDefsForTypes =
    portLotTypeIds.length > 0
      ? await db
          .select({
            id: lotTypeStatusDefinition.id,
            name: lotTypeStatusDefinition.name,
            lotTypeId: lotTypeStatusDefinition.lotTypeId,
          })
          .from(lotTypeStatusDefinition)
          .where(inArray(lotTypeStatusDefinition.lotTypeId, portLotTypeIds))
      : [];

  const statusNameToId = new Map<string, Map<string, string>>();
  for (const sd of statusDefsForTypes) {
    let inner = statusNameToId.get(sd.lotTypeId);
    if (!inner) {
      inner = new Map();
      statusNameToId.set(sd.lotTypeId, inner);
    }
    inner.set(sd.name, sd.id);
  }

  const results: SuggestedOperation[] = [];

  for (const opType of opTypes) {
    const inputPorts = portsByOpType.get(opType.id) ?? [];
    if (inputPorts.length === 0) continue;

    let score = 0;
    let allRequiredSatisfied = true;
    const portMatches: LotInputMatch[] = [];

    for (const port of inputPorts) {
      const candidates = lotsByType.get(port.lotTypeId) ?? [];
      const qtyMin = port.minCount;
      const qtyMax = port.maxCount;
      const isRequired = qtyMin > 0;

      let statusOk: Set<string> | null = null;
      if (port.preconditionsStatuses && port.preconditionsStatuses.length > 0) {
        const lookup = statusNameToId.get(port.lotTypeId);
        const resolvedIds = port.preconditionsStatuses
          .map((name) => lookup?.get(name))
          .filter((id): id is string => !!id);
        statusOk = resolvedIds.length > 0 ? new Set(resolvedIds) : null;
      }

      const fullyMatched = statusOk
        ? candidates.filter((c) => statusOk.has(c.statusId))
        : candidates;

      const statusMismatch =
        candidates.length > 0 && fullyMatched.length < candidates.length;

      const matched = qtyMax ? fullyMatched.slice(0, qtyMax) : fullyMatched;

      const satisfied = matched.length >= qtyMin && matched.length > 0;

      if (isRequired) {
        if (satisfied) {
          score += 3;
        } else if (candidates.length > 0) {
          score += 2;
          allRequiredSatisfied = false;
        } else {
          score -= 10;
          allRequiredSatisfied = false;
        }
      } else {
        if (satisfied) {
          score += 1;
        }
      }

      portMatches.push({
        referenceKey: port.referenceKey,
        lotTypeId: port.lotTypeId,
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
