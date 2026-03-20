import { describe, it, expect } from "vitest";
import { OperationContext, type Operation } from "./operation-context";
import type {
  Item,
  OperationInputField,
  OperationInputItem,
} from "~/server/db/schema";

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    itemTypeId: "type-1",
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
    fields: [],
    items: [],
    ...overrides,
  };
}

function makeCtx({
  items = {},
  fields = [],
  operationItems,
}: {
  items?: Record<string, Item[]>;
  fields?: { key: string; value: unknown }[];
  operationItems?: OperationInputItem[];
} = {}): OperationContext {
  const allItems: Item[] = Object.values(items).flat();

  const opItems: OperationInputItem[] =
    operationItems ??
    Object.entries(items).flatMap(([key, list]) =>
      list.map((item) => ({
        id: `oi-${item.id}`,
        key,
        operationId: "op-1",
        itemId: item.id,
      })),
    );

  const opFields: OperationInputField[] = fields.map((f, i) => ({
    id: `field-${i}`,
    key: f.key,
    operationId: "op-1",
    value: f.value,
  }));

  const ctx = new OperationContext(
    makeOperation({ fields: opFields, items: opItems }),
  );
  ctx.items = Object.fromEntries(allItems.map((i) => [i.id, i]));

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

    it("retrieves an item by id from the items record", () => {
      const item = makeItem({ id: "item-abc" });
      const ctx = makeCtx({ items: { target: [item] } });
      expect(ctx.get(["items", "item-abc", "code"])).toBe("BLK-0001");
    });

    it("returns undefined for a non-existent path", () => {
      const ctx = makeCtx();
      expect(ctx.get(["does", "not", "exist"])).toBeUndefined();
    });
  });

  describe("itemsFromTarget", () => {
    it("returns an empty array when ref is null", () => {
      const ctx = makeCtx();
      expect(ctx.itemsFromTarget(null)).toEqual([]);
    });

    it("returns an empty array when ref is undefined", () => {
      const ctx = makeCtx();
      expect(ctx.itemsFromTarget(undefined)).toEqual([]);
    });

    it("returns an empty array when no items match the ref", () => {
      const ctx = makeCtx({
        items: { source: [makeItem({ id: "item-1" })] },
      });
      expect(ctx.itemsFromTarget("target")).toEqual([]);
    });

    it("returns matching items for a given ref key", () => {
      const item = makeItem({ id: "item-1" });
      const ctx = makeCtx({ items: { target: [item] } });

      const result = ctx.itemsFromTarget("target");
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("item-1");
    });

    it("returns multiple items for the same ref key", () => {
      const item1 = makeItem({ id: "item-1", code: "BLK-0001" });
      const item2 = makeItem({ id: "item-2", code: "BLK-0002" });
      const ctx = makeCtx({ items: { target: [item1, item2] } });

      const result = ctx.itemsFromTarget("target");
      expect(result).toHaveLength(2);
      expect(result.map((i) => i.id)).toEqual(["item-1", "item-2"]);
    });

    it("deduplicates items with the same itemId", () => {
      const item = makeItem({ id: "item-1" });
      const ctx = makeCtx({
        items: { target: [item] },
        operationItems: [
          { id: "oi-1", key: "target", operationId: "op-1", itemId: "item-1" },
          { id: "oi-2", key: "target", operationId: "op-1", itemId: "item-1" },
        ],
      });

      const result = ctx.itemsFromTarget("target");
      expect(result).toHaveLength(1);
    });

    it("skips operation items with null itemId", () => {
      const ctx = makeCtx({
        operationItems: [
          { id: "oi-1", key: "target", operationId: "op-1", itemId: null },
        ],
      });

      expect(ctx.itemsFromTarget("target")).toEqual([]);
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
