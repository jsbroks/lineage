import { eq } from "drizzle-orm";
import { item, itemEvent } from "~/server/db/schema";
import { describeItems, getTargetItems, resolveRef } from "../context";
import type { ActionHandler } from "../types";

export const setStatus: ActionHandler = async (tx, step, config, ctx) => {
  const targetItems = getTargetItems(step.target, ctx);
  if (targetItems.length === 0)
    return step.target
      ? `no "${step.target}" provided`
      : "no target role specified";

  const newStatus = resolveRef(
    config._value ?? config.status ?? step.value,
    ctx,
  );
  if (typeof newStatus !== "string") return "invalid status value";

  for (const targetItem of targetItems) {
    const oldStatus = targetItem.status;
    await tx
      .update(item)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(item.id, targetItem.id));

    await tx.insert(itemEvent).values({
      itemId: targetItem.id,
      eventType: step.eventType ?? "status_change",
      operationId: ctx.operationId,
      oldStatus,
      newStatus,
      message: `${step.name}: ${oldStatus} → ${newStatus}`,
    });

    targetItem.status = newStatus;
    ctx.itemsUpdated.add(targetItem.id);
  }

  return `set status to "${newStatus}" on ${describeItems(targetItems, ctx)}`;
};
