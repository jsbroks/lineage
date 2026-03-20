import { ActionResult, createAction } from "./actions";
import { z } from "zod";
import _ from "lodash";

export const setItemStatus = createAction({
  id: "set-item-status",

  name: "Set Item Status",
  description: "Set the status of one or more items",

  schema: z.object({ status: z.string() }),
  handler: (ctx, step) => {
    const { target, config } = step;
    const { status } = config;
    const result = new ActionResult();

    const items = ctx.itemsFromTarget(target);

    if (items == null || items.length === 0) {
      result.skipped = true;
      result.message = `No items found for target: ${target}`;
      return result;
    }

    for (const item of items) {
      const itemType = ctx.itemTypes[item.itemTypeId];
      if (!itemType) {
        result.skipped = true;
        result.message = `Item type not found for item: ${item.id}`;
        return result;
      }

      const statusDefinition = itemType.statusDefinitions.find(
        (sd) => sd.name === status,
      );
      if (!statusDefinition) {
        result.skipped = true;
        result.message = `Status definition not found for item type: ${itemType.id}`;
        return result;
      }

      const change = { statusId: statusDefinition.id };
      result.updateItem(item.id, change);
    }

    const total = items.length;
    const plural = total === 1 ? "item" : "items";
    result.success = true;
    if (total > 0) {
      result.message = `Set status for ${total} ${plural}`;
    } else {
      result.message = `No items updated`;
    }

    return result;
  },
});
