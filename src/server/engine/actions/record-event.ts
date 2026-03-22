import { z } from "zod";
import { ActionResult, createAction } from "./actions";
import { resolvableValueSchema } from "../operation-context";

export const recordEvent = createAction({
  id: "record-event",
  name: "Record Event",
  description: "Record an explicit event entry for targeted lots",

  schema: z.object({
    eventType: z.string(),
    message: resolvableValueSchema.optional(),
    payload: z.record(z.string(), resolvableValueSchema).optional(),
  }),

  handler: (ctx, step) => {
    const { eventType, message, payload } = step.config;
    const result = new ActionResult();
    const lots = ctx.lotsFromTarget(step.target);

    if (lots.length === 0) {
      result.skipped = true;
      result.message = `No lots found for target: ${step.target}`;
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

    for (const lot of lots) {
      result.addEvent({
        lotId: lot.id,
        eventType,
        message: resolvedMessage,
        payload:
          Object.keys(resolvedPayload).length > 0 ? resolvedPayload : undefined,
      });
    }

    const total = lots.length;
    const plural = total === 1 ? "event" : "events";
    result.message = `Recorded ${total} ${plural}`;

    return result;
  },
});
