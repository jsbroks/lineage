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
  inputLots: schema.OperationInputLot[];
  inputLocations: schema.OperationInputLocation[];
  inputValues: schema.OperationInputValue[];
};

export type LotTypeWithStatusDefinitions = schema.LotType & {
  statusDefinitions: schema.LotTypeStatusDefinition[];
};

export class OperationContext {
  static async create(tx: Tx, operationId: string) {
    const op = await tx.query.operation.findFirst({
      where: eq(schema.operation.id, operationId),
      with: {
        steps: true,
        inputLots: {
          with: { lot: true },
        },
        inputLocations: true,
        inputValues: true,
      },
    });

    if (!op) {
      throw new Error("Operation not found");
    }

    const lots = _.chain(op.inputLots)
      .map((i) => i.lot)
      .compact();

    const lotTypeIds = lots
      .map((i) => i.lotTypeId)
      .uniq()
      .value();
    const lotTypes = await tx.query.lotType.findMany({
      where: inArray(schema.lotType.id, lotTypeIds),
      with: {
        statusDefinitions: true,
      },
    });

    const locationIds = lots
      .map((i) => i.locationId)
      .compact()
      .uniq()
      .value();
    const locations = await tx.query.location.findMany({
      where: inArray(schema.location.id, locationIds),
    });

    const ctx = new OperationContext(op as Operation);

    ctx.lots = _.keyBy(lots.value(), (i) => i.id);
    ctx.lotTypes = _.keyBy(lotTypes, (i) => i.id);
    ctx.locations = _.keyBy(locations, (i) => i.id);

    return ctx;
  }

  lots: Record<string, schema.Lot> = {};
  lotTypes: Record<string, LotTypeWithStatusDefinitions> = {};
  locations: Record<string, schema.Location> = {};

  constructor(readonly operation: Operation) {
    this.operation = operation;
  }

  get(path: string[]): unknown {
    return _.get(this, path);
  }

  lotsFromTarget(ref?: string | null): schema.Lot[] {
    if (ref == null) return [];
    const ids = _.chain(this.operation.inputLots)
      .filter((i) => i.key === ref)
      .map((i) => i.lotId)
      .compact()
      .uniq()
      .value();
    return _.compact(ids.map((id) => this.lots[id]));
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
