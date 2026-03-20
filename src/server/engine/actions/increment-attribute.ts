import { z } from "zod";
import { ActionResult, createAction } from "./actions";
import { resolvableValueSchema } from "../operation-context";

export const incrementAttribute = createAction({
  id: "increment-attribute",
  name: "Increment Attribute",
  description: "Increment a numeric attribute on targeted items",

  schema: z.object({
    attrKey: z.string(),
    amount: resolvableValueSchema.optional(),
  }),

  handler: (ctx, step) => {
    const { attrKey, amount: rawAmount } = step.config;
    const result = new ActionResult();
    const items = ctx.itemsFromTarget(step.target);

    if (items.length === 0) {
      result.skipped = true;
      result.message = `No items found for target: ${step.target}`;
      return result;
    }

    const incrementBy =
      rawAmount != null ? Number(ctx.resolveValue(rawAmount)) : 1;

    if (!Number.isFinite(incrementBy)) {
      result.skipped = true;
      result.message = `Invalid increment amount: ${String(rawAmount)}`;
      return result;
    }

    for (const item of items) {
      const currentAttrs = (item.attributes ?? {}) as Record<string, unknown>;
      const currentValue = Number(currentAttrs[attrKey] ?? 0);
      const newValue = currentValue + incrementBy;

      // Spread existing attributes to prevent data loss on persist
      result.updateItem(item.id, {
        attributes: { ...currentAttrs, [attrKey]: newValue },
      });
    }

    const total = items.length;
    const plural = total === 1 ? "item" : "items";
    result.message = `Incremented ${attrKey} by ${incrementBy} for ${total} ${plural}`;

    return result;
  },
});
