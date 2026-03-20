import { ActionRegistry, type ActionResult } from "./actions/actions";
import { OperationContext } from "./operation-context";
import type { Tx } from "./types";
import * as schema from "../db/schema";
import { createOperation, type OperationInputs } from "./operation-create";

const actionsRegistry = new ActionRegistry();

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
  const results: ActionResult[] = [];
  for (const step of ctx.operation.steps) {
    const { action } = step;
    const handler = actions.get(action);
    if (!handler) {
      results.push({
        items: { create: [], update: {}, link: [] },
        success: false,
        skipped: true,
        message: `Unknown action: ${action}`,
        details: {},
      });
      continue;
    }

    const result = handler(ctx, step);
    results.push(result);
  }
  return results;
};
