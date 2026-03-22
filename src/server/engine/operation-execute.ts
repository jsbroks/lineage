import { eq, sql } from "drizzle-orm";
import { ActionRegistry, ActionResult, combineLotOps } from "./actions/actions";
import { OperationContext } from "./operation-context";
import type { Tx } from "./types";
import * as schema from "../db/schema";
import { createOperation, type OperationInputs } from "./operation-create";
import { createLot } from "./actions/create-lot";
import { incrementAttribute } from "./actions/increment-attribute";
import { recordEvent } from "./actions/record-event";
import { setLotAttr } from "./actions/set-lot-attr";
import { setLotStatus } from "./actions/set-lot-status";
import { setLineage } from "./actions/set-lineage";
import { setOperation } from "./actions/set-operation";
import _ from "lodash";

const actionsRegistry = new ActionRegistry()
  .register(createLot)
  .register(incrementAttribute)
  .register(recordEvent)
  .register(setLotAttr)
  .register(setLotStatus)
  .register(setLineage)
  .register(setOperation);

export type ExecuteResult = {
  operationId: string;
  steps: {
    stepName: string;
    action: string;
    skipped: boolean;
    success: boolean;
    detail?: string;
  }[];
  lotsCreated: string[];
  lotsUpdated: string[];
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

  const lotOps = combineLotOps(results.map(({ result }) => result));
  const lotsCreated = [];
  const lotsUpdated = Object.keys(lotOps.updates);
  const lineageCreated = lotOps.links.length;

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

    const now = new Date();
    const events: {
      lotId: string;
      eventType: string;
      operationId: string;
      oldStatus?: string | null;
      newStatus?: string | null;
      payload?: Record<string, unknown>;
      message?: string;
    }[] = [];

    await Promise.all(
      Object.entries(lotOps.updates).map(([id, values]) => {
        const original = ctx.lots[id];
        if (
          original &&
          values.statusId &&
          values.statusId !== original.statusId
        ) {
          events.push({
            lotId: id,
            eventType: "status_change",
            operationId: operation.id,
            oldStatus: original.statusId,
            newStatus: values.statusId,
            message: "Status changed via operation",
          });
        }
        if (original && values.attributes) {
          events.push({
            lotId: id,
            eventType: "attribute_change",
            operationId: operation.id,
            payload: values.attributes as Record<string, unknown>,
            message: "Attributes updated via operation",
          });
        }
        return tx
          .update(schema.lot)
          .set({ ...values, updatedAt: now })
          .where(eq(schema.lot.id, id));
      }),
    );

    if (lotOps.creates.length > 0) {
      const created = await tx
        .insert(schema.lot)
        .values(lotOps.creates)
        .returning({ id: schema.lot.id });
      lotsCreated.push(...created.map((c) => c.id));
    }
    if (lotOps.links.length > 0) {
      await tx.insert(schema.lotLineage).values(lotOps.links);
    }

    for (const evt of lotOps.events) {
      events.push({
        lotId: evt.lotId,
        eventType: evt.eventType,
        operationId: operation.id,
        message: evt.message,
        payload: evt.payload,
      });
    }

    if (events.length > 0) {
      await tx.insert(schema.lotEvent).values(events);
    }

    if (Object.keys(lotOps.operationUpdate).length > 0) {
      await tx
        .update(schema.operation)
        .set(lotOps.operationUpdate)
        .where(eq(schema.operation.id, operation.id));
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
    lotsCreated: lotsCreated.length > 0 ? lotsCreated : [],
    lotsUpdated: lotsUpdated.length > 0 ? lotsUpdated : [],
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
