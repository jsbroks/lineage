import { describe, it, expect } from "vitest";
import { OperationContext, type Operation } from "./operation-context";
import type {
  Lot,
  OperationInputValue,
  OperationInputLot,
} from "~/server/db/schema";

function makeLot(overrides: Partial<Lot> = {}): Lot {
  return {
    id: "lot-1",
    lotTypeId: "type-1",
    variantId: null,
    code: "BLK-0001",
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
  };
}

function makeOperation(overrides: Partial<Operation> = {}): Operation {
  return {
    id: "op-1",
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
    inputLots: [],
    inputLocations: [],
    inputValues: [],
    ...overrides,
  };
}

function makeCtx({
  lots = {},
  fields = [],
  operationLots,
}: {
  lots?: Record<string, Lot[]>;
  fields?: { key: string; value: unknown }[];
  operationLots?: OperationInputLot[];
} = {}): OperationContext {
  const allLots: Lot[] = Object.values(lots).flat();

  const opLots: OperationInputLot[] =
    operationLots ??
    Object.entries(lots).flatMap(([key, list]) =>
      list.map((lot) => ({
        id: `oi-${lot.id}`,
        key,
        operationId: "op-1",
        lotId: lot.id,
      })),
    );

  const opValues: OperationInputValue[] = fields.map((f, i) => ({
    id: `field-${i}`,
    key: f.key,
    operationId: "op-1",
    value: f.value,
  }));

  const ctx = new OperationContext(
    makeOperation({
      inputValues: opValues,
      inputLots: opLots,
      inputLocations: [],
    }),
  );
  ctx.lots = Object.fromEntries(allLots.map((i) => [i.id, i]));

  return ctx;
}

describe("OperationContext", () => {
  describe("get", () => {
    it("retrieves a top-level property", () => {
      const ctx = makeCtx();
      expect(ctx.get(["operation", "id"])).toBe("op-1");
    });

    it("retrieves nested operation data", () => {
      const ctx = makeCtx();
      expect(ctx.get(["operation", "status"])).toBe("completed");
    });

    it("retrieves a lot by id from the lots record", () => {
      const lot = makeLot({ id: "lot-abc" });
      const ctx = makeCtx({ lots: { target: [lot] } });
      expect(ctx.get(["lots", "lot-abc", "code"])).toBe("BLK-0001");
    });

    it("returns undefined for a non-existent path", () => {
      const ctx = makeCtx();
      expect(ctx.get(["does", "not", "exist"])).toBeUndefined();
    });
  });

  describe("lotsFromTarget", () => {
    it("returns an empty array when ref is null", () => {
      const ctx = makeCtx();
      expect(ctx.lotsFromTarget(null)).toEqual([]);
    });

    it("returns an empty array when ref is undefined", () => {
      const ctx = makeCtx();
      expect(ctx.lotsFromTarget(undefined)).toEqual([]);
    });

    it("returns an empty array when no lots match the ref", () => {
      const ctx = makeCtx({
        lots: { source: [makeLot({ id: "lot-1" })] },
      });
      expect(ctx.lotsFromTarget("target")).toEqual([]);
    });

    it("returns matching lots for a given ref key", () => {
      const lot = makeLot({ id: "lot-1" });
      const ctx = makeCtx({ lots: { target: [lot] } });

      const result = ctx.lotsFromTarget("target");
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("lot-1");
    });

    it("returns multiple lots for the same ref key", () => {
      const lot1 = makeLot({ id: "lot-1", code: "BLK-0001" });
      const lot2 = makeLot({ id: "lot-2", code: "BLK-0002" });
      const ctx = makeCtx({ lots: { target: [lot1, lot2] } });

      const result = ctx.lotsFromTarget("target");
      expect(result).toHaveLength(2);
      expect(result.map((i) => i.id)).toEqual(["lot-1", "lot-2"]);
    });

    it("deduplicates lots with the same lotId", () => {
      const lot = makeLot({ id: "lot-1" });
      const ctx = makeCtx({
        lots: { target: [lot] },
        operationLots: [
          { id: "oi-1", key: "target", operationId: "op-1", lotId: "lot-1" },
          { id: "oi-2", key: "target", operationId: "op-1", lotId: "lot-1" },
        ],
      });

      const result = ctx.lotsFromTarget("target");
      expect(result).toHaveLength(1);
    });

    it("skips operation lots with null lotId", () => {
      const ctx = makeCtx({
        operationLots: [
          { id: "oi-1", key: "target", operationId: "op-1", lotId: null },
        ],
      });

      expect(ctx.lotsFromTarget("target")).toEqual([]);
    });
  });

  describe("resolveValue", () => {
    it("returns null when value is null", () => {
      const ctx = makeCtx();
      expect(ctx.resolveValue(null)).toBeNull();
    });

    it("returns a string literal as-is", () => {
      const ctx = makeCtx();
      expect(ctx.resolveValue("hello")).toBe("hello");
    });

    it("returns a number literal as-is", () => {
      const ctx = makeCtx();
      expect(ctx.resolveValue(42)).toBe(42);
    });

    it("returns a boolean literal as-is", () => {
      const ctx = makeCtx();
      expect(ctx.resolveValue(true)).toBe(true);
    });

    it("resolves a from-ref to an input field value", () => {
      const ctx = makeCtx({
        fields: [{ key: "weight", value: 5.5 }],
      });

      expect(ctx.resolveValue({ from: ["inputs", "weight"] })).toBe(5.5);
    });

    it("resolves a from-ref to a string input field", () => {
      const ctx = makeCtx({
        fields: [{ key: "species", value: "oyster" }],
      });

      expect(ctx.resolveValue({ from: ["inputs", "species"] })).toBe("oyster");
    });

    it("returns undefined when from-ref points to a missing field", () => {
      const ctx = makeCtx({
        fields: [{ key: "weight", value: 5.5 }],
      });

      expect(
        ctx.resolveValue({ from: ["inputs", "nonexistent"] }),
      ).toBeUndefined();
    });

    it("returns undefined for an object without a from key", () => {
      const ctx = makeCtx();
      // @ts-expect-error -- testing runtime behavior with invalid input
      expect(ctx.resolveValue({ other: "value" })).toBeUndefined();
    });
  });
});
