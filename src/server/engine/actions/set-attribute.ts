import { eq } from "drizzle-orm";
import { item } from "~/server/db/schema";
import { describeItems, getTargetItems, resolveRef } from "../context";
import type { ActionHandler } from "../types";

export const setAttribute: ActionHandler = async (tx, step, config, ctx) => {
  const targetItems = getTargetItems(step.target, ctx);
  if (targetItems.length === 0)
    return step.target
      ? `no "${step.target}" provided`
      : "no target role specified";

  const attrKey = config.attribute as string | undefined;
  const attrValue = resolveRef(config.value ?? config._value, ctx);

  if (!attrKey) return "no attribute key specified";

  for (const targetItem of targetItems) {
    const attrs = {
      ...((targetItem.attributes ?? {}) as Record<string, unknown>),
    };
    attrs[attrKey] = attrValue;

    await tx
      .update(item)
      .set({ attributes: attrs, updatedAt: new Date() })
      .where(eq(item.id, targetItem.id));

    (targetItem as Record<string, unknown>).attributes = attrs;
    ctx.itemsUpdated.add(targetItem.id);
  }

  return `set ${attrKey} on ${describeItems(targetItems, ctx)}`;
};
