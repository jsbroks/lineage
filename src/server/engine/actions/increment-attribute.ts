import { z } from "zod";
import { ActionResult, createAction } from "./actions";
import { resolvableValueSchema } from "../operation-context";

export const incrementAttribute = createAction({
  id: "increment-attribute",
  name: "Increment Attribute",
  description: "Increment a numeric attribute on targeted lots",

  schema: z.object({
    attrKey: z.string(),
    amount: resolvableValueSchema.optional(),
  }),

  handler: (ctx, step) => {
    const { attrKey, amount: rawAmount } = step.config;
    const result = new ActionResult();
    const lots = ctx.lotsFromTarget(step.target);

    if (lots.length === 0) {
      result.skipped = true;
      result.message = `No lots found for target: ${step.target}`;
      return result;
    }

    const incrementBy =
      rawAmount != null ? Number(ctx.resolveValue(rawAmount)) : 1;

    if (!Number.isFinite(incrementBy)) {
      result.skipped = true;
      result.message = `Invalid increment amount: ${String(rawAmount)}`;
      return result;
    }

    for (const lot of lots) {
      const currentAttrs = (lot.attributes ?? {}) as Record<string, unknown>;
      const currentValue = Number(currentAttrs[attrKey] ?? 0);
      const newValue = currentValue + incrementBy;

      result.updateLot(lot.id, {
        attributes: { ...currentAttrs, [attrKey]: newValue },
      });
    }

    const total = lots.length;
    const plural = total === 1 ? "lot" : "lots";
    result.message = `Incremented ${attrKey} by ${incrementBy} for ${total} ${plural}`;

    return result;
  },
});
