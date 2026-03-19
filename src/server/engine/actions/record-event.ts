import { itemEvent } from "~/server/db/schema";
import { describeItems, getTargetItems, resolveRef } from "../context";
import type { ActionHandler } from "../types";

export const recordEvent: ActionHandler = async (tx, step, config, ctx) => {
  const targetItems = getTargetItems(step.target, ctx);
  if (targetItems.length === 0)
    return step.target
      ? `no "${step.target}" provided`
      : "no target role specified";

  const eventType =
    (config.event_type as string) ?? "operation_event";
  const withData = config.with
    ? (resolveRef(config.with, ctx) as Record<string, unknown>)
    : {};

  for (const targetItem of targetItems) {
    await tx.insert(itemEvent).values({
      itemId: targetItem.id,
      eventType,
      operationId: ctx.operationId,
      message: step.name,
      payload: withData ?? {},
    });
  }

  return `recorded "${eventType}" event on ${describeItems(targetItems, ctx)}`;
};
