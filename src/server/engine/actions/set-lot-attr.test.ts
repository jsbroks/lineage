import { describe, it, expect } from "vitest";
import { setLotAttr } from "./set-lot-attr";
import { ActionResult } from "./actions";
import { OperationContext } from "../operation-context";
import type { Lot, OperationInputValue } from "~/server/db/schema";

function makeLot(overrides: Partial<Lot> = {}): Lot {
  return {
    id: "lot-1",
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
    name: "Set attribute",
    action: "set-lot-attr",
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

describe("setLotAttr", () => {
  describe("schema validation", () => {
    it("returns skipped when config is empty", () => {
      const result = setLotAttr.handler(makeCtx(), makeStep({ config: {} }));
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });

    it("returns skipped when attrKey is missing", () => {
      const result = setLotAttr.handler(
        makeCtx(),
        makeStep({ config: { value: "x" } }),
      );
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });

    it("returns skipped when value is missing", () => {
      const result = setLotAttr.handler(
        makeCtx(),
        makeStep({ config: { attrKey: "color" } }),
      );
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });

    it("returns skipped when attrKey is not a string", () => {
      const result = setLotAttr.handler(
        makeCtx(),
        makeStep({ config: { attrKey: 42, value: "red" } }),
      );
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });
  });

  describe("when no lots match target", () => {
    it("returns skipped with descriptive message", () => {
      const result = setLotAttr.handler(
        makeCtx(),
        makeStep({ config: { attrKey: "color", value: "red" } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/No lots found for target/);
    });
  });

  describe("literal values", () => {
    it("sets a string attribute on a single lot", () => {
      const lot = makeLot({ id: "a" });
      const ctx = makeCtx({ lots: { source: [lot] } });

      const result = setLotAttr.handler(
        ctx,
        makeStep({ config: { attrKey: "color", value: "red" } }),
      );

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(false);
      expect(result.lots.update).toEqual({
        a: { attributes: { color: "red" } },
      });
      expect(result.message).toBe("Set attribute color for 1 lot");
    });

    it("sets a numeric attribute", () => {
      const lot = makeLot({ id: "a" });
      const ctx = makeCtx({ lots: { source: [lot] } });

      const result = setLotAttr.handler(
        ctx,
        makeStep({ config: { attrKey: "weight", value: 50 } }),
      );

      expect(result.lots.update).toEqual({
        a: { attributes: { weight: 50 } },
      });
    });

    it("sets a boolean attribute", () => {
      const lot = makeLot({ id: "a" });
      const ctx = makeCtx({ lots: { source: [lot] } });

      const result = setLotAttr.handler(
        ctx,
        makeStep({ config: { attrKey: "organic", value: true } }),
      );

      expect(result.lots.update).toEqual({
        a: { attributes: { organic: true } },
      });
    });

    it("sets a null attribute", () => {
      const lot = makeLot({ id: "a" });
      const ctx = makeCtx({ lots: { source: [lot] } });

      const result = setLotAttr.handler(
        ctx,
        makeStep({ config: { attrKey: "notes", value: null } }),
      );

      expect(result.lots.update).toEqual({
        a: { attributes: { notes: null } },
      });
    });
  });

  describe("from-ref values", () => {
    it("resolves value from operation input fields", () => {
      const lot = makeLot({ id: "a" });
      const ctx = makeCtx({
        lots: { source: [lot] },
        fields: [{ key: "grade", value: "A+" }],
      });

      const result = setLotAttr.handler(
        ctx,
        makeStep({
          config: { attrKey: "grade", value: { from: ["inputs", "grade"] } },
        }),
      );

      expect(result.success).toBe(true);
      expect(result.lots.update).toEqual({
        a: { attributes: { grade: "A+" } },
      });
    });

    it("resolves to undefined for a missing field reference", () => {
      const lot = makeLot({ id: "a" });
      const ctx = makeCtx({ lots: { source: [lot] } });

      const result = setLotAttr.handler(
        ctx,
        makeStep({
          config: {
            attrKey: "grade",
            value: { from: ["inputs", "nonexistent"] },
          },
        }),
      );

      expect(result.success).toBe(true);
      expect(result.lots.update).toEqual({
        a: { attributes: { grade: undefined } },
      });
    });
  });

  describe("multiple lots", () => {
    it("sets attribute on all target lots", () => {
      const lots = [
        makeLot({ id: "a" }),
        makeLot({ id: "b" }),
        makeLot({ id: "c" }),
      ];
      const ctx = makeCtx({ lots: { source: lots } });

      const result = setLotAttr.handler(
        ctx,
        makeStep({ config: { attrKey: "species", value: "oyster" } }),
      );

      expect(result.success).toBe(true);
      expect(result.lots.update).toEqual({
        a: { attributes: { species: "oyster" } },
        b: { attributes: { species: "oyster" } },
        c: { attributes: { species: "oyster" } },
      });
    });

    it("uses singular 'lot' for exactly one", () => {
      const lot = makeLot({ id: "a" });
      const ctx = makeCtx({ lots: { source: [lot] } });

      const result = setLotAttr.handler(
        ctx,
        makeStep({ config: { attrKey: "x", value: 1 } }),
      );

      expect(result.message).toBe("Set attribute x for 1 lot");
    });

    it("uses plural 'lots' for more than one", () => {
      const lots = [makeLot({ id: "a" }), makeLot({ id: "b" })];
      const ctx = makeCtx({ lots: { source: lots } });

      const result = setLotAttr.handler(
        ctx,
        makeStep({ config: { attrKey: "x", value: 1 } }),
      );

      expect(result.message).toBe("Set attribute x for 2 lots");
    });
  });

  describe("result structure", () => {
    it("returns an ActionResult instance", () => {
      const result = setLotAttr.handler(
        makeCtx(),
        makeStep({ config: { attrKey: "x", value: "y" } }),
      );

      expect(result).toBeInstanceOf(ActionResult);
    });

    it("returns empty create and link arrays on success", () => {
      const lot = makeLot({ id: "a" });
      const ctx = makeCtx({ lots: { source: [lot] } });

      const result = setLotAttr.handler(
        ctx,
        makeStep({ config: { attrKey: "color", value: "red" } }),
      );

      expect(result.lots.create).toEqual([]);
      expect(result.lots.link).toEqual([]);
    });
  });

  describe("merge behavior", () => {
    it("merges attributes set by updateLot without overwriting other fields", () => {
      const result = new ActionResult();
      result.updateLot("a", { statusId: "s1" } as any);
      result.updateLot("a", { attributes: { color: "red" } } as any);

      expect(result.lots.update["a"]).toEqual({
        statusId: "s1",
        attributes: { color: "red" },
      });
    });
  });
});
