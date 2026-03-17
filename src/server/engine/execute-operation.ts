/**
 * Operation Step Engine
 *
 * Interprets operation type step definitions and executes them
 * transactionally against the database. Each step's full configuration
 * lives in the `value` JSONB column as an object with action-specific
 * keys, plus an optional `condition` key for conditional execution.
 *
 * Supported actions:  (see ./actions/ for implementations)
 *   set_status, set_attribute, set_attributes, increment_attribute,
 *   create_lot, set_lineage / link, record_event
 *
 * Value references inside step config:
 *   { from: "inputs.<key>" }    — resolve from input fields
 *   { from: "<lotKey>.<attr>" } — resolve from a lot's attribute
 *   { ref: "<lotKey>" }         — resolve to lot ID(s) for a key
 *   plain value                 — used as-is
 *
 * Conditions:
 *   { equals: [a, b] }   — equality (values can be refs)
 *   { exists: "<key>" }  — truthy check on a context value
 *   { not: <cond> }      — negation
 *   { all: [<conds>] }   — AND
 *   { any: [<conds>] }   — OR
 */

import { eq, inArray, sql } from "drizzle-orm";
import {
  itemType,
  lot,
  operation,
  operationType,
  operationTypeField,
  operationTypePort,
  operationTypeStep,
} from "~/server/db/schema";
import { registry } from "./actions";
import { evaluateCondition, getStepConfig } from "./context";
import type {
  ExecCtx,
  ExecuteOperationInput,
  ExecuteOperationResult,
  Lot,
  StepResult,
  Tx,
} from "./types";

export type {
  ExecuteOperationInput,
  ExecuteOperationResult,
  StepResult,
} from "./types";

export async function executeOperation(
  tx: Tx,
  input: ExecuteOperationInput,
): Promise<ExecuteOperationResult> {
  // 1. Load operation type definition
  const [opType] = await tx
    .select()
    .from(operationType)
    .where(eq(operationType.id, input.operationTypeId))
    .limit(1);

  if (!opType) {
    throw new Error(`Operation type "${input.operationTypeId}" not found`);
  }

  const ports = await tx
    .select()
    .from(operationTypePort)
    .where(eq(operationTypePort.operationTypeId, opType.id));

  const fields = await tx
    .select()
    .from(operationTypeField)
    .where(eq(operationTypeField.operationTypeId, opType.id));

  const steps = await tx
    .select()
    .from(operationTypeStep)
    .where(eq(operationTypeStep.operationTypeId, opType.id))
    .orderBy(operationTypeStep.sortOrder);

  // 2. Validate required fields
  for (const field of fields) {
    if (field.isRequired && !(field.key in input.fields)) {
      throw new Error(`Required field "${field.key}" is missing`);
    }
  }

  // 3. Validate required input ports & load items
  const loadedLots: Record<string, Lot[]> = {};

  for (const port of ports) {
    if (port.direction !== "input") continue;

    const lotIds = input.lots[port.portRole] ?? [];

    if (port.isRequired && lotIds.length === 0) {
      throw new Error(`Required input "${port.portRole}" is empty`);
    }

    if (port.qtyMin && lotIds.length < Number(port.qtyMin)) {
      throw new Error(
        `"${port.portRole}" requires at least ${port.qtyMin}, got ${lotIds.length}`,
      );
    }

    if (port.qtyMax && lotIds.length > Number(port.qtyMax)) {
      throw new Error(
        `"${port.portRole}" allows at most ${port.qtyMax}, got ${lotIds.length}`,
      );
    }

    if (lotIds.length > 0) {
      const rows = await tx
        .select()
        .from(lot)
        .where(
          lotIds.length === 1
            ? eq(lot.id, lotIds[0]!)
            : sql`${lot.id} = ANY(${lotIds})`,
        );

      if (rows.length !== lotIds.length) {
        const found = new Set(rows.map((r) => r.id));
        const missing = lotIds.filter((id) => !found.has(id));
        throw new Error(
          `"${port.portRole}" references missing items: ${missing.join(", ")}`,
        );
      }

      if (port.preconditionsStatuses && port.preconditionsStatuses.length > 0) {
        const allowed = new Set(port.preconditionsStatuses);
        for (const r of rows) {
          if (!allowed.has(r.status)) {
            throw new Error(
              `${r.lotCode} has status "${r.status}" but "${port.portRole}" requires one of: ${port.preconditionsStatuses.join(", ")}`,
            );
          }
        }
      }

      loadedLots[port.portRole] = rows;
    }
  }

  // 4. Build item type name lookup from loaded lots
  const itemTypeNames = new Map<string, string>();
  const seenItemTypeIds = new Set<string>();
  for (const lots of Object.values(loadedLots)) {
    for (const l of lots) seenItemTypeIds.add(l.itemTypeId);
  }
  if (seenItemTypeIds.size > 0) {
    const ids = [...seenItemTypeIds];
    const itemTypes = await tx
      .select({ id: itemType.id, name: itemType.name })
      .from(itemType)
      .where(
        ids.length === 1 ? eq(itemType.id, ids[0]!) : inArray(itemType.id, ids),
      );
    for (const it of itemTypes) {
      itemTypeNames.set(it.id, it.name);
    }
  }

  // 5. Create the operation record
  const [op] = await tx
    .insert(operation)
    .values({
      operationTypeId: opType.id,
      status: "completed",
      startedAt: new Date(),
      completedAt: new Date(),
      performedBy: input.performedBy,
      locationId: input.locationId,
      notes: input.notes,
      attributes: input.fields,
    })
    .returning();

  if (!op) throw new Error("Failed to create operation record");

  // 6. Build execution context
  const ctx: ExecCtx = {
    lots: loadedLots,
    inputs: input.fields,
    itemTypeNames,
    lotsCreated: [],
    lotsUpdated: new Set(),
    lineageCreated: 0,
    operationId: op.id,
  };

  // 7. Execute steps
  const stepResults: StepResult[] = [];

  for (const step of steps) {
    const { condition, config } = getStepConfig(step);

    if (!evaluateCondition(condition, ctx)) {
      stepResults.push({
        stepName: step.name,
        action: step.action,
        skipped: true,
        success: true,
        detail: "condition not met",
      });
      continue;
    }

    const normalizedAction = step.action
      .replace(/-/g, "_")
      .replace(/\s+/g, "_")
      .toLowerCase();
    const handler = registry.get(normalizedAction);

    if (!handler) {
      stepResults.push({
        stepName: step.name,
        action: step.action,
        skipped: false,
        success: false,
        detail: `unknown action "${step.action}"`,
      });
      continue;
    }

    try {
      const detail = await handler(tx, step, config, ctx);
      stepResults.push({
        stepName: step.name,
        action: step.action,
        skipped: false,
        success: true,
        detail,
      });
    } catch (err) {
      stepResults.push({
        stepName: step.name,
        action: step.action,
        skipped: false,
        success: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    operationId: op.id,
    steps: stepResults,
    lotsCreated: ctx.lotsCreated,
    lotsUpdated: [...ctx.lotsUpdated],
    lineageCreated: ctx.lineageCreated,
  };
}
