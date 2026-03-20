import { describe, it, expect } from "vitest";
import { createItem } from "./create-item";
import { ActionResult } from "./actions";
import {
  OperationContext,
  type ItemTypeWithStatusDefinitions,
} from "../operation-context";
import type {
  Item,
  ItemType,
  ItemTypeStatusDefinition,
  OperationInputField,
} from "~/server/db/schema";

function makeStatusDef(
  overrides: Partial<ItemTypeStatusDefinition> = {},
): ItemTypeStatusDefinition {
  return {
    id: "status-created",
    itemTypeId: "type-1",
    name: "Created",
    color: null,
    isInitial: true,
    isTerminal: false,
    ordinal: 0,
    ...overrides,
  };
}

function makeItemType(
  overrides: Partial<ItemType> & {
    statusDefinitions?: ItemTypeStatusDefinition[];
  } = {},
): ItemTypeWithStatusDefinitions {
  const { statusDefinitions = [], ...rest } = overrides;
  return {
    id: "type-1",
    name: "Block",
    description: null,
    category: "product",
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

function makeStep({ target = null, config = {} }: StepInput = {}) {
  return {
    id: "step-1",
    name: "Create item",
    action: "create-item",
    target,
    config,
    sortOrder: 0,
  };
}

type CtxInput = {
  items?: Record<string, Item[]>;
  itemTypes?: Record<string, ItemTypeWithStatusDefinitions>;
  fields?: { key: string; value: unknown }[];
};

function makeCtx({
  items = {},
  itemTypes = {},
  fields = [],
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

  const operationFields: OperationInputField[] = fields.map((f, i) => ({
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
    fields: operationFields,
    items: operationItems,
  });

  ctx.items = Object.fromEntries(allItems.map((i) => [i.id, i]));
  ctx.itemTypes = itemTypes;

  return ctx;
}

describe("createItem", () => {
  describe("schema validation", () => {
    it("returns skipped when config is empty", () => {
      const result = createItem.handler(makeCtx(), makeStep({ config: {} }));
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });

    it("returns skipped when itemTypeId is missing", () => {
      const result = createItem.handler(
        makeCtx(),
        makeStep({ config: { count: 1 } }),
      );
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });

    it("returns skipped when itemTypeId is not a string", () => {
      const result = createItem.handler(
        makeCtx(),
        makeStep({ config: { itemTypeId: 42 } }),
      );
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });
  });

  describe("when item type is not found", () => {
    it("returns skipped with descriptive message", () => {
      const result = createItem.handler(
        makeCtx(),
        makeStep({ config: { itemTypeId: "unknown-type" } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Item type not found/);
    });
  });

  describe("when no initial status is defined", () => {
    it("returns skipped", () => {
      const ctx = makeCtx({
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [
              makeStatusDef({ isInitial: false, name: "Active" }),
            ],
          }),
        },
      });

      const result = createItem.handler(
        ctx,
        makeStep({ config: { itemTypeId: "type-1" } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/No initial status defined/);
    });
  });

  describe("single item creation", () => {
    it("creates one item when count is omitted", () => {
      const ctx = makeCtx({
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createItem.handler(
        ctx,
        makeStep({ config: { itemTypeId: "type-1" } }),
      );

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(false);
      expect(result.items.create).toHaveLength(1);
      expect(result.message).toBe("Created 1 item of type Block");
    });

    it("assigns the initial status", () => {
      const ctx = makeCtx({
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [
              makeStatusDef({ id: "status-init", isInitial: true }),
            ],
          }),
        },
      });

      const result = createItem.handler(
        ctx,
        makeStep({ config: { itemTypeId: "type-1" } }),
      );

      expect(result.items.create[0]!.statusId).toBe("status-init");
    });

    it("assigns the correct itemTypeId", () => {
      const ctx = makeCtx({
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createItem.handler(
        ctx,
        makeStep({ config: { itemTypeId: "type-1" } }),
      );

      expect(result.items.create[0]!.itemTypeId).toBe("type-1");
    });

    it("generates a code from the item type prefix", () => {
      const ctx = makeCtx({
        itemTypes: {
          "type-1": makeItemType({
            codePrefix: "BLK",
            codeNextNumber: 1,
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createItem.handler(
        ctx,
        makeStep({ config: { itemTypeId: "type-1" } }),
      );

      expect(result.items.create[0]!.code).toBe("BLK-0001");
    });

    it("generates a code from item type name when prefix is null", () => {
      const ctx = makeCtx({
        itemTypes: {
          "type-1": makeItemType({
            name: "Batch",
            codePrefix: null,
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createItem.handler(
        ctx,
        makeStep({ config: { itemTypeId: "type-1" } }),
      );

      expect(result.items.create[0]!.code).toBe("BAT-0001");
    });

    it("generates a unique id for the created item", () => {
      const ctx = makeCtx({
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createItem.handler(
        ctx,
        makeStep({ config: { itemTypeId: "type-1" } }),
      );

      expect(result.items.create[0]!.code).toBeDefined();
      expect(typeof result.items.create[0]!.code).toBe("string");
      expect(result.items.create[0]!.code.length).toBeGreaterThan(0);
    });
  });

  describe("multiple item creation", () => {
    it("creates the specified number of items", () => {
      const ctx = makeCtx({
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createItem.handler(
        ctx,
        makeStep({ config: { itemTypeId: "type-1", count: 3 } }),
      );

      expect(result.items.create).toHaveLength(3);
      expect(result.message).toBe("Created 3 items of type Block");
    });

    it("generates sequential codes", () => {
      const ctx = makeCtx({
        itemTypes: {
          "type-1": makeItemType({
            codePrefix: "BLK",
            codeNextNumber: 5,
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createItem.handler(
        ctx,
        makeStep({ config: { itemTypeId: "type-1", count: 3 } }),
      );

      const codes = result.items.create.map((i) => i.code);
      expect(codes).toEqual(["BLK-0005", "BLK-0006", "BLK-0007"]);
    });

    it("generates unique ids for each item", () => {
      const ctx = makeCtx({
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createItem.handler(
        ctx,
        makeStep({ config: { itemTypeId: "type-1", count: 3 } }),
      );

      const codes = result.items.create.map((i) => i.code);
      expect(new Set(codes).size).toBe(3);
    });

    it("resolves count from an input field reference", () => {
      const ctx = makeCtx({
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
        fields: [{ key: "block_count", value: 4 }],
      });

      const result = createItem.handler(
        ctx,
        makeStep({
          config: {
            itemTypeId: "type-1",
            count: { from: ["inputs", "block_count"] },
          },
        }),
      );

      expect(result.items.create).toHaveLength(4);
      expect(result.message).toBe("Created 4 items of type Block");
    });
  });

  describe("invalid count", () => {
    it("returns skipped when count is zero", () => {
      const ctx = makeCtx({
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createItem.handler(
        ctx,
        makeStep({ config: { itemTypeId: "type-1", count: 0 } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid count/);
    });

    it("returns skipped when count is negative", () => {
      const ctx = makeCtx({
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createItem.handler(
        ctx,
        makeStep({ config: { itemTypeId: "type-1", count: -1 } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid count/);
    });

    it("returns skipped when count resolves to NaN", () => {
      const ctx = makeCtx({
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
        fields: [{ key: "block_count", value: "not-a-number" }],
      });

      const result = createItem.handler(
        ctx,
        makeStep({
          config: {
            itemTypeId: "type-1",
            count: { from: ["inputs", "block_count"] },
          },
        }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid count/);
    });
  });

  describe("attributes", () => {
    it("sets literal attributes on created items", () => {
      const ctx = makeCtx({
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createItem.handler(
        ctx,
        makeStep({
          config: {
            itemTypeId: "type-1",
            attributes: { species: "oyster", organic: true },
          },
        }),
      );

      expect(result.items.create[0]!.attributes).toEqual({
        species: "oyster",
        organic: true,
      });
    });

    it("resolves attribute values from input field references", () => {
      const ctx = makeCtx({
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
        fields: [{ key: "bag_weight", value: 5.5 }],
      });

      const result = createItem.handler(
        ctx,
        makeStep({
          config: {
            itemTypeId: "type-1",
            attributes: {
              bag_weight_lb: { from: ["inputs", "bag_weight"] },
            },
          },
        }),
      );

      expect(result.items.create[0]!.attributes).toEqual({
        bag_weight_lb: 5.5,
      });
    });

    it("applies the same attributes to all created items", () => {
      const ctx = makeCtx({
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createItem.handler(
        ctx,
        makeStep({
          config: {
            itemTypeId: "type-1",
            count: 3,
            attributes: { variety: "shiitake" },
          },
        }),
      );

      for (const item of result.items.create) {
        expect(item.attributes).toEqual({ variety: "shiitake" });
      }
    });

    it("defaults to empty attributes when none specified", () => {
      const ctx = makeCtx({
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createItem.handler(
        ctx,
        makeStep({ config: { itemTypeId: "type-1" } }),
      );

      expect(result.items.create[0]!.attributes).toEqual({});
    });
  });

  describe("result structure", () => {
    it("returns an ActionResult instance", () => {
      const result = createItem.handler(
        makeCtx(),
        makeStep({ config: { itemTypeId: "type-1" } }),
      );

      expect(result).toBeInstanceOf(ActionResult);
    });

    it("returns empty update and link on success", () => {
      const ctx = makeCtx({
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createItem.handler(
        ctx,
        makeStep({ config: { itemTypeId: "type-1" } }),
      );

      expect(result.items.update).toEqual({});
      expect(result.items.link).toEqual([]);
    });

    it("sets default field values on created items", () => {
      const ctx = makeCtx({
        itemTypes: {
          "type-1": makeItemType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createItem.handler(
        ctx,
        makeStep({ config: { itemTypeId: "type-1" } }),
      );

      const created = result.items.create[0]!;
      expect(created.variantId).toBeNull();
      expect(created.notes).toBeNull();
      expect(created.quantity).toBe("0");
      expect(created.quantityUnit).toBeNull();
      expect(created.value).toBe(0);
      expect(created.valueCurrency).toBeNull();
      expect(created.locationId).toBeNull();
      expect(created.createdBy).toBeNull();
    });
  });
});
