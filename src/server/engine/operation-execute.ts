import { eq, sql } from "drizzle-orm";
import {
  ActionRegistry,
  ActionResult,
  combineItemOps,
} from "./actions/actions";
import { OperationContext } from "./operation-context";
import type { Tx } from "./types";
import * as schema from "../db/schema";
import { createOperation, type OperationInputs } from "./operation-create";
import { createItem } from "./actions/create-item";
import { setItemAttr } from "./actions/set-item-attr";
import { setItemStatus } from "./actions/set-item-status";
import _ from "lodash";

const actionsRegistry = new ActionRegistry()
  .register(createItem)
  .register(setItemAttr)
  .register(setItemStatus);

export type ExecuteResult = {
  operationId: string;
  steps: {
    stepName: string;
    action: string;
    skipped: boolean;
    success: boolean;
    detail?: string;
  }[];
  itemsCreated: string[];
  itemsUpdated: string[];
  lineageCreated: number;
};

export const createAndExecute = async (
  tx: Tx,
  operationType: schema.OperationType,
  inputs: OperationInputs,
): Promise<ExecuteResult | null> => {
  const operation = await createOperation(tx, operationType, inputs);
  if (!operation) {
    return null;
  }

  const ctx = await OperationContext.create(tx, operation.id);
  const results = execute(ctx);

  const itemOps = combineItemOps(results.map(({ result }) => result));
  const itemsCreated = [];
  const itemsUpdated = Object.keys(itemOps.updates);
  const lineageCreated = itemOps.links.length;

  if (results.length > 0) {
    await tx
      .insert(schema.operationStep)
      .values(
        results.map(({ step, result }) => ({
          id: step.id,
          operationId: step.operationId,
          name: step.name,
          action: step.action,
          target: step.target,
          config: step.config,
          sortOrder: step.sortOrder,
          success: result.success,
          skipped: result.skipped,
          message: result.message,
          details: result.details,
        })),
      )
      .onConflictDoUpdate({
        target: [schema.operationStep.id],
        set: {
          success: sql`excluded.success`,
          skipped: sql`excluded.skipped`,
          message: sql`excluded.message`,
          details: sql`excluded.details`,
        },
      });

    await Promise.all(
      Object.entries(itemOps.updates).map(([id, values]) =>
        tx.update(schema.item).set(values).where(eq(schema.item.id, id)),
      ),
    );

    if (itemOps.creates.length > 0) {
      const created = await tx
        .insert(schema.item)
        .values(itemOps.creates)
        .returning({ id: schema.item.id });
      itemsCreated.push(...created.map((c) => c.id));
    }
    if (itemOps.links.length > 0) {
      const created = await tx
        .insert(schema.itemLineage)
        .values(itemOps.links)
        .returning({ id: schema.itemLineage.id });
    }
  }

  const executeResult: ExecuteResult = {
    operationId: operation.id,
    steps: results.map(({ step, result }) => ({
      stepName: step.name,
      action: step.action,
      skipped: result.skipped,
      success: result.success,
      detail: result.message || undefined,
    })),
    itemsCreated: itemsCreated.length > 0 ? itemsCreated : [],
    itemsUpdated: itemsUpdated.length > 0 ? itemsUpdated : [],
    lineageCreated: lineageCreated > 0 ? lineageCreated : 0,
  };

  return executeResult;
};

export const execute = (
  ctx: OperationContext,
  actions: ActionRegistry = actionsRegistry,
) => {
  const results: { result: ActionResult; step: schema.OperationStep }[] = [];
  for (const step of ctx.operation.steps) {
    const { action } = step;
    const handler = actions.get(action);
    if (!handler) {
      const result = new ActionResult();
      result.success = false;
      result.skipped = true;
      result.message = `Unknown action: ${action}`;
      results.push({ result, step });
      continue;
    }

    const result = handler(ctx, step);
    results.push({ result, step });
  }
  return results;
};
