import { z } from "zod";
import { ActionResult, createAction } from "./actions";
import _ from "lodash";
import { resolvableValueSchema } from "../operation-context";

export const setLotAttr = createAction({
  id: "set-lot-attr",
  name: "Set Lot Attribute",
  description: "Set the value of a lot attribute",
  schema: z.object({
    attrKey: z.string(),
    value: resolvableValueSchema,
  }),
  handler: (ctx, step) => {
    const { attrKey, value } = step.config;
    const resolvedValue = ctx.resolveValue(value);
    const result = new ActionResult();
    const lots = ctx.lotsFromTarget(step.target);

    if (lots == null || lots.length === 0) {
      result.skipped = true;
      result.message = `No lots found for target: ${step.target}`;
      return result;
    }

    for (const lot of lots) {
      const change = { attributes: { [attrKey]: resolvedValue } };
      result.updateLot(lot.id, change);
    }

    const total = lots.length;
    const plural = total === 1 ? "lot" : "lots";
    result.success = true;
    if (total > 0) {
      result.message = `Set attribute ${attrKey} for ${total} ${plural}`;
    } else {
      result.message = `No lots updated`;
    }

    return result;
  },
});
