import { eq } from "drizzle-orm";
import { item, itemEvent } from "~/server/db/schema";
import { describeItems, getTargetItems, resolveRef } from "../context";
import type { ActionHandler } from "../types";

export const setStatus: ActionHandler = async (tx, step, config, ctx) => {
  const targetLots = getTargetItems(step.target, ctx);
  if (targetLots.length === 0)
    return step.target
      ? `no "${step.target}" provided`
      : "no target role specified";

  const newStatus = resolveRef(
    config._value ?? config.status ?? step.value,
    ctx,
  );
  if (typeof newStatus !== "string") return "invalid status value";

  for (const targetLot of targetLots) {
    const oldStatus = targetLot.status;
    await tx
      .update(item)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(item.id, targetLot.id));

    await tx.insert(itemEvent).values({
      lotId: targetLot.id,
      eventType: step.eventType ?? "status_change",
      operationId: ctx.operationId,
      oldStatus,
      newStatus,
      message: `${step.name}: ${oldStatus} → ${newStatus}`,
    });

    targetLot.status = newStatus;
    ctx.lotsUpdated.add(targetLot.id);
  }

  return `set status to "${newStatus}" on ${describeItems(targetLots, ctx)}`;
};
