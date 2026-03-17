import { eq } from "drizzle-orm";
import { lot } from "~/server/db/schema";
import { describeItems, getTargetItems, resolveRef } from "../context";
import type { ActionHandler } from "../types";

export const incrementAttribute: ActionHandler = async (
  tx,
  step,
  config,
  ctx,
) => {
  const targetLots = getTargetItems(step.target, ctx);
  if (targetLots.length === 0)
    return step.target
      ? `no "${step.target}" provided`
      : "no target role specified";

  const attrKey = config.attribute as string | undefined;
  const by =
    Number(resolveRef(config.by ?? config.value ?? config._value, ctx)) || 0;

  if (!attrKey) return "no attribute key specified";

  for (const targetLot of targetLots) {
    const attrs = {
      ...((targetLot.attributes ?? {}) as Record<string, unknown>),
    };
    const current = Number(attrs[attrKey] ?? 0);
    attrs[attrKey] = current + by;

    await tx
      .update(lot)
      .set({ attributes: attrs, updatedAt: new Date() })
      .where(eq(lot.id, targetLot.id));

    (targetLot as Record<string, unknown>).attributes = attrs;
    ctx.lotsUpdated.add(targetLot.id);
  }

  return `incremented ${attrKey} by ${by} on ${describeItems(targetLots, ctx)}`;
};
