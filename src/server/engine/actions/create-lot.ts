import { z } from "zod";
import { ActionResult, createAction } from "./actions";
import { resolvableValueSchema } from "../operation-context";

export const createLot = createAction({
  id: "create-lot",
  name: "Create Lot",
  description: "Create one or more new lots of a given lot type",

  schema: z.object({
    lotTypeId: z.string(),
    count: resolvableValueSchema.optional(),
    attributes: z.record(z.string(), resolvableValueSchema).optional(),
  }),

  handler: (ctx, step) => {
    const { lotTypeId, count: rawCount, attributes: rawAttrs } = step.config;
    const result = new ActionResult();

    const lotType = ctx.lotTypes[lotTypeId];
    if (!lotType) {
      result.skipped = true;
      result.message = `Lot type not found: ${lotTypeId}`;
      return result;
    }

    const initialStatus = lotType.statusDefinitions.find(
      (sd) => sd.category === "unstarted",
    );
    if (!initialStatus) {
      result.skipped = true;
      result.message = `No initial status defined for lot type: ${lotType.name}`;
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

    const prefix = lotType.codePrefix ?? lotType.name.toUpperCase().slice(0, 3);
    const startNum = lotType.codeNextNumber ?? 1;

    for (let i = 0; i < resolvedCount; i++) {
      const code = `${prefix}-${String(startNum + i).padStart(4, "0")}`;
      const now = new Date();

      result.lots.create.push({
        orgId: ctx.operation.orgId,
        lotTypeId,
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
    const plural = total === 1 ? "lot" : "lots";
    result.message = `Created ${total} ${plural} of type ${lotType.name}`;

    return result;
  },
});
