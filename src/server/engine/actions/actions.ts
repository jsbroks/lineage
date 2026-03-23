import type { ZodType } from "zod";
import type { OperationContext } from "../operation-context";
import type { Lot, OperationTypeStep } from "~/server/db/schema";
import _ from "lodash";

type CreateActionOptions<T extends Record<string, unknown>> = {
  id: string;
  name: string;
  description: string;
  schema: ZodType<T>;
  handler: ActionHandler<T>;
};

type Action<T extends Record<string, unknown>> = {
  id: string;
  name: string;
  description: string;
  schema: ZodType<T>;
  handler: ActionHandler<T>;
};

export function createAction<T extends Record<string, unknown>>(
  opts: CreateActionOptions<T>,
): Action<any> {
  const { schema, handler } = opts;
  return {
    ...opts,
    handler: (ctx, step) => {
      const parsed = schema.safeParse(step.config);
      if (!parsed.success) {
        const ar = new ActionResult();
        ar.skipped = true;
        ar.message = `Invalid config: ${parsed.error.message}`;
        ar.details = { issues: parsed.error.issues };
        return ar;
      }

      return handler(ctx, { ...step, config: parsed.data });
    },
  };
}

export type ActionStep<T> = Omit<OperationTypeStep, "operationTypeId"> & {
  config: T;
};

export type ActionHandler<T = any> = (
  ctx: OperationContext,
  step: ActionStep<T>,
) => ActionResult;

export type ActionResultLink = {
  parentLotId: string;
  childLotId: string;
  relationship: string;
};

type ActionResultLots = {
  create: Omit<Lot, "id">[];
  update: Record<string, Partial<Omit<Lot, "id">>>;
  link: ActionResultLink[];
};

export type ActionResultEvent = {
  lotId: string;
  eventType: string;
  message?: string;
  payload?: Record<string, unknown>;
};

export class ActionResult {
  lots: ActionResultLots = { create: [], update: {}, link: [] };
  events: ActionResultEvent[] = [];
  operationUpdate: Record<string, unknown> = {};

  success: boolean = true;
  skipped: boolean = false;
  message: string = "";
  details: Record<string, unknown> = {};

  constructor() {}

  updateLot(lotId: string, changes: Partial<Omit<Lot, "id">>) {
    this.lots.update[lotId] = _.merge(
      this.lots.update[lotId] ?? {},
      _.cloneDeep(changes),
    );
  }

  addEvent(event: ActionResultEvent) {
    this.events.push(event);
  }
}

export const combineLotOps = (results: ActionResult[]) => {
  const creates = results.flatMap((r) => r.lots.create);
  const links = results.flatMap((r) => r.lots.link);
  const events = results.flatMap((r) => r.events);
  const operationUpdate = _.merge({}, ...results.map((r) => r.operationUpdate));
  return {
    updates: _.chain(results)
      .map((r) => r.lots.update)
      .reduce<Record<string, Partial<Omit<Lot, "id">>>>(
        (acc, updates) => _.merge(acc, updates),
        {},
      )
      .value(),
    creates,
    links,
    events,
    operationUpdate,
  };
};

export class ActionRegistry {
  private handlers = new Map<string, Action<any>>();

  register(handler: Action<any>): this {
    this.handlers.set(handler.id, handler);
    return this;
  }

  get(action: string): ActionHandler | undefined {
    return this.handlers.get(action)?.handler;
  }

  get actions(): string[] {
    return [...this.handlers.keys()];
  }
}
