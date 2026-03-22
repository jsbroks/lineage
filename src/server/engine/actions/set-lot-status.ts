import { ActionResult, createAction } from "./actions";
import { z } from "zod";

export const setLotStatus = createAction({
  id: "set-lot-status",

  name: "Set Lot Status",
  description: "Set the status of one or more lots",

  schema: z.object({ status: z.string() }),
  handler: (ctx, step) => {
    const { target, config } = step;
    const { status } = config;
    const result = new ActionResult();

    const lots = ctx.lotsFromTarget(target);

    if (lots == null || lots.length === 0) {
      result.skipped = true;
      result.message = `No lots found for target: ${target}`;
      return result;
    }

    for (const lot of lots) {
      const lotType = ctx.lotTypes[lot.lotTypeId];
      if (!lotType) {
        result.skipped = true;
        result.message = `Lot type not found for lot: ${lot.id}`;
        return result;
      }

      const statusDefinition = lotType.statusDefinitions.find(
        (sd) => sd.name === status,
      );
      if (!statusDefinition) {
        result.skipped = true;
        result.message = `Status definition not found for lot type: ${lotType.id}`;
        return result;
      }

      const change = { statusId: statusDefinition.id };
      result.updateLot(lot.id, change);
    }

    const total = lots.length;
    const plural = total === 1 ? "lot" : "lots";
    result.success = true;
    if (total > 0) {
      result.message = `Set status for ${total} ${plural}`;
    } else {
      result.message = `No lots updated`;
    }

    return result;
  },
});
