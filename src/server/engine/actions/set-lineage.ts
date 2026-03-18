import { itemLineage } from "~/server/db/schema";
import type { ActionHandler } from "../types";

export const setLineage: ActionHandler = async (tx, step, config, ctx) => {
  const withConfig = (config.with ?? config) as Record<string, unknown>;
  const childrenKey = (withConfig.children as string) ?? "";
  const parentKey = ((withConfig.parent ?? withConfig.parents) as string) ?? "";
  const relationship = (withConfig.relationship as string) ?? "linked";

  const childLots = ctx.lots[childrenKey] ?? [];
  const parentLots = ctx.lots[parentKey] ?? [];

  if (childLots.length === 0 && parentLots.length === 0) {
    return `no "${childrenKey}" or "${parentKey}" provided to link`;
  }
  if (childLots.length === 0) {
    return `no "${childrenKey}" provided to link as children`;
  }
  if (parentLots.length === 0) {
    return `no "${parentKey}" provided to link as parent`;
  }

  let count = 0;

  // 1:1 pairing when "parents" (plural) is used and counts match
  if (withConfig.parents && childLots.length === parentLots.length) {
    for (let i = 0; i < childLots.length; i++) {
      await tx.insert(itemLineage).values({
        parentLotId: parentLots[i]!.id,
        childLotId: childLots[i]!.id,
        relationship,
        operationId: ctx.operationId,
      });
      count++;
    }
  } else {
    for (const parent of parentLots) {
      for (const child of childLots) {
        await tx.insert(itemLineage).values({
          parentLotId: parent.id,
          childLotId: child.id,
          relationship,
          operationId: ctx.operationId,
        });
        count++;
      }
    }
  }

  ctx.lineageCreated += count;
  return `created ${count} lineage link(s) (${relationship})`;
};
