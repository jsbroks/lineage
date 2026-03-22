import { describe, it, expect } from "vitest";
import { setItemStatus } from "./set-item-status";
import { ActionResult } from "./actions";
import {
  OperationContext,
  type ItemTypeWithStatusDefinitions,
} from "../operation-context";
import type {
  Item,
  ItemType,
  ItemTypeStatusDefinition,
} from "~/server/db/schema";

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

function makeStatusDef(
  overrides: Partial<ItemTypeStatusDefinition> = {},
): ItemTypeStatusDefinition {
  return {
    id: "status-approved",
    itemTypeId: "type-1",
    name: "Approved",
    color: null,
    isInitial: false,
    isTerminal: false,
    ordinal: 0,
    ...overrides,
  };
}

function makeItemType(
  overrides: Partial<ItemType> & {
    statusDefinitions?: ItemTypeStatusDefinition[];
  } = {},
): ItemType & { statusDefinitions: ItemTypeStatusDefinition[] } {
  const { statusDefinitions = [], ...rest } = overrides;
  return {
    id: "type-1",
    name: "Block",
    description: null,
    category: "raw",
    quantityName: null,
    quantityDefaultUnit: "each",
    icon: null,
    color: null,
    codePrefix: "BLK",
    codeNextNumber: 1,
    statusDefinitions,
    ...rest,
  };
}

type StepInput = {
  target?: string | null;
  config?: unknown;
};

function makeStep({ target = "source", config = {} }: StepInput = {}) {
  return {
    id: "step-1",
    name: "Set status",
    action: "set-item-status",
    target,
    config,
    sortOrder: 0,
  };
}

type CtxInput = {
  items?: Record<string, Item[]>;
  itemTypes?: Record<string, ItemTypeWithStatusDefinitions>;
};

function makeCtx({
  items = {},
  itemTypes = {},
}: CtxInput = {}): OperationContext {
  const allItems: Item[] = Object.values(items).flat();

  const operationItems = Object.entries(items).flatMap(([key, list]) =>
    list.map((item) => ({
      id: `oi-${item.id}`,
      key,
      operationId: "op-1",
      itemId: item.id,
    })),
  );

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
    inputValues: [],
  });

  ctx.items = Object.fromEntries(allItems.map((i) => [i.id, i]));
  ctx.itemTypes = itemTypes;

  return ctx;
}

describe("setItemStatus", () => {
  describe("schema validation", () => {
    it("returns skipped when config has no status field", () => {
      const result = setItemStatus.handler(makeCtx(), makeStep({ config: {} }));
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });

    it("returns skipped when status is not a string", () => {
      const result = setItemStatus.handler(
        makeCtx(),
        makeStep({ config: { status: 123 } }),
      );
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });
  });

  describe("when no items match target", () => {
    it("returns skipped with descriptive message", () => {
      const result = setItemStatus.handler(
        makeCtx(),
        makeStep({ config: { status: "Approved" } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/No items found for target/);
    });
  });

  describe("when item type is not found", () => {
    it("returns skipped when item has unknown itemTypeId", () => {
      const item = makeItem({ id: "a", itemTypeId: "unknown-type" });
      const ctx = makeCtx({ items: { source: [item] } });
      const result = setItemStatus.handler(
        ctx,
        makeStep({ config: { status: "Approved" } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Item type not found/);
    });
  });

  describe("when status definition is not found", () => {
    it("returns skipped when status name does not exist on item type", () => {
      const item = makeItem({ id: "a", itemTypeId: "type-1" });
      const ctx = makeCtx({
        items: { source: [item] },
        itemTypes: {
          "type-1": makeItemType({ statusDefinitions: [] }),
        },
      });
      const result = setItemStatus.handler(
        ctx,
        makeStep({ config: { status: "NonExistent" } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Status definition not found/);
    });
  });

  describe("successful status updates", () => {
    it("sets statusId on a single item", () => {
      const item = makeItem({ id: "a", itemTypeId: "type-1" });
      const ctx = makeCtx({
        items: { source: [item] },
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [
              makeStatusDef({ id: "status-approved", name: "Approved" }),
            ],
          }),
        },
      });

      const result = setItemStatus.handler(
        ctx,
        makeStep({ config: { status: "Approved" } }),
      );

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(false);
      expect(result.items.update).toEqual({
        a: { statusId: "status-approved" },
      });
      expect(result.message).toBe("Set status for 1 item");
    });

    it("sets statusId on multiple items", () => {
      const items = [
        makeItem({ id: "a", itemTypeId: "type-1" }),
        makeItem({ id: "b", itemTypeId: "type-1" }),
        makeItem({ id: "c", itemTypeId: "type-1" }),
      ];
      const ctx = makeCtx({
        items: { source: items },
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [
              makeStatusDef({ id: "status-packed", name: "Packed" }),
            ],
          }),
        },
      });

      const result = setItemStatus.handler(
        ctx,
        makeStep({ config: { status: "Packed" } }),
      );

      expect(result.success).toBe(true);
      expect(result.items.update).toEqual({
        a: { statusId: "status-packed" },
        b: { statusId: "status-packed" },
        c: { statusId: "status-packed" },
      });
      expect(result.message).toBe("Set status for 3 items");
    });

    it("uses singular 'item' for exactly one item", () => {
      const item = makeItem({ id: "x", itemTypeId: "type-1" });
      const ctx = makeCtx({
        items: { source: [item] },
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [makeStatusDef({ id: "s1", name: "Active" })],
          }),
        },
      });

      const result = setItemStatus.handler(
        ctx,
        makeStep({ config: { status: "Active" } }),
      );

      expect(result.message).toBe("Set status for 1 item");
    });

    it("uses plural 'items' for more than one item", () => {
      const items = [
        makeItem({ id: "a", itemTypeId: "type-1" }),
        makeItem({ id: "b", itemTypeId: "type-1" }),
      ];
      const ctx = makeCtx({
        items: { source: items },
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [makeStatusDef({ id: "s1", name: "Done" })],
          }),
        },
      });

      const result = setItemStatus.handler(
        ctx,
        makeStep({ config: { status: "Done" } }),
      );

      expect(result.message).toBe("Set status for 2 items");
    });
  });

  describe("items with different item types", () => {
    it("resolves status from each item's own item type", () => {
      const items = [
        makeItem({ id: "a", itemTypeId: "type-1" }),
        makeItem({ id: "b", itemTypeId: "type-2" }),
      ];
      const ctx = makeCtx({
        items: { source: items },
        itemTypes: {
          "type-1": makeItemType({
            id: "type-1",
            statusDefinitions: [
              makeStatusDef({ id: "s1-ready", name: "Ready" }),
            ],
          }),
          "type-2": makeItemType({
            id: "type-2",
            statusDefinitions: [
              makeStatusDef({
                id: "s2-ready",
                itemTypeId: "type-2",
                name: "Ready",
              }),
            ],
          }),
        },
      });

      const result = setItemStatus.handler(
        ctx,
        makeStep({ config: { status: "Ready" } }),
      );

      expect(result.success).toBe(true);
      expect(result.items.update).toEqual({
        a: { statusId: "s1-ready" },
        b: { statusId: "s2-ready" },
      });
    });

    it("returns skipped if second item's type is missing", () => {
      const items = [
        makeItem({ id: "a", itemTypeId: "type-1" }),
        makeItem({ id: "b", itemTypeId: "type-missing" }),
      ];
      const ctx = makeCtx({
        items: { source: items },
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [makeStatusDef({ id: "s1", name: "Approved" })],
          }),
        },
      });

      const result = setItemStatus.handler(
        ctx,
        makeStep({ config: { status: "Approved" } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Item type not found/);
    });

    it("returns skipped if second item's type lacks the status", () => {
      const items = [
        makeItem({ id: "a", itemTypeId: "type-1" }),
        makeItem({ id: "b", itemTypeId: "type-2" }),
      ];
      const ctx = makeCtx({
        items: { source: items },
        itemTypes: {
          "type-1": makeItemType({
            id: "type-1",
            statusDefinitions: [makeStatusDef({ id: "s1", name: "Approved" })],
          }),
          "type-2": makeItemType({
            id: "type-2",
            statusDefinitions: [],
          }),
        },
      });

      const result = setItemStatus.handler(
        ctx,
        makeStep({ config: { status: "Approved" } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Status definition not found/);
    });
  });

  describe("result structure", () => {
    it("returns empty create and link arrays on success", () => {
      const item = makeItem({ id: "a", itemTypeId: "type-1" });
      const ctx = makeCtx({
        items: { source: [item] },
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [makeStatusDef({ id: "s1", name: "Active" })],
          }),
        },
      });

      const result = setItemStatus.handler(
        ctx,
        makeStep({ config: { status: "Active" } }),
      );

      expect(result.items.create).toEqual([]);
      expect(result.items.link).toEqual([]);
    });

    it("returns an ActionResult instance", () => {
      const result = setItemStatus.handler(
        makeCtx(),
        makeStep({ config: { status: "Approved" } }),
      );

      expect(result).toBeInstanceOf(ActionResult);
    });
  });
});

describe("ActionResult.updateItem", () => {
  it("merges new changes into pre-existing update values", () => {
    const result = new ActionResult();
    result.updateItem("a", { attributes: { color: "red" } } as any);
    result.updateItem("a", { statusId: "status-approved" } as any);

    expect(result.items.update["a"]).toEqual({
      attributes: { color: "red" },
      statusId: "status-approved",
    });
  });

  it("does not overwrite existing fields when adding new ones", () => {
    const result = new ActionResult();
    result.updateItem("a", { notes: "original note" } as any);
    result.updateItem("a", { statusId: "status-1" } as any);

    expect(result.items.update["a"]).toEqual({
      notes: "original note",
      statusId: "status-1",
    });
  });

  it("overwrites the same field with the latest value", () => {
    const result = new ActionResult();
    result.updateItem("a", { statusId: "status-old" } as any);
    result.updateItem("a", { statusId: "status-new" } as any);

    expect(result.items.update["a"]).toEqual({
      statusId: "status-new",
    });
  });

  it("keeps updates for different items independent", () => {
    const result = new ActionResult();
    result.updateItem("a", { statusId: "s1" } as any);
    result.updateItem("b", { notes: "hello" } as any);

    expect(result.items.update["a"]).toEqual({ statusId: "s1" });
    expect(result.items.update["b"]).toEqual({ notes: "hello" });
  });
});
