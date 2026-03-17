import { lotEvent } from "~/server/db/schema";
import { describeItems, getTargetItems, resolveRef } from "../context";
import type { ActionHandler } from "../types";

export const recordEvent: ActionHandler = async (tx, step, config, ctx) => {
  const targetLots = getTargetItems(step.target, ctx);
  if (targetLots.length === 0)
    return step.target
      ? `no "${step.target}" provided`
      : "no target role specified";

  const eventType =
    (config.event_type as string) ?? step.eventType ?? "operation_event";
  const withData = config.with
    ? (resolveRef(config.with, ctx) as Record<string, unknown>)
    : {};

  for (const targetLot of targetLots) {
    await tx.insert(lotEvent).values({
      lotId: targetLot.id,
      eventType,
      operationId: ctx.operationId,
      message: step.name,
      payload: withData ?? {},
    });
  }

  return `recorded "${eventType}" event on ${describeItems(targetLots, ctx)}`;
};
