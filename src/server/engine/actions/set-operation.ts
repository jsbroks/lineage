import { z } from "zod";
import { ActionResult, createAction } from "./actions";
import { resolvableValueSchema } from "../operation-context";

export const setOperation = createAction({
  id: "set-operation",
  name: "Set Operation",
  description:
    "Set operation-level metadata such as location, notes, or attributes",

  schema: z.object({
    locationId: resolvableValueSchema.optional(),
    notes: resolvableValueSchema.optional(),
    status: z.string().optional(),
    attributes: z.record(z.string(), resolvableValueSchema).optional(),
  }),

  handler: (ctx, step) => {
    const { locationId, notes, status, attributes } = step.config;
    const result = new ActionResult();
    let changed = false;

    if (locationId != null) {
      const resolved = ctx.resolveValue(locationId);
      if (typeof resolved === "string") {
        result.operationUpdate.locationId = resolved;
        changed = true;
      }
    }

    if (notes != null) {
      const resolved = ctx.resolveValue(notes);
      if (typeof resolved === "string") {
        result.operationUpdate.notes = resolved;
        changed = true;
      }
    }

    if (status != null) {
      result.operationUpdate.status = status;
      changed = true;
    }

    if (attributes) {
      const resolved: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(attributes)) {
        resolved[key] = ctx.resolveValue(val);
      }
      result.operationUpdate.attributes = resolved;
      changed = true;
    }

    if (!changed) {
      result.skipped = true;
      result.message = "No operation metadata to update";
      return result;
    }

    result.message = "Operation metadata updated";
    return result;
  },
});
