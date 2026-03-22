import { describe, it, expect } from "vitest";
import { incrementAttribute } from "./increment-attribute";
import { ActionResult } from "./actions";
import { OperationContext } from "../operation-context";
import type { Item, OperationInputValue } from "~/server/db/schema";

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
  items?: Record<string, Item[]>;
  fields?: { key: string; value: unknown }[];
};

function makeCtx({ items = {}, fields = [] }: CtxInput = {}): OperationContext {
  const allItems: Item[] = Object.values(items).flat();

  const operationItems = Object.entries(items).flatMap(([key, list]) =>
    list.map((item) => ({
      id: `oi-${item.id}`,
      key,
      operationId: "op-1",
      itemId: item.id,
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
    inputItems: operationItems,
    inputLocations: [],
    inputValues: operationValues,
  });

  ctx.items = Object.fromEntries(allItems.map((i) => [i.id, i]));

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

  describe("when no items match target", () => {
    it("returns skipped", () => {
      const result = incrementAttribute.handler(
        makeCtx(),
        makeStep({ config: { attrKey: "flush_count" } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/No items found for target/);
    });
  });

  describe("default increment (by 1)", () => {
    it("increments from 0 when attribute does not exist", () => {
      const item = makeItem({ id: "a", attributes: {} });
      const ctx = makeCtx({ items: { source: [item] } });

      const result = incrementAttribute.handler(
        ctx,
        makeStep({ config: { attrKey: "flush_count" } }),
      );

      expect(result.success).toBe(true);
      expect(result.items.update.a!.attributes).toMatchObject({
        flush_count: 1,
      });
      expect(result.message).toBe("Incremented flush_count by 1 for 1 item");
    });

    it("increments an existing numeric attribute", () => {
      const item = makeItem({
        id: "a",
        attributes: { flush_count: 3 },
      });
      const ctx = makeCtx({ items: { source: [item] } });

      const result = incrementAttribute.handler(
        ctx,
        makeStep({ config: { attrKey: "flush_count" } }),
      );

      expect(result.items.update.a!.attributes).toMatchObject({
        flush_count: 4,
      });
    });
  });

  describe("custom increment amount", () => {
    it("increments by a literal amount", () => {
      const item = makeItem({ id: "a", attributes: { weight: 10 } });
      const ctx = makeCtx({ items: { source: [item] } });

      const result = incrementAttribute.handler(
        ctx,
        makeStep({ config: { attrKey: "weight", amount: 5 } }),
      );

      expect(result.items.update.a!.attributes).toMatchObject({ weight: 15 });
      expect(result.message).toBe("Incremented weight by 5 for 1 item");
    });

    it("decrements when amount is negative", () => {
      const item = makeItem({ id: "a", attributes: { stock: 100 } });
      const ctx = makeCtx({ items: { source: [item] } });

      const result = incrementAttribute.handler(
        ctx,
        makeStep({ config: { attrKey: "stock", amount: -10 } }),
      );

      expect(result.items.update.a!.attributes).toMatchObject({ stock: 90 });
    });

    it("resolves amount from an input field reference", () => {
      const item = makeItem({ id: "a", attributes: { harvest_weight: 0 } });
      const ctx = makeCtx({
        items: { source: [item] },
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

      expect(result.items.update.a!.attributes).toMatchObject({
        harvest_weight: 2.5,
      });
    });

    it("returns skipped when amount resolves to NaN", () => {
      const item = makeItem({ id: "a" });
      const ctx = makeCtx({
        items: { source: [item] },
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

  describe("multiple items", () => {
    it("increments attribute on all target items", () => {
      const items = [
        makeItem({ id: "a", attributes: { flush_count: 1 } }),
        makeItem({ id: "b", attributes: { flush_count: 2 } }),
        makeItem({ id: "c", attributes: {} }),
      ];
      const ctx = makeCtx({ items: { source: items } });

      const result = incrementAttribute.handler(
        ctx,
        makeStep({ config: { attrKey: "flush_count" } }),
      );

      expect(result.items.update.a!.attributes).toMatchObject({
        flush_count: 2,
      });
      expect(result.items.update.b!.attributes).toMatchObject({
        flush_count: 3,
      });
      expect(result.items.update.c!.attributes).toMatchObject({
        flush_count: 1,
      });
      expect(result.message).toBe("Incremented flush_count by 1 for 3 items");
    });
  });

  describe("preserves existing attributes", () => {
    it("does not lose other attributes when incrementing", () => {
      const item = makeItem({
        id: "a",
        attributes: { species: "oyster", flush_count: 2 },
      });
      const ctx = makeCtx({ items: { source: [item] } });

      const result = incrementAttribute.handler(
        ctx,
        makeStep({ config: { attrKey: "flush_count" } }),
      );

      const attrs = result.items.update.a!.attributes as Record<
        string,
        unknown
      >;
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
      const item = makeItem({ id: "a" });
      const ctx = makeCtx({ items: { source: [item] } });

      const result = incrementAttribute.handler(
        ctx,
        makeStep({ config: { attrKey: "count" } }),
      );

      expect(result.items.create).toEqual([]);
      expect(result.items.link).toEqual([]);
    });
  });
});
