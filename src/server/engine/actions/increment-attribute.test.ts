import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeIncrement,
  incrementAttribute,
} from "./increment-attribute";
import type { ExecCtx, Lot } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLot(overrides: Partial<Lot> = {}): Lot {
  return {
    id: "lot-1",
    itemTypeId: "item-type-1",
    lotCode: "LOT-001",
    status: "active",
    qtyOnHand: "0",
    qtyReserved: "0",
    uom: "each",
    locationId: null,
    attributes: {},
    notes: null,
    createdBy: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function makeCtx(overrides: Partial<ExecCtx> = {}): ExecCtx {
  return {
    lots: {},
    inputs: {},
    itemTypeNames: new Map(),
    lotsCreated: [],
    lotsUpdated: new Set(),
    lineageCreated: 0,
    operationId: "op-1",
    ...overrides,
  };
}

function makeStep(overrides: Record<string, unknown> = {}) {
  return {
    id: "step-1",
    operationTypeId: "ot-1",
    name: "inc weight",
    action: "increment_attribute",
    target: "product" as string | null,
    value: {} as unknown,
    sortOrder: "0",
    itemType: null as string | null,
    eventType: null as string | null,
    ...overrides,
  };
}

function makeTx() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  const update = vi.fn().mockReturnValue({ set });
  return { update, set, where };
}

// ---------------------------------------------------------------------------
// computeIncrement (pure)
// ---------------------------------------------------------------------------

describe("computeIncrement", () => {
  it("increments an existing numeric attribute", () => {
    const result = computeIncrement({ weight: 10 }, "weight", 5);
    expect(result).toEqual({ weight: 15 });
  });

  it("initialises a missing attribute to the increment value", () => {
    const result = computeIncrement({}, "weight", 7);
    expect(result).toEqual({ weight: 7 });
  });

  it("handles negative increments", () => {
    const result = computeIncrement({ weight: 10 }, "weight", -3);
    expect(result).toEqual({ weight: 7 });
  });

  it("treats non-numeric existing value as 0", () => {
    const result = computeIncrement({ weight: "not a number" }, "weight", 5);
    expect(result).toEqual({ weight: 5 });
  });

  it("handles zero increment", () => {
    const result = computeIncrement({ weight: 10 }, "weight", 0);
    expect(result).toEqual({ weight: 10 });
  });

  it("does not mutate the input object", () => {
    const original = { weight: 10 };
    computeIncrement(original, "weight", 5);
    expect(original).toEqual({ weight: 10 });
  });

  it("preserves other attributes", () => {
    const result = computeIncrement({ weight: 10, color: "red" }, "weight", 5);
    expect(result).toEqual({ weight: 15, color: "red" });
  });

  it("coerces a string-number attribute", () => {
    const result = computeIncrement({ weight: "10" }, "weight", 5);
    expect(result).toEqual({ weight: 15 });
  });
});

// ---------------------------------------------------------------------------
// incrementAttribute handler
// ---------------------------------------------------------------------------

describe("incrementAttribute", () => {
  let tx: ReturnType<typeof makeTx>;

  beforeEach(() => {
    tx = makeTx();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T00:00:00Z"));
  });

  it("returns early when no target lots exist", async () => {
    const ctx = makeCtx();
    const step = makeStep({ target: "product" });
    const result = await incrementAttribute(tx as never, step, { attribute: "weight", by: 5 }, ctx);
    expect(result).toBe('no "product" provided');
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("returns early when target role is null", async () => {
    const ctx = makeCtx();
    const step = makeStep({ target: null });
    const result = await incrementAttribute(tx as never, step, { attribute: "weight", by: 5 }, ctx);
    expect(result).toBe("no target role specified");
  });

  it("returns early when no attribute key is specified", async () => {
    const lotObj = makeLot();
    const ctx = makeCtx({ lots: { product: [lotObj] } });
    const step = makeStep();
    const result = await incrementAttribute(tx as never, step, { by: 5 }, ctx);
    expect(result).toBe("no attribute key specified");
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("increments an attribute and writes to the database", async () => {
    const lotObj = makeLot({ attributes: { weight: 10 } });
    const ctx = makeCtx({
      lots: { product: [lotObj] },
      itemTypeNames: new Map([["item-type-1", "Product"]]),
    });
    const step = makeStep();
    const config = { attribute: "weight", by: 5 };

    const result = await incrementAttribute(tx as never, step, config, ctx);

    expect(tx.update).toHaveBeenCalledTimes(1);
    expect(tx.set).toHaveBeenCalledWith({
      attributes: { weight: 15 },
      updatedAt: new Date("2025-06-01T00:00:00Z"),
    });
    expect(ctx.lotsUpdated.has("lot-1")).toBe(true);
    expect(lotObj.attributes).toEqual({ weight: 15 });
    expect(result).toBe("incremented weight by 5 on 1 Product");
  });

  it("processes multiple target lots", async () => {
    const lot1 = makeLot({ id: "lot-1", attributes: { count: 1 } });
    const lot2 = makeLot({ id: "lot-2", attributes: { count: 3 } });
    const ctx = makeCtx({
      lots: { product: [lot1, lot2] },
      itemTypeNames: new Map([["item-type-1", "Widget"]]),
    });
    const step = makeStep();
    const config = { attribute: "count", by: 10 };

    const result = await incrementAttribute(tx as never, step, config, ctx);

    expect(tx.update).toHaveBeenCalledTimes(2);
    expect(ctx.lotsUpdated.has("lot-1")).toBe(true);
    expect(ctx.lotsUpdated.has("lot-2")).toBe(true);
    expect(lot1.attributes).toEqual({ count: 11 });
    expect(lot2.attributes).toEqual({ count: 13 });
    expect(result).toBe("incremented count by 10 on 2 Widgets");
  });

  it("resolves 'value' config key when 'by' is absent", async () => {
    const lotObj = makeLot({ attributes: {} });
    const ctx = makeCtx({
      lots: { product: [lotObj] },
      itemTypeNames: new Map([["item-type-1", "Item"]]),
    });
    const step = makeStep();
    const config = { attribute: "weight", value: 3 };

    await incrementAttribute(tx as never, step, config, ctx);

    expect(tx.set).toHaveBeenCalledWith({
      attributes: { weight: 3 },
      updatedAt: new Date("2025-06-01T00:00:00Z"),
    });
  });

  it("defaults increment to 0 when no by/value/config._value", async () => {
    const lotObj = makeLot({ attributes: { weight: 10 } });
    const ctx = makeCtx({
      lots: { product: [lotObj] },
      itemTypeNames: new Map([["item-type-1", "Item"]]),
    });
    const step = makeStep();
    const config = { attribute: "weight" };

    await incrementAttribute(tx as never, step, config, ctx);

    expect(tx.set).toHaveBeenCalledWith({
      attributes: { weight: 10 },
      updatedAt: new Date("2025-06-01T00:00:00Z"),
    });
  });
});
