import type { Tx } from "./types";
import _ from "lodash";
import { inArray } from "drizzle-orm";
import * as schema from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const fromRefSchema = z.object({
  from: z.array(z.string()),
});

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const resolvableValueSchema = z.union([literalSchema, fromRefSchema]);
export type ResolvableValue = z.infer<typeof resolvableValueSchema>;

export type Operation = schema.Operation & {
  steps: schema.OperationStep[];
  inputItems: schema.OperationInputItem[];
  inputLocations: schema.OperationInputLocation[];
  inputValues: schema.OperationInputValue[];
};

export type ItemTypeWithStatusDefinitions = schema.ItemType & {
  statusDefinitions: schema.ItemTypeStatusDefinition[];
};

export class OperationContext {
  static async create(tx: Tx, operationId: string) {
    const op = await tx.query.operation.findFirst({
      where: eq(schema.operation.id, operationId),
      with: {
        steps: true,
        inputItems: {
          with: { item: true },
        },
        inputLocations: true,
        inputValues: true,
      },
    });

    if (!op) {
      throw new Error("Operation not found");
    }

    const items = _.chain(op.inputItems)
      .map((i) => i.item)
      .compact();

    const itemTypeIds = items
      .map((i) => i.itemTypeId)
      .uniq()
      .value();
    const itemTypes = await tx.query.itemType.findMany({
      where: inArray(schema.itemType.id, itemTypeIds),
      with: {
        statusDefinitions: true,
      },
    });

    const locationIds = items
      .map((i) => i.locationId)
      .compact()
      .uniq()
      .value();
    const locations = await tx.query.location.findMany({
      where: inArray(schema.location.id, locationIds),
    });

    const ctx = new OperationContext(op as Operation);

    ctx.items = _.keyBy(items.value(), (i) => i.id);
    ctx.itemTypes = _.keyBy(itemTypes, (i) => i.id);
    ctx.locations = _.keyBy(locations, (i) => i.id);

    return ctx;
  }

  items: Record<string, schema.Item> = {};
  itemTypes: Record<string, ItemTypeWithStatusDefinitions> = {};
  locations: Record<string, schema.Location> = {};

  constructor(readonly operation: Operation) {
    this.operation = operation;
  }

  get(path: string[]): unknown {
    return _.get(this, path);
  }

  itemsFromTarget(ref?: string | null): schema.Item[] {
    if (ref == null) return [];
    const ids = _.chain(this.operation.inputItems)
      .filter((i) => i.key === ref)
      .map((i) => i.itemId)
      .compact()
      .uniq()
      .value();
    return _.compact(ids.map((id) => this.items[id]));
  }

  resolveValue(val: ResolvableValue): unknown {
    if (val == null) return val;
    if (typeof val !== "object") return val;
    if ("from" in val) {
      const valueInputs = _.chain(this.operation.inputValues)
        .map((f) => [f.key, f.value])
        .fromPairs()
        .value();
      const locationInputs = _.chain(this.operation.inputLocations)
        .map((l) => [l.key, l.locationId])
        .fromPairs()
        .value();

      const ctx = { inputs: { ...valueInputs, ...locationInputs } };
      return _.get(ctx, val.from);
    }
    return undefined;
  }
}
