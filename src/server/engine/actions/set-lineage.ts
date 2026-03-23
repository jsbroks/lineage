import { z } from "zod";
import { ActionResult, createAction } from "./actions";

export const setLineage = createAction({
  id: "set-lineage",
  name: "Set Lineage",
  description: "Record parent-child relationships between lots",

  schema: z.object({
    parent: z.string(),
    children: z.string(),
    relationship: z.string(),
  }),

  handler: (ctx, step) => {
    const { parent, children, relationship } = step.config;
    const result = new ActionResult();

    const parentLots = ctx.lotsFromTarget(parent);
    const childLots = ctx.lotsFromTarget(children);

    if (parentLots.length === 0) {
      result.skipped = true;
      result.message = `No parent lots found for target: ${parent}`;
      return result;
    }

    if (childLots.length === 0) {
      result.skipped = true;
      result.message = `No child lots found for target: ${children}`;
      return result;
    }

    for (const parentLot of parentLots) {
      for (const childLot of childLots) {
        result.lots.link.push({
          parentLotId: parentLot.id,
          childLotId: childLot.id,
          relationship,
        });
      }
    }

    const total = parentLots.length * childLots.length;
    const plural = total === 1 ? "link" : "links";
    result.message = `Created ${total} lineage ${plural}`;

    return result;
  },
});
