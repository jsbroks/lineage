/**
 * Operation Step Engine
 */

import { eq, inArray, sql } from "drizzle-orm";
import {
  itemType,
  itemTypeStatusDefinition,
  item,
  operation,
  operationType as operationTypeTable,
  operationTypeInputField,
  operationTypeInputItem,
  operationTypeStep,
  type OperationType,
  type OperationTypeInputItem,
  type OperationTypeInputField,
  type OperationTypeStep,
} from "~/server/db/schema";
import { registry } from "./actions";
import { evaluateCondition, getStepConfig } from "./context";
import type {
  ActionRegistry,
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

// ── Context ──────────────────────────────────────────────────────────

type InputItemDef = OperationTypeInputItem & {
  allowedStatusIds: Set<string> | null;
};

export type OperationContext = {
  operationType: OperationType;
  inputItemDefs: InputItemDef[];
  inputFieldDefs: OperationTypeInputField[];
  steps: OperationTypeStep[];
  items: Record<string, Item[]>;
  fields: Record<string, unknown>;
  /** statusId → display name (for human-readable error messages) */
  statusNames: Map<string, string>;
  /** itemTypeId → display name */
  itemTypeNames: Map<string, string>;
};

// ── Validation (pure, no DB) ─────────────────────────────────────────

function validateRequiredFields(ctx: OperationContext): void {
  const missing = ctx.inputFieldDefs
    .filter((f) => f.required && !(f.referenceKey in ctx.fields))
    .map((f) => f.referenceKey);

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }
}

function validateItemMinQuantities(ctx: OperationContext): void {
  for (const def of ctx.inputItemDefs) {
    const items = ctx.items[def.referenceKey] ?? [];
    const qtyMin = Number(def.qtyMin ?? 0);
    if (qtyMin > 0 && items.length < qtyMin) {
      throw new Error(
        `"${def.referenceKey}" requires at least ${qtyMin}, got ${items.length}`,
      );
    }
  }
}

function validateItemMaxQuantities(ctx: OperationContext): void {
  for (const def of ctx.inputItemDefs) {
    const items = ctx.items[def.referenceKey] ?? [];
    const qtyMax = def.qtyMax ? Number(def.qtyMax) : null;
    if (qtyMax !== null && items.length > qtyMax) {
      throw new Error(
        `"${def.referenceKey}" allows at most ${qtyMax}, got ${items.length}`,
      );
    }
  }
}

function validateItemPreconditions(ctx: OperationContext): void {
  for (const def of ctx.inputItemDefs) {
    if (!def.allowedStatusIds) continue;
    const items = ctx.items[def.referenceKey] ?? [];
    for (const it of items) {
      if (!def.allowedStatusIds.has(it.statusId)) {
        const currentName = ctx.statusNames.get(it.statusId) ?? it.statusId;
        const allowedNames = def.preconditionsStatuses?.join(", ") ?? "";
        throw new Error(
          `${it.code} has status "${currentName}" but "${def.referenceKey}" requires one of: ${allowedNames}`,
        );
      }
    }
  }
}

/**
 * Pure validation — no database access. Throws on the first violation.
 * Safe to call in unit tests with a hand-built OperationContext.
 */
export function execute(ctx: OperationContext): void {
  validateRequiredFields(ctx);
  validateItemMinQuantities(ctx);
  validateItemMaxQuantities(ctx);
  validateItemPreconditions(ctx);
}

// ── Build context (DB) ───────────────────────────────────────────────

async function fetchOperationType(tx: Tx, id: string): Promise<OperationType> {
  const [opType] = await tx
    .select()
    .from(operationTypeTable)
    .where(eq(operationTypeTable.id, id))
    .limit(1);

  if (!opType) throw new Error(`Operation type "${id}" not found`);
  return opType;
}

async function fetchDefinitions(tx: Tx, operationTypeId: string) {
  const [rawItemDefs, inputFieldDefs, steps] = await Promise.all([
    tx
      .select()
      .from(operationTypeInputItem)
      .where(eq(operationTypeInputItem.operationTypeId, operationTypeId)),
    tx
      .select()
      .from(operationTypeInputField)
      .where(eq(operationTypeInputField.operationTypeId, operationTypeId)),
    tx
      .select()
      .from(operationTypeStep)
      .where(eq(operationTypeStep.operationTypeId, operationTypeId))
      .orderBy(operationTypeStep.sortOrder),
  ]);
  return { rawItemDefs, inputFieldDefs, steps };
}

async function resolveStatusPreconditions(
  tx: Tx,
  rawItemDefs: OperationTypeInputItem[],
) {
  const statusNames = new Map<string, string>();
  const statusNameToId = new Map<string, Map<string, string>>();

  const precondItemTypeIds = [
    ...new Set(
      rawItemDefs
        .filter((d) => d.preconditionsStatuses?.length)
        .map((d) => d.itemTypeId),
    ),
  ];

  if (precondItemTypeIds.length > 0) {
    const defs = await tx
      .select({
        id: itemTypeStatusDefinition.id,
        name: itemTypeStatusDefinition.name,
        itemTypeId: itemTypeStatusDefinition.itemTypeId,
      })
      .from(itemTypeStatusDefinition)
      .where(inArray(itemTypeStatusDefinition.itemTypeId, precondItemTypeIds));

    for (const sd of defs) {
      statusNames.set(sd.id, sd.name);
      let inner = statusNameToId.get(sd.itemTypeId);
      if (!inner) {
        inner = new Map();
        statusNameToId.set(sd.itemTypeId, inner);
      }
      inner.set(sd.name, sd.id);
    }
  }

  const inputItemDefs: InputItemDef[] = rawItemDefs.map((def) => {
    let allowedStatusIds: Set<string> | null = null;
    if (def.preconditionsStatuses?.length) {
      const lookup = statusNameToId.get(def.itemTypeId);
      if (lookup) {
        const ids = def.preconditionsStatuses
          .map((n) => lookup.get(n))
          .filter((id): id is string => !!id);
        if (ids.length > 0) allowedStatusIds = new Set(ids);
      }
    }
    return { ...def, allowedStatusIds };
  });

  return { statusNames, inputItemDefs };
}

async function fetchInputItems(
  tx: Tx,
  defs: InputItemDef[],
  portItems: Record<string, string[]>,
): Promise<Record<string, Item[]>> {
  const loaded: Record<string, Item[]> = {};

  for (const def of defs) {
    const itemIds = portItems[def.referenceKey] ?? [];
    if (itemIds.length === 0) continue;

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
        `"${def.referenceKey}" references missing items: ${missing.join(", ")}`,
      );
    }

    loaded[def.referenceKey] = rows;
  }

  return loaded;
}

async function fetchItemTypeNames(
  tx: Tx,
  loadedItems: Record<string, Item[]>,
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const seenTypeIds = new Set<string>();
  for (const group of Object.values(loadedItems)) {
    for (const it of group) seenTypeIds.add(it.itemTypeId);
  }

  if (seenTypeIds.size > 0) {
    const ids = [...seenTypeIds];
    const types = await tx
      .select({ id: itemType.id, name: itemType.name })
      .from(itemType)
      .where(
        ids.length === 1 ? eq(itemType.id, ids[0]!) : inArray(itemType.id, ids),
      );
    for (const t of types) names.set(t.id, t.name);
  }

  return names;
}

export async function buildContext(
  tx: Tx,
  input: ExecuteOperationInput,
): Promise<OperationContext> {
  const opType = await fetchOperationType(tx, input.operationTypeId);

  const { rawItemDefs, inputFieldDefs, steps } = await fetchDefinitions(
    tx,
    opType.id,
  );

  const { statusNames, inputItemDefs } = await resolveStatusPreconditions(
    tx,
    rawItemDefs,
  );

  const items = await fetchInputItems(tx, inputItemDefs, input.items);
  const itemTypeNames = await fetchItemTypeNames(tx, items);

  return {
    operationType: opType,
    inputItemDefs,
    inputFieldDefs,
    steps,
    items,
    fields: input.fields,
    statusNames,
    itemTypeNames,
  };
}

// ── Step execution ───────────────────────────────────────────────────

export async function executeSteps(
  tx: Tx,
  actionsRegistry: ActionRegistry,
  steps: OperationTypeStep[],
  execCtx: ExecCtx,
): Promise<StepResult[]> {
  const results: StepResult[] = [];

  for (const step of steps) {
    const { condition, config } = getStepConfig(step);

    if (!evaluateCondition(condition, execCtx)) {
      results.push({
        stepName: step.name,
        action: step.action,
        skipped: true,
        success: true,
        detail: "condition not met",
      });
      continue;
    }

    const handler = actionsRegistry.get(step.action);
    if (!handler) {
      results.push({
        stepName: step.name,
        action: step.action,
        skipped: false,
        success: false,
        detail: `unknown action "${step.action}"`,
      });
      continue;
    }

    try {
      const detail = await handler(tx, step, config, execCtx);
      results.push({
        stepName: step.name,
        action: step.action,
        skipped: false,
        success: true,
        detail,
      });
    } catch (err) {
      results.push({
        stepName: step.name,
        action: step.action,
        skipped: false,
        success: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

// ── Full execution (DB) ──────────────────────────────────────────────

export async function executeOperation(
  tx: Tx,
  input: ExecuteOperationInput,
  actionsRegistry: ActionRegistry = registry,
): Promise<ExecuteOperationResult> {
  const ctx = await buildContext(tx, input);
  execute(ctx);

  const [op] = await tx
    .insert(operation)
    .values({
      operationTypeId: ctx.operationType.id,
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

  const execCtx: ExecCtx = {
    items: ctx.items,
    inputs: ctx.fields,
    itemTypeNames: ctx.itemTypeNames,
    itemsCreated: [],
    itemsUpdated: new Set(),
    lineageCreated: 0,
    operationId: op.id,
  };

  const stepResults = await executeSteps(tx, actionsRegistry, ctx.steps, execCtx);

  return {
    operationId: op.id,
    steps: stepResults,
    itemsCreated: execCtx.itemsCreated,
    itemsUpdated: [...execCtx.itemsUpdated],
    lineageCreated: execCtx.lineageCreated,
  };
}
