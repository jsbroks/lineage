import { describe, it, expect } from "vitest";
import { setItemAttr } from "./set-item-attr";
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
    name: "Set attribute",
    action: "set-item-attr",
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

describe("setItemAttr", () => {
  describe("schema validation", () => {
    it("returns skipped when config is empty", () => {
      const result = setItemAttr.handler(makeCtx(), makeStep({ config: {} }));
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });

    it("returns skipped when attrKey is missing", () => {
      const result = setItemAttr.handler(
        makeCtx(),
        makeStep({ config: { value: "x" } }),
      );
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });

    it("returns skipped when value is missing", () => {
      const result = setItemAttr.handler(
        makeCtx(),
        makeStep({ config: { attrKey: "color" } }),
      );
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });

    it("returns skipped when attrKey is not a string", () => {
      const result = setItemAttr.handler(
        makeCtx(),
        makeStep({ config: { attrKey: 42, value: "red" } }),
      );
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });
  });

  describe("when no items match target", () => {
    it("returns skipped with descriptive message", () => {
      const result = setItemAttr.handler(
        makeCtx(),
        makeStep({ config: { attrKey: "color", value: "red" } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/No items found for target/);
    });
  });

  describe("literal values", () => {
    it("sets a string attribute on a single item", () => {
      const item = makeItem({ id: "a" });
      const ctx = makeCtx({ items: { source: [item] } });

      const result = setItemAttr.handler(
        ctx,
        makeStep({ config: { attrKey: "color", value: "red" } }),
      );

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(false);
      expect(result.items.update).toEqual({
        a: { attributes: { color: "red" } },
      });
      expect(result.message).toBe("Set attribute color for 1 item");
    });

    it("sets a numeric attribute", () => {
      const item = makeItem({ id: "a" });
      const ctx = makeCtx({ items: { source: [item] } });

      const result = setItemAttr.handler(
        ctx,
        makeStep({ config: { attrKey: "weight", value: 50 } }),
      );

      expect(result.items.update).toEqual({
        a: { attributes: { weight: 50 } },
      });
    });

    it("sets a boolean attribute", () => {
      const item = makeItem({ id: "a" });
      const ctx = makeCtx({ items: { source: [item] } });

      const result = setItemAttr.handler(
        ctx,
        makeStep({ config: { attrKey: "organic", value: true } }),
      );

      expect(result.items.update).toEqual({
        a: { attributes: { organic: true } },
      });
    });

    it("sets a null attribute", () => {
      const item = makeItem({ id: "a" });
      const ctx = makeCtx({ items: { source: [item] } });

      const result = setItemAttr.handler(
        ctx,
        makeStep({ config: { attrKey: "notes", value: null } }),
      );

      expect(result.items.update).toEqual({
        a: { attributes: { notes: null } },
      });
    });
  });

  describe("from-ref values", () => {
    it("resolves value from operation input fields", () => {
      const item = makeItem({ id: "a" });
      const ctx = makeCtx({
        items: { source: [item] },
        fields: [{ key: "grade", value: "A+" }],
      });

      const result = setItemAttr.handler(
        ctx,
        makeStep({
          config: { attrKey: "grade", value: { from: ["inputs", "grade"] } },
        }),
      );

      expect(result.success).toBe(true);
      expect(result.items.update).toEqual({
        a: { attributes: { grade: "A+" } },
      });
    });

    it("resolves to undefined for a missing field reference", () => {
      const item = makeItem({ id: "a" });
      const ctx = makeCtx({ items: { source: [item] } });

      const result = setItemAttr.handler(
        ctx,
        makeStep({
          config: {
            attrKey: "grade",
            value: { from: ["inputs", "nonexistent"] },
          },
        }),
      );

      expect(result.success).toBe(true);
      expect(result.items.update).toEqual({
        a: { attributes: { grade: undefined } },
      });
    });
  });

  describe("multiple items", () => {
    it("sets attribute on all target items", () => {
      const items = [
        makeItem({ id: "a" }),
        makeItem({ id: "b" }),
        makeItem({ id: "c" }),
      ];
      const ctx = makeCtx({ items: { source: items } });

      const result = setItemAttr.handler(
        ctx,
        makeStep({ config: { attrKey: "species", value: "oyster" } }),
      );

      expect(result.success).toBe(true);
      expect(result.items.update).toEqual({
        a: { attributes: { species: "oyster" } },
        b: { attributes: { species: "oyster" } },
        c: { attributes: { species: "oyster" } },
      });
    });

    it("uses singular 'item' for exactly one", () => {
      const item = makeItem({ id: "a" });
      const ctx = makeCtx({ items: { source: [item] } });

      const result = setItemAttr.handler(
        ctx,
        makeStep({ config: { attrKey: "x", value: 1 } }),
      );

      expect(result.message).toBe("Set attribute x for 1 item");
    });

    it("uses plural 'items' for more than one", () => {
      const items = [makeItem({ id: "a" }), makeItem({ id: "b" })];
      const ctx = makeCtx({ items: { source: items } });

      const result = setItemAttr.handler(
        ctx,
        makeStep({ config: { attrKey: "x", value: 1 } }),
      );

      expect(result.message).toBe("Set attribute x for 2 items");
    });
  });

  describe("result structure", () => {
    it("returns an ActionResult instance", () => {
      const result = setItemAttr.handler(
        makeCtx(),
        makeStep({ config: { attrKey: "x", value: "y" } }),
      );

      expect(result).toBeInstanceOf(ActionResult);
    });

    it("returns empty create and link arrays on success", () => {
      const item = makeItem({ id: "a" });
      const ctx = makeCtx({ items: { source: [item] } });

      const result = setItemAttr.handler(
        ctx,
        makeStep({ config: { attrKey: "color", value: "red" } }),
      );

      expect(result.items.create).toEqual([]);
      expect(result.items.link).toEqual([]);
    });
  });

  describe("merge behavior", () => {
    it("merges attributes set by updateItem without overwriting other fields", () => {
      const result = new ActionResult();
      result.updateItem("a", { statusId: "s1" } as any);
      result.updateItem("a", { attributes: { color: "red" } } as any);

      expect(result.items.update["a"]).toEqual({
        statusId: "s1",
        attributes: { color: "red" },
      });
    });
  });
});
