import type { ZodType } from "zod";
import type { OperationContext } from "../operation-context";
import type { Item, ItemLineage, OperationTypeStep } from "~/server/db/schema";
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

// export type ActionResult = {
//   items: {
//     create: Item[];
//     update: Record<string, Partial<Omit<Item, "id">>>;
//     link: Omit<ItemLineage, "id">[];
//   };

//   success: boolean;
//   skipped: boolean;

//   message: string;

//   details: object;
// };

type ActionResultItems = {
  create: Omit<Item, "id">[];
  update: Record<string, Partial<Omit<Item, "id">>>;
  link: Omit<ItemLineage, "id">[];
};

export class ActionResult {
  items: ActionResultItems = { create: [], update: {}, link: [] };

  success: boolean = true;
  skipped: boolean = false;
  message: string = "";
  details: Record<string, unknown> = {};

  constructor() {}

  updateItem(itemId: string, changes: Partial<Omit<Item, "id">>) {
    this.items.update[itemId] = _.merge(
      this.items.update[itemId] ?? {},
      _.cloneDeep(changes),
    );
  }
}

export const combineItemOps = (results: ActionResult[]) => {
  const creates = results.flatMap((r) => r.items.create);
  const links = results.flatMap((r) => r.items.link);
  return {
    updates: _.chain(results)
      .map((r) => r.items.update)
      .reduce<Record<string, Partial<Omit<Item, "id">>>>(
        (acc, updates) => _.merge(acc, updates),
        {},
      )
      .value(),
    creates,
    links,
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
