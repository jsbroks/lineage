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
 *   create_item, set_lineage / link, record_event
 *
 * Value references inside step config:
 *   { from: "inputs.<key>" }     — resolve from input fields
 *   { from: "<itemKey>.<attr>" } — resolve from an item's attribute
 *   { ref: "<itemKey>" }         — resolve to item ID(s) for a key
 *   plain value                  — used as-is
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
  item,
  operation,
  operationType,
  operationTypeInputField,
  operationTypeInputItem,
  operationTypeStep,
} from "~/server/db/schema";
import { registry } from "./actions";
import { evaluateCondition, getStepConfig } from "./context";
import type {
  ExecCtx,
  ExecuteOperationInput,
  ExecuteOperationResult,
  Item,
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
    .from(operationTypeInputItem)
    .where(eq(operationTypeInputItem.operationTypeId, opType.id));

  const fields = await tx
    .select()
    .from(operationTypeInputField)
    .where(eq(operationTypeInputField.operationTypeId, opType.id));

  const steps = await tx
    .select()
    .from(operationTypeStep)
    .where(eq(operationTypeStep.operationTypeId, opType.id))
    .orderBy(operationTypeStep.sortOrder);

  for (const field of fields) {
    if (field.required && !(field.referenceKey in input.fields)) {
      throw new Error(`Required field "${field.referenceKey}" is missing`);
    }
  }

  const loadedItems: Record<string, Item[]> = {};

  for (const port of ports) {
    const itemIds = input.items[port.referenceKey] ?? [];

    if (port.required && itemIds.length === 0) {
      throw new Error(`Required input "${port.referenceKey}" is empty`);
    }

    if (port.qtyMin && itemIds.length < Number(port.qtyMin)) {
      throw new Error(
        `"${port.referenceKey}" requires at least ${port.qtyMin}, got ${itemIds.length}`,
      );
    }

    if (port.qtyMax && itemIds.length > Number(port.qtyMax)) {
      throw new Error(
        `"${port.referenceKey}" allows at most ${port.qtyMax}, got ${itemIds.length}`,
      );
    }

    if (itemIds.length > 0) {
      const rows = await tx
        .select()
        .from(item)
        .where(
          itemIds.length === 1
            ? eq(item.id, itemIds[0]!)
            : sql`${item.id} = ANY(${itemIds})`,
        );

      if (rows.length !== itemIds.length) {
        const found = new Set(rows.map((r) => r.id));
        const missing = itemIds.filter((id) => !found.has(id));
        throw new Error(
          `"${port.referenceKey}" references missing items: ${missing.join(", ")}`,
        );
      }

      if (port.preconditionsStatuses && port.preconditionsStatuses.length > 0) {
        const allowed = new Set(port.preconditionsStatuses);
        for (const r of rows) {
          if (!allowed.has(r.statusId)) {
            throw new Error(
              `${r.code} has status "${r.statusId}" but "${port.referenceKey}" requires one of: ${port.preconditionsStatuses.join(", ")}`,
            );
          }
        }
      }

      loadedItems[port.referenceKey] = rows;
    }
  }

  const itemTypeNames = new Map<string, string>();
  const seenItemTypeIds = new Set<string>();
  for (const group of Object.values(loadedItems)) {
    for (const l of group) seenItemTypeIds.add(l.itemTypeId);
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

  const ctx: ExecCtx = {
    items: loadedItems,
    inputs: input.fields,
    itemTypeNames,
    itemsCreated: [],
    itemsUpdated: new Set(),
    lineageCreated: 0,
    operationId: op.id,
  };

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
    itemsCreated: ctx.itemsCreated,
    itemsUpdated: [...ctx.itemsUpdated],
    lineageCreated: ctx.lineageCreated,
  };
}
