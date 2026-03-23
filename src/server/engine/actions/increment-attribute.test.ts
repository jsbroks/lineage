import { describe, it, expect } from "vitest";
import { incrementAttribute } from "./increment-attribute";
import { ActionResult } from "./actions";
import { OperationContext } from "../operation-context";
import type { Lot, OperationInputValue } from "~/server/db/schema";

function makeLot(overrides: Partial<Lot> = {}): Lot {
  return {
    id: "lot-1",
    orgId: "org-1",
    lotTypeId: "type-1",
    variantId: null,
    code: "BLK-001",
    statusId: "status-1",
    notes: null,
    quantity: "0",
    quantityUnit: null,
    value: 0,
    valueCurrency: null,
    locationId: null,
    attributes: {},
    createdBy: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  } as Lot;
}

type StepInput = {
  target?: string | null;
  config?: unknown;
};

function makeStep({ target = "source", config = {} }: StepInput = {}) {
  return {
    id: "step-1",
    name: "Increment attribute",
    action: "increment-attribute",
    target,
    config,
    sortOrder: 0,
  };
}

type CtxInput = {
  lots?: Record<string, Lot[]>;
  fields?: { key: string; value: unknown }[];
};

function makeCtx({ lots = {}, fields = [] }: CtxInput = {}): OperationContext {
  const allLots: Lot[] = Object.values(lots).flat();

  const operationLots = Object.entries(lots).flatMap(([key, list]) =>
    list.map((lot) => ({
      id: `oi-${lot.id}`,
      key,
      operationId: "op-1",
      lotId: lot.id,
    })),
  );

  const operationValues: OperationInputValue[] = fields.map((f, i) => ({
    id: `field-${i}`,
    key: f.key,
    operationId: "op-1",
    value: f.value,
  }));

  const ctx = new OperationContext({
    id: "op-1",
    orgId: "org-1",
    operationTypeId: "op-type-1",
    status: "completed",
    startedAt: null,
    completedAt: new Date("2025-01-01"),
    performedBy: null,
    locationId: null,
    notes: null,
    attributes: {},
    createdAt: new Date("2025-01-01"),
    steps: [],
    inputLots: operationLots,
    inputLocations: [],
    inputValues: operationValues,
  });

  ctx.lots = Object.fromEntries(allLots.map((i) => [i.id, i]));

  return ctx;
}

describe("incrementAttribute", () => {
  describe("schema validation", () => {
    it("returns skipped when config is empty", () => {
      const result = incrementAttribute.handler(
        makeCtx(),
        makeStep({ config: {} }),
      );
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });

    it("returns skipped when attrKey is not a string", () => {
      const result = incrementAttribute.handler(
        makeCtx(),
        makeStep({ config: { attrKey: 42 } }),
      );
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });
  });

  describe("when no lots match target", () => {
    it("returns skipped", () => {
      const result = incrementAttribute.handler(
        makeCtx(),
        makeStep({ config: { attrKey: "flush_count" } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/No lots found for target/);
    });
  });

  describe("default increment (by 1)", () => {
    it("increments from 0 when attribute does not exist", () => {
      const lot = makeLot({ id: "a", attributes: {} });
      const ctx = makeCtx({ lots: { source: [lot] } });

      const result = incrementAttribute.handler(
        ctx,
        makeStep({ config: { attrKey: "flush_count" } }),
      );

      expect(result.success).toBe(true);
      expect(result.lots.update.a!.attributes).toMatchObject({
        flush_count: 1,
      });
      expect(result.message).toBe("Incremented flush_count by 1 for 1 lot");
    });

    it("increments an existing numeric attribute", () => {
      const lot = makeLot({
        id: "a",
        attributes: { flush_count: 3 },
      });
      const ctx = makeCtx({ lots: { source: [lot] } });

      const result = incrementAttribute.handler(
        ctx,
        makeStep({ config: { attrKey: "flush_count" } }),
      );

      expect(result.lots.update.a!.attributes).toMatchObject({
        flush_count: 4,
      });
    });
  });

  describe("custom increment amount", () => {
    it("increments by a literal amount", () => {
      const lot = makeLot({ id: "a", attributes: { weight: 10 } });
      const ctx = makeCtx({ lots: { source: [lot] } });

      const result = incrementAttribute.handler(
        ctx,
        makeStep({ config: { attrKey: "weight", amount: 5 } }),
      );

      expect(result.lots.update.a!.attributes).toMatchObject({ weight: 15 });
      expect(result.message).toBe("Incremented weight by 5 for 1 lot");
    });

    it("decrements when amount is negative", () => {
      const lot = makeLot({ id: "a", attributes: { stock: 100 } });
      const ctx = makeCtx({ lots: { source: [lot] } });

      const result = incrementAttribute.handler(
        ctx,
        makeStep({ config: { attrKey: "stock", amount: -10 } }),
      );

      expect(result.lots.update.a!.attributes).toMatchObject({ stock: 90 });
    });

    it("resolves amount from an input field reference", () => {
      const lot = makeLot({ id: "a", attributes: { harvest_weight: 0 } });
      const ctx = makeCtx({
        lots: { source: [lot] },
        fields: [{ key: "weight", value: 2.5 }],
      });

      const result = incrementAttribute.handler(
        ctx,
        makeStep({
          config: {
            attrKey: "harvest_weight",
            amount: { from: ["inputs", "weight"] },
          },
        }),
      );

      expect(result.lots.update.a!.attributes).toMatchObject({
        harvest_weight: 2.5,
      });
    });

    it("returns skipped when amount resolves to NaN", () => {
      const lot = makeLot({ id: "a" });
      const ctx = makeCtx({
        lots: { source: [lot] },
        fields: [{ key: "weight", value: "not-a-number" }],
      });

      const result = incrementAttribute.handler(
        ctx,
        makeStep({
          config: {
            attrKey: "harvest_weight",
            amount: { from: ["inputs", "weight"] },
          },
        }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid increment amount/);
    });
  });

  describe("multiple lots", () => {
    it("increments attribute on all target lots", () => {
      const lots = [
        makeLot({ id: "a", attributes: { flush_count: 1 } }),
        makeLot({ id: "b", attributes: { flush_count: 2 } }),
        makeLot({ id: "c", attributes: {} }),
      ];
      const ctx = makeCtx({ lots: { source: lots } });

      const result = incrementAttribute.handler(
        ctx,
        makeStep({ config: { attrKey: "flush_count" } }),
      );

      expect(result.lots.update.a!.attributes).toMatchObject({
        flush_count: 2,
      });
      expect(result.lots.update.b!.attributes).toMatchObject({
        flush_count: 3,
      });
      expect(result.lots.update.c!.attributes).toMatchObject({
        flush_count: 1,
      });
      expect(result.message).toBe("Incremented flush_count by 1 for 3 lots");
    });
  });

  describe("preserves existing attributes", () => {
    it("does not lose other attributes when incrementing", () => {
      const lot = makeLot({
        id: "a",
        attributes: { species: "oyster", flush_count: 2 },
      });
      const ctx = makeCtx({ lots: { source: [lot] } });

      const result = incrementAttribute.handler(
        ctx,
        makeStep({ config: { attrKey: "flush_count" } }),
      );

      const attrs = result.lots.update.a!.attributes as Record<string, unknown>;
      expect(attrs.species).toBe("oyster");
      expect(attrs.flush_count).toBe(3);
    });
  });

  describe("result structure", () => {
    it("returns an ActionResult instance", () => {
      const result = incrementAttribute.handler(
        makeCtx(),
        makeStep({ config: { attrKey: "x" } }),
      );
      expect(result).toBeInstanceOf(ActionResult);
    });

    it("returns empty create and link on success", () => {
      const lot = makeLot({ id: "a" });
      const ctx = makeCtx({ lots: { source: [lot] } });

      const result = incrementAttribute.handler(
        ctx,
        makeStep({ config: { attrKey: "count" } }),
      );

      expect(result.lots.create).toEqual([]);
      expect(result.lots.link).toEqual([]);
    });
  });
});
