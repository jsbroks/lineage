import { eq } from "drizzle-orm";
import {
  ActionRegistry,
  ActionResult as ActionResultClass,
} from "./actions/actions";
import { OperationContext } from "./operation-context";
import type {
  Tx,
  ExecuteOperationInput,
  ExecuteOperationResult,
  ActionResult,
} from "./types";
import * as schema from "../db/schema";
import { createOperation, type OperationInputs } from "./operation-create";

const actionsRegistry = new ActionRegistry();

export const executeOperation = async (
  tx: Tx,
  input: ExecuteOperationInput,
): Promise<ExecuteOperationResult> => {
  const operationType = await tx.query.operationType.findFirst({
    where: eq(schema.operationType.id, input.operationTypeId),
  });
  if (!operationType) {
    throw new Error(`Operation type not found: ${input.operationTypeId}`);
  }

  const operation = await createOperation(tx, operationType, {
    items: input.items,
    fields: input.fields,
  });
  if (!operation) {
    throw new Error("Failed to create operation");
  }

  const ctx = await OperationContext.create(tx, operation.id);
  const classResults = execute(ctx);

  const steps: ActionResult[] = ctx.operation.steps.map((step, i) => ({
    action: step.action,
    stepName: step.name,
    skipped: classResults[i]?.skipped ?? false,
    success: classResults[i]?.success ?? false,
    detail: classResults[i]?.message || undefined,
  }));

  return {
    operationId: operation.id,
    steps,
    itemsCreated: classResults.flatMap((r) =>
      r.items.create.map((c) => c.itemTypeId),
    ),
    itemsUpdated: classResults.flatMap((r) => Object.keys(r.items.update)),
    lineageCreated: classResults.reduce(
      (sum, r) => sum + r.items.link.length,
      0,
    ),
  };
};

export const createAndExecute = async (
  tx: Tx,
  operationType: schema.OperationType,
  inputs: OperationInputs,
) => {
  const operation = await createOperation(tx, operationType, inputs);
  if (!operation) {
    return null;
  }

  const ctx = await OperationContext.create(tx, operation.id);
  return execute(ctx);
};

export const execute = (
  ctx: OperationContext,
  actions: ActionRegistry = actionsRegistry,
) => {
  const results: ActionResultClass[] = [];
  for (const step of ctx.operation.steps) {
    const { action } = step;
    const handler = actions.get(action);
    if (!handler) {
      const ar = new ActionResultClass();
      ar.success = false;
      ar.skipped = true;
      ar.message = `Unknown action: ${action}`;
      results.push(ar);
      continue;
    }

    const result = handler(ctx, step);
    results.push(result);
  }
  return results;
};
