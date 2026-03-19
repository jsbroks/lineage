import { describe, it, expect } from "vitest";
import {
  resolveValue,
  resolveAttrDef,
  resolveFromRef,
  traverseRest,
} from "./set-item";
import type { ExecCtx, Item } from "../types";

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    itemTypeId: "type-1",
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
  } as Item;
}

function makeCtx(overrides: Partial<ExecCtx> = {}): ExecCtx {
  return {
    items: {},
    inputs: {},
    itemTypeNames: new Map(),
    itemsCreated: [],
    itemsUpdated: new Set(),
    lineageCreated: 0,
    operationId: "op-1",
    ...overrides,
  };
}

// ── resolveValue ─────────────────────────────────────────────────────────

describe("resolveValue", () => {
  it("returns null for null input", () => {
    expect(resolveValue(null, makeCtx())).toBeNull();
  });

  it("returns undefined for undefined input", () => {
    expect(resolveValue(undefined, makeCtx())).toBeUndefined();
  });

  it("passes through string literals", () => {
    expect(resolveValue("Approved", makeCtx())).toBe("Approved");
  });

  it("passes through number literals", () => {
    expect(resolveValue(42, makeCtx())).toBe(42);
  });

  it("passes through boolean literals", () => {
    expect(resolveValue(true, makeCtx())).toBe(true);
    expect(resolveValue(false, makeCtx())).toBe(false);
  });

  it("resolves a from-ref to a top-level input", () => {
    const ctx = makeCtx({ inputs: { Grade: "A" } });
    expect(resolveValue({ from: ["Grade"] }, ctx)).toBe("A");
  });

  it("resolves a from-ref to a nested input via lodash path", () => {
    const ctx = makeCtx({ inputs: { meta: { region: "US-West" } } });
    expect(resolveValue({ from: ["meta", "region"] }, ctx)).toBe("US-West");
  });

  it("returns undefined for a from-ref that doesn't match any input", () => {
    expect(resolveValue({ from: ["missing"] }, makeCtx())).toBeUndefined();
  });

  it("returns undefined for an empty from-ref array", () => {
    const ctx = makeCtx({ inputs: { x: 1 } });
    expect(resolveValue({ from: [] }, ctx)).toBeUndefined();
  });
});

// ── resolveAttrDef ───────────────────────────────────────────────────────

describe("resolveAttrDef", () => {
  it("returns null literal with keepExisting false", () => {
    expect(resolveAttrDef(null, makeCtx())).toEqual({
      value: null,
      keepExisting: false,
    });
  });

  it("passes through string literal", () => {
    expect(resolveAttrDef("hello", makeCtx())).toEqual({
      value: "hello",
      keepExisting: false,
    });
  });

  it("passes through number literal", () => {
    expect(resolveAttrDef(99, makeCtx())).toEqual({
      value: 99,
      keepExisting: false,
    });
  });

  it("passes through boolean literal", () => {
    expect(resolveAttrDef(true, makeCtx())).toEqual({
      value: true,
      keepExisting: false,
    });
  });

  it("resolves from-ref to an input value", () => {
    const ctx = makeCtx({ inputs: { Grade: "A" } });
    expect(resolveAttrDef({ from: ["inputs", "Grade"] }, ctx)).toEqual({
      value: "A",
      keepExisting: false,
    });
  });

  it("resolves from-ref with keepExisting true", () => {
    const ctx = makeCtx({ inputs: { Grade: "B+" } });
    expect(
      resolveAttrDef({ from: ["inputs", "Grade"], keepExisting: true }, ctx),
    ).toEqual({
      value: "B+",
      keepExisting: true,
    });
  });

  it("resolves from-ref to an item attribute", () => {
    const ctx = makeCtx({
      items: {
        source: [makeItem({ attributes: { color: "red" } })],
      },
    });
    expect(resolveAttrDef({ from: ["source", "color"] }, ctx)).toEqual({
      value: "red",
      keepExisting: false,
    });
  });

  it("resolves from-ref to item id when no sub-path given", () => {
    const ctx = makeCtx({
      items: { source: [makeItem({ id: "item-42" })] },
    });
    expect(resolveAttrDef({ from: ["source"] }, ctx)).toEqual({
      value: "item-42",
      keepExisting: false,
    });
  });
});

// ── resolveFromRef ───────────────────────────────────────────────────────

describe("resolveFromRef", () => {
  it("returns undefined for empty parts", () => {
    expect(resolveFromRef([], makeCtx())).toBeUndefined();
  });

  it("resolves inputs with single key", () => {
    const ctx = makeCtx({ inputs: { Name: "Widget" } });
    expect(resolveFromRef(["inputs", "Name"], ctx)).toBe("Widget");
  });

  it("resolves inputs with dot-joined key", () => {
    const ctx = makeCtx({ inputs: { "a.b": "dot-value" } });
    expect(resolveFromRef(["inputs", "a", "b"], ctx)).toBe("dot-value");
  });

  it("traverses nested input objects when dot-key not found", () => {
    const ctx = makeCtx({ inputs: { meta: { nested: "deep" } } });
    expect(resolveFromRef(["inputs", "meta", "nested"], ctx)).toBe("deep");
  });

  it("returns item id when only role is specified", () => {
    const ctx = makeCtx({
      items: { block: [makeItem({ id: "blk-1" })] },
    });
    expect(resolveFromRef(["block"], ctx)).toBe("blk-1");
  });

  it("returns item statusId for 'status' sub-path", () => {
    const ctx = makeCtx({
      items: { block: [makeItem({ statusId: "sts-99" })] },
    });
    expect(resolveFromRef(["block", "status"], ctx)).toBe("sts-99");
  });

  it("returns item id for 'id' sub-path", () => {
    const ctx = makeCtx({
      items: { block: [makeItem({ id: "blk-7" })] },
    });
    expect(resolveFromRef(["block", "id"], ctx)).toBe("blk-7");
  });

  it("returns item attribute value", () => {
    const ctx = makeCtx({
      items: {
        block: [makeItem({ attributes: { weight: 50 } })],
      },
    });
    expect(resolveFromRef(["block", "weight"], ctx)).toBe(50);
  });

  it("traverses nested item attributes", () => {
    const ctx = makeCtx({
      items: {
        block: [makeItem({ attributes: { dims: { width: 10, height: 20 } } })],
      },
    });
    expect(resolveFromRef(["block", "dims", "width"], ctx)).toBe(10);
  });

  it("returns undefined for unknown role", () => {
    expect(resolveFromRef(["unknown"], makeCtx())).toBeUndefined();
  });

  it("returns undefined for unknown input key", () => {
    expect(resolveFromRef(["inputs", "nope"], makeCtx())).toBeUndefined();
  });
});

// ── traverseRest ─────────────────────────────────────────────────────────

describe("traverseRest", () => {
  it("returns the value itself for empty segments", () => {
    expect(traverseRest("hello", [])).toBe("hello");
  });

  it("traverses a nested object", () => {
    expect(traverseRest({ a: { b: 42 } }, ["a", "b"])).toBe(42);
  });

  it("returns undefined when a segment is missing", () => {
    expect(traverseRest({ a: 1 }, ["b"])).toBeUndefined();
  });

  it("returns undefined when traversing through null", () => {
    expect(traverseRest(null, ["a"])).toBeUndefined();
  });

  it("returns undefined when traversing through a primitive", () => {
    expect(traverseRest(42, ["a"])).toBeUndefined();
  });

  it("handles deeply nested paths", () => {
    const obj = { a: { b: { c: { d: "deep" } } } };
    expect(traverseRest(obj, ["a", "b", "c", "d"])).toBe("deep");
  });
});
