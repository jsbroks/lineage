import { z } from "zod";
import { ActionResult, createAction } from "./actions";
import _ from "lodash";
import { resolvableValueSchema } from "../operation-context";

export const setItemAttr = createAction({
  id: "set-item-attr",
  name: "Set Item Attribute",
  description: "Set the value of an item attribute",
  schema: z.object({
    attrKey: z.string(),
    value: resolvableValueSchema,
  }),
  handler: (ctx, step) => {
    const { attrKey, value } = step.config;
    const resolvedValue = ctx.resolveValue(value);
    const result = new ActionResult();
    const items = ctx.itemsFromTarget(step.target);

    if (items == null || items.length === 0) {
      result.skipped = true;
      result.message = `No items found for target: ${step.target}`;
      return result;
    }

    for (const item of items) {
      const change = { attributes: { [attrKey]: resolvedValue } };
      result.updateItem(item.id, change);
    }

    const total = items.length;
    const plural = total === 1 ? "item" : "items";
    result.success = true;
    if (total > 0) {
      result.message = `Set attribute ${attrKey} for ${total} ${plural}`;
    } else {
      result.message = `No items updated`;
    }

    return result;
  },
});
