import { itemLineage } from "~/server/db/schema";
import type { ActionHandler } from "../types";

export const setLineage: ActionHandler = async (tx, step, config, ctx) => {
  const withConfig = (config.with ?? config) as Record<string, unknown>;
  const childrenKey = (withConfig.children as string) ?? "";
  const parentKey = ((withConfig.parent ?? withConfig.parents) as string) ?? "";
  const relationship = (withConfig.relationship as string) ?? "linked";

  const childItems = ctx.items[childrenKey] ?? [];
  const parentItems = ctx.items[parentKey] ?? [];

  if (childItems.length === 0 && parentItems.length === 0) {
    return `no "${childrenKey}" or "${parentKey}" provided to link`;
  }
  if (childItems.length === 0) {
    return `no "${childrenKey}" provided to link as children`;
  }
  if (parentItems.length === 0) {
    return `no "${parentKey}" provided to link as parent`;
  }

  let count = 0;

  // 1:1 pairing when "parents" (plural) is used and counts match
  if (withConfig.parents && childItems.length === parentItems.length) {
    for (let i = 0; i < childItems.length; i++) {
      await tx.insert(itemLineage).values({
        parentItemId: parentItems[i]!.id,
        childItemId: childItems[i]!.id,
        relationship,
        operationId: ctx.operationId,
      });
      count++;
    }
  } else {
    for (const parent of parentItems) {
      for (const child of childItems) {
        await tx.insert(itemLineage).values({
          parentItemId: parent.id,
          childItemId: child.id,
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
