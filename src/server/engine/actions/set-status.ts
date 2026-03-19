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
    const oldStatus = targetItem.statusId;
    await tx
      .update(item)
      .set({ statusId: newStatus, updatedAt: new Date() })
      .where(eq(item.id, targetItem.id));

    const eventType = (config.event_type as string) ?? "status_change";

    await tx.insert(itemEvent).values({
      itemId: targetItem.id,
      eventType,
      operationId: ctx.operationId,
      oldStatus,
      newStatus,
      message: `${step.name}: ${oldStatus} → ${newStatus}`,
    });

    targetItem.statusId = newStatus;
    ctx.itemsUpdated.add(targetItem.id);
  }

  return `set status to "${newStatus}" on ${describeItems(targetItems, ctx)}`;
};
