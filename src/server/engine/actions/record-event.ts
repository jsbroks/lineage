import { z } from "zod";
import { ActionResult, createAction } from "./actions";
import { resolvableValueSchema } from "../operation-context";

export const recordEvent = createAction({
  id: "record-event",
  name: "Record Event",
  description: "Record an explicit event entry for targeted items",

  schema: z.object({
    eventType: z.string(),
    message: resolvableValueSchema.optional(),
    payload: z.record(z.string(), resolvableValueSchema).optional(),
  }),

  handler: (ctx, step) => {
    const { eventType, message, payload } = step.config;
    const result = new ActionResult();
    const items = ctx.itemsFromTarget(step.target);

    if (items.length === 0) {
      result.skipped = true;
      result.message = `No items found for target: ${step.target}`;
      return result;
    }

    const resolvedMessage =
      message != null ? String(ctx.resolveValue(message)) : undefined;

    const resolvedPayload: Record<string, unknown> = {};
    if (payload) {
      for (const [key, val] of Object.entries(payload)) {
        resolvedPayload[key] = ctx.resolveValue(val);
      }
    }

    for (const item of items) {
      result.addEvent({
        itemId: item.id,
        eventType,
        message: resolvedMessage,
        payload:
          Object.keys(resolvedPayload).length > 0 ? resolvedPayload : undefined,
      });
    }

    const total = items.length;
    const plural = total === 1 ? "event" : "events";
    result.message = `Recorded ${total} ${plural}`;

    return result;
  },
});
