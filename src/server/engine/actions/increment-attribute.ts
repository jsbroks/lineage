import { eq } from "drizzle-orm";
import { item } from "~/server/db/schema";
import { describeItems, getTargetItems, resolveRef } from "../context";
import type { ActionHandler } from "../types";

export function computeIncrement(
  currentAttrs: Record<string, unknown>,
  attrKey: string,
  by: number,
): Record<string, unknown> {
  const attrs = { ...currentAttrs };
  const current = Number(attrs[attrKey] ?? 0) || 0;
  attrs[attrKey] = current + by;
  return attrs;
}

export const incrementAttribute: ActionHandler = async (
  tx,
  step,
  config,
  ctx,
) => {
  const targetItems = getTargetItems(step.target, ctx);
  if (targetItems.length === 0)
    return step.target
      ? `no "${step.target}" provided`
      : "no target role specified";

  const attrKey = config.attribute as string | undefined;
  const by =
    Number(resolveRef(config.by ?? config.value ?? config._value, ctx)) || 0;

  if (!attrKey) return "no attribute key specified";

  for (const targetItem of targetItems) {
    const attrs = computeIncrement(
      (targetItem.attributes ?? {}) as Record<string, unknown>,
      attrKey,
      by,
    );

    await tx
      .update(item)
      .set({ attributes: attrs, updatedAt: new Date() })
      .where(eq(item.id, targetItem.id));

    (targetItem as Record<string, unknown>).attributes = attrs;
    ctx.itemsUpdated.add(targetItem.id);
  }

  return `incremented ${attrKey} by ${by} on ${describeItems(targetItems, ctx)}`;
};
