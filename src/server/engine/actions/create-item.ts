import { eq } from "drizzle-orm";
import { item, itemEvent, itemType } from "~/server/db/schema";
import { resolveRef } from "../context";
import type { ActionHandler, Item } from "../types";

export const createItem: ActionHandler = async (tx, step, config, ctx) => {
  const itemTypeSlug = (config.item_type as string) ?? step.itemType;
  if (!itemTypeSlug) return "no item_type specified";

  const [it] = await tx
    .select()
    .from(itemType)
    .where(eq(itemType.slug, itemTypeSlug))
    .limit(1);

  if (!it) return `item type "${itemTypeSlug}" not found`;

  ctx.itemTypeNames.set(it.id, it.name);

  const count = Number(resolveRef(config.count, ctx) ?? 1);
  const alias = (config.as as string) ?? step.target ?? itemTypeSlug;
  const withAttrs = config.with
    ? (resolveRef(config.with, ctx) as Record<string, unknown>)
    : {};
  const initialStatus = (config.status as string) ?? "created";

  const createdItems: Item[] = [];

  for (let i = 0; i < count; i++) {
    const padded = String(it.codeNextNumber).padStart(5, "0");
    const codePrefix = it.codePrefix;
    if (codePrefix == "" || codePrefix == null) {
      throw new Error("no code prefix configured for this item type");
    }

    const code = `${codePrefix}-${padded}`;

    await tx
      .update(itemType)
      .set({ codeNextNumber: it.codeNextNumber + 1 })
      .where(eq(itemType.id, it.id));

    const [created] = await tx
      .insert(item)
      .values({
        itemTypeId: it.id,
        code,
        status: initialStatus,
        quantityUom: it.defaultUom ?? "each",
        attributes: withAttrs ?? {},
      })
      .returning();

    if (created) {
      createdItems.push(created);
      ctx.itemsCreated.push(created.id);

      await tx.insert(itemEvent).values({
        itemId: created.id,
        eventType: "created",
        operationId: ctx.operationId,
        newStatus: initialStatus,
        message: `Created ${it.name} via step: ${step.name}`,
      });
    }
  }

  ctx.items[alias] = createdItems;
  const label = createdItems.length === 1 ? it.name : `${it.name}s`;
  return `created ${createdItems.length} ${label} as "${alias}"`;
};
