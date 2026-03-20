import { z } from "zod";
import { ActionResult, createAction } from "./actions";
import { resolvableValueSchema } from "../operation-context";

export const createItem = createAction({
  id: "create-item",
  name: "Create Item",
  description: "Create one or more new items of a given item type",

  schema: z.object({
    itemTypeId: z.string(),
    count: resolvableValueSchema.optional(),
    attributes: z.record(z.string(), resolvableValueSchema).optional(),
  }),

  handler: (ctx, step) => {
    const { itemTypeId, count: rawCount, attributes: rawAttrs } = step.config;
    const result = new ActionResult();

    const itemType = ctx.itemTypes[itemTypeId];
    if (!itemType) {
      result.skipped = true;
      result.message = `Item type not found: ${itemTypeId}`;
      return result;
    }

    const initialStatus = itemType.statusDefinitions.find((sd) => sd.isInitial);
    if (!initialStatus) {
      result.skipped = true;
      result.message = `No initial status defined for item type: ${itemType.name}`;
      return result;
    }

    const resolvedCount =
      rawCount != null ? Number(ctx.resolveValue(rawCount)) : 1;
    if (!Number.isFinite(resolvedCount) || resolvedCount < 1) {
      result.skipped = true;
      result.message = `Invalid count: ${String(rawCount)}`;
      return result;
    }

    const attributes: Record<string, unknown> = {};
    if (rawAttrs) {
      for (const [key, val] of Object.entries(rawAttrs)) {
        attributes[key] = ctx.resolveValue(val);
      }
    }

    const prefix =
      itemType.codePrefix ?? itemType.name.toUpperCase().slice(0, 3);
    const startNum = itemType.codeNextNumber ?? 1;

    for (let i = 0; i < resolvedCount; i++) {
      const code = `${prefix}-${String(startNum + i).padStart(4, "0")}`;
      const now = new Date();

      result.items.create.push({
        itemTypeId,
        variantId: null,
        code,
        statusId: initialStatus.id,
        notes: null,
        quantity: "0",
        quantityUnit: null,
        value: 0,
        valueCurrency: null,
        locationId: null,
        attributes,
        createdBy: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    const total = resolvedCount;
    const plural = total === 1 ? "item" : "items";
    result.message = `Created ${total} ${plural} of type ${itemType.name}`;

    return result;
  },
});
