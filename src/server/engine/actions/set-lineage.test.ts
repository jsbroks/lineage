import { describe, it, expect } from "vitest";
import { setLineage } from "./set-lineage";
import { ActionResult } from "./actions";
import { OperationContext } from "../operation-context";
import type { Item } from "~/server/db/schema";

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

function makeStep({ target = null, config = {} }: StepInput = {}) {
  return {
    id: "step-1",
    name: "Set lineage",
    action: "set-lineage",
    target,
    config,
    sortOrder: 0,
  };
}

type CtxInput = {
  items?: Record<string, Item[]>;
};

function makeCtx({ items = {} }: CtxInput = {}): OperationContext {
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

  return ctx;
}

describe("setLineage", () => {
  describe("schema validation", () => {
    it("returns skipped when config is empty", () => {
      const result = setLineage.handler(makeCtx(), makeStep({ config: {} }));
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });

    it("returns skipped when relationship is missing", () => {
      const result = setLineage.handler(
        makeCtx(),
        makeStep({ config: { parent: "batch", children: "blocks" } }),
      );
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });
  });

  describe("when no parent items found", () => {
    it("returns skipped", () => {
      const child = makeItem({ id: "c1" });
      const ctx = makeCtx({ items: { blocks: [child] } });
      const result = setLineage.handler(
        ctx,
        makeStep({
          config: {
            parent: "batch",
            children: "blocks",
            relationship: "batch_member",
          },
        }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/No parent items found/);
    });
  });

  describe("when no child items found", () => {
    it("returns skipped", () => {
      const parent = makeItem({ id: "p1" });
      const ctx = makeCtx({ items: { batch: [parent] } });
      const result = setLineage.handler(
        ctx,
        makeStep({
          config: {
            parent: "batch",
            children: "blocks",
            relationship: "batch_member",
          },
        }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/No child items found/);
    });
  });

  describe("successful lineage creation", () => {
    it("creates a single link for one parent and one child", () => {
      const parent = makeItem({ id: "p1" });
      const child = makeItem({ id: "c1" });
      const ctx = makeCtx({
        items: { batch: [parent], blocks: [child] },
      });

      const result = setLineage.handler(
        ctx,
        makeStep({
          config: {
            parent: "batch",
            children: "blocks",
            relationship: "batch_member",
          },
        }),
      );

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(false);
      expect(result.items.link).toHaveLength(1);
      expect(result.items.link[0]).toMatchObject({
        parentItemId: "p1",
        childItemId: "c1",
        relationship: "batch_member",
        operationId: "op-1",
      });
      expect(result.message).toBe("Created 1 lineage link");
    });

    it("creates links for one parent and multiple children", () => {
      const parent = makeItem({ id: "p1" });
      const children = [
        makeItem({ id: "c1" }),
        makeItem({ id: "c2" }),
        makeItem({ id: "c3" }),
      ];
      const ctx = makeCtx({
        items: { batch: [parent], blocks: children },
      });

      const result = setLineage.handler(
        ctx,
        makeStep({
          config: {
            parent: "batch",
            children: "blocks",
            relationship: "batch_member",
          },
        }),
      );

      expect(result.items.link).toHaveLength(3);
      expect(result.items.link.map((l) => l.childItemId)).toEqual([
        "c1",
        "c2",
        "c3",
      ]);
      expect(result.message).toBe("Created 3 lineage links");
    });

    it("creates cross-product links for multiple parents and children", () => {
      const parents = [makeItem({ id: "p1" }), makeItem({ id: "p2" })];
      const children = [makeItem({ id: "c1" }), makeItem({ id: "c2" })];
      const ctx = makeCtx({
        items: { batch: parents, blocks: children },
      });

      const result = setLineage.handler(
        ctx,
        makeStep({
          config: {
            parent: "batch",
            children: "blocks",
            relationship: "derived_from",
          },
        }),
      );

      expect(result.items.link).toHaveLength(4);
      expect(result.message).toBe("Created 4 lineage links");
    });

    it("sets the operationId on all links", () => {
      const parent = makeItem({ id: "p1" });
      const child = makeItem({ id: "c1" });
      const ctx = makeCtx({
        items: { batch: [parent], blocks: [child] },
      });

      const result = setLineage.handler(
        ctx,
        makeStep({
          config: {
            parent: "batch",
            children: "blocks",
            relationship: "test",
          },
        }),
      );

      for (const link of result.items.link) {
        expect(link.operationId).toBe("op-1");
      }
    });
  });

  describe("result structure", () => {
    it("returns an ActionResult instance", () => {
      const result = setLineage.handler(
        makeCtx(),
        makeStep({
          config: {
            parent: "batch",
            children: "blocks",
            relationship: "x",
          },
        }),
      );
      expect(result).toBeInstanceOf(ActionResult);
    });

    it("returns empty create and update on success", () => {
      const parent = makeItem({ id: "p1" });
      const child = makeItem({ id: "c1" });
      const ctx = makeCtx({
        items: { batch: [parent], blocks: [child] },
      });

      const result = setLineage.handler(
        ctx,
        makeStep({
          config: {
            parent: "batch",
            children: "blocks",
            relationship: "x",
          },
        }),
      );

      expect(result.items.create).toEqual([]);
      expect(result.items.update).toEqual({});
    });
  });
});
