import { eq } from "drizzle-orm";
import { lot, lotEvent, lotCodeSequence, itemType } from "~/server/db/schema";
import { resolveRef } from "../context";
import type { ActionHandler, Lot } from "../types";

export const createLot: ActionHandler = async (tx, step, config, ctx) => {
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

  const createdLots: Lot[] = [];

  for (let i = 0; i < count; i++) {
    let lotCode: string;
    const [sequence] = await tx
      .select()
      .from(lotCodeSequence)
      .where(eq(lotCodeSequence.itemTypeId, it.id))
      .limit(1);

    if (sequence) {
      const padded = String(sequence.nextNumber).padStart(5, "0");
      lotCode =
        sequence.variantCode === "_"
          ? `${sequence.prefix}-${padded}`
          : `${sequence.prefix}-${sequence.variantCode}-${padded}`;
      await tx
        .update(lotCodeSequence)
        .set({ nextNumber: sequence.nextNumber + 1 })
        .where(eq(lotCodeSequence.id, sequence.id));
    } else {
      lotCode = `${itemTypeSlug}-${crypto.randomUUID().slice(0, 8)}`;
    }

    const [created] = await tx
      .insert(lot)
      .values({
        itemTypeId: it.id,
        lotCode,
        status: initialStatus,
        uom: it.defaultUom ?? "each",
        attributes: withAttrs ?? {},
      })
      .returning();

    if (created) {
      createdLots.push(created);
      ctx.lotsCreated.push(created.id);

      await tx.insert(lotEvent).values({
        lotId: created.id,
        eventType: "created",
        operationId: ctx.operationId,
        newStatus: initialStatus,
        message: `Created ${it.name} via step: ${step.name}`,
      });
    }
  }

  ctx.lots[alias] = createdLots;
  const label = createdLots.length === 1 ? it.name : `${it.name}s`;
  return `created ${createdLots.length} ${label} as "${alias}"`;
};
