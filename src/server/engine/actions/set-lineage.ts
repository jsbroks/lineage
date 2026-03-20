import { z } from "zod";
import { ActionResult, createAction } from "./actions";

export const setLineage = createAction({
  id: "set-lineage",
  name: "Set Lineage",
  description: "Record parent-child relationships between items",

  schema: z.object({
    parent: z.string(),
    children: z.string(),
    relationship: z.string(),
  }),

  handler: (ctx, step) => {
    const { parent, children, relationship } = step.config;
    const result = new ActionResult();

    const parentItems = ctx.itemsFromTarget(parent);
    const childItems = ctx.itemsFromTarget(children);

    if (parentItems.length === 0) {
      result.skipped = true;
      result.message = `No parent items found for target: ${parent}`;
      return result;
    }

    if (childItems.length === 0) {
      result.skipped = true;
      result.message = `No child items found for target: ${children}`;
      return result;
    }

    const now = new Date();
    for (const parentItem of parentItems) {
      for (const childItem of childItems) {
        result.items.link.push({
          parentItemId: parentItem.id,
          childItemId: childItem.id,
          relationship,
          operationId: ctx.operation.id,
          createdAt: now,
        });
      }
    }

    const total = parentItems.length * childItems.length;
    const plural = total === 1 ? "link" : "links";
    result.message = `Created ${total} lineage ${plural}`;

    return result;
  },
});
