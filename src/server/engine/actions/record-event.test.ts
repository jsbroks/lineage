import { describe, it, expect } from "vitest";
import { recordEvent } from "./record-event";
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
    name: "Record event",
    action: "record-event",
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

describe("recordEvent", () => {
  describe("schema validation", () => {
    it("returns skipped when config is empty", () => {
      const result = recordEvent.handler(makeCtx(), makeStep({ config: {} }));
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });

    it("returns skipped when eventType is missing", () => {
      const result = recordEvent.handler(
        makeCtx(),
        makeStep({ config: { message: "hello" } }),
      );
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });
  });

  describe("when no items match target", () => {
    it("returns skipped", () => {
      const result = recordEvent.handler(
        makeCtx(),
        makeStep({ config: { eventType: "observation" } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/No items found for target/);
    });
  });

  describe("successful event recording", () => {
    it("records an event for a single item", () => {
      const item = makeItem({ id: "a" });
      const ctx = makeCtx({ items: { source: [item] } });

      const result = recordEvent.handler(
        ctx,
        makeStep({ config: { eventType: "observation" } }),
      );

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(false);
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toMatchObject({
        itemId: "a",
        eventType: "observation",
      });
      expect(result.message).toBe("Recorded 1 event");
    });

    it("records events for multiple items", () => {
      const items = [
        makeItem({ id: "a" }),
        makeItem({ id: "b" }),
        makeItem({ id: "c" }),
      ];
      const ctx = makeCtx({ items: { source: items } });

      const result = recordEvent.handler(
        ctx,
        makeStep({ config: { eventType: "harvest" } }),
      );

      expect(result.events).toHaveLength(3);
      expect(result.events.map((e) => e.itemId)).toEqual(["a", "b", "c"]);
      expect(result.message).toBe("Recorded 3 events");
    });

    it("includes a literal message", () => {
      const item = makeItem({ id: "a" });
      const ctx = makeCtx({ items: { source: [item] } });

      const result = recordEvent.handler(
        ctx,
        makeStep({
          config: { eventType: "observation", message: "Looking good" },
        }),
      );

      expect(result.events[0]!.message).toBe("Looking good");
    });

    it("resolves message from an input field reference", () => {
      const item = makeItem({ id: "a" });
      const ctx = makeCtx({
        items: { source: [item] },
        fields: [{ key: "note", value: "Contamination spotted" }],
      });

      const result = recordEvent.handler(
        ctx,
        makeStep({
          config: {
            eventType: "observation",
            message: { from: ["inputs", "note"] },
          },
        }),
      );

      expect(result.events[0]!.message).toBe("Contamination spotted");
    });

    it("includes literal payload", () => {
      const item = makeItem({ id: "a" });
      const ctx = makeCtx({ items: { source: [item] } });

      const result = recordEvent.handler(
        ctx,
        makeStep({
          config: {
            eventType: "harvest",
            payload: { weight_lb: 2.5, grade: "A" },
          },
        }),
      );

      expect(result.events[0]!.payload).toEqual({
        weight_lb: 2.5,
        grade: "A",
      });
    });

    it("resolves payload values from input field references", () => {
      const item = makeItem({ id: "a" });
      const ctx = makeCtx({
        items: { source: [item] },
        fields: [{ key: "weight", value: 3.2 }],
      });

      const result = recordEvent.handler(
        ctx,
        makeStep({
          config: {
            eventType: "harvest",
            payload: { weight_lb: { from: ["inputs", "weight"] } },
          },
        }),
      );

      expect(result.events[0]!.payload).toEqual({ weight_lb: 3.2 });
    });

    it("omits payload when none provided", () => {
      const item = makeItem({ id: "a" });
      const ctx = makeCtx({ items: { source: [item] } });

      const result = recordEvent.handler(
        ctx,
        makeStep({ config: { eventType: "observation" } }),
      );

      expect(result.events[0]!.payload).toBeUndefined();
    });
  });

  describe("result structure", () => {
    it("returns an ActionResult instance", () => {
      const result = recordEvent.handler(
        makeCtx(),
        makeStep({ config: { eventType: "x" } }),
      );
      expect(result).toBeInstanceOf(ActionResult);
    });

    it("does not produce item changes", () => {
      const item = makeItem({ id: "a" });
      const ctx = makeCtx({ items: { source: [item] } });

      const result = recordEvent.handler(
        ctx,
        makeStep({ config: { eventType: "observation" } }),
      );

      expect(result.items.create).toEqual([]);
      expect(result.items.update).toEqual({});
      expect(result.items.link).toEqual([]);
    });
  });
});
