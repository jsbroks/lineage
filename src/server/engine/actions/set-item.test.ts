import { describe, it, expect } from "vitest";
import { setItem, resolveValue } from "./set-item";
import type { ExecCtx, Item, Tx } from "../types";
import type {
  ItemType,
  ItemTypeStatusDefinition,
  OperationTypeStep,
} from "~/server/db/schema";

const fakeTx = {} as Tx;

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

function makeStep(
  overrides: Partial<OperationTypeStep> = {},
): OperationTypeStep {
  return {
    id: "step-1",
    operationTypeId: "op-type-1",
    name: "Set item",
    action: "set-item",
    target: "source",
    value: {},
    sortOrder: 0,
    ...overrides,
  };
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

function makeCtx(overrides: Partial<ExecCtx> = {}): ExecCtx {
  return {
    items: {},
    inputs: {},
    itemTypes: new Map(),
    itemsCreated: [],
    itemsUpdated: new Set(),
    lineageCreated: 0,
    operationId: "op-1",
    ...overrides,
  };
}

// ── resolveValue ─────────────────────────────────────────────────────

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

// ── setItem ──────────────────────────────────────────────────────────

describe("setItem", () => {
  it("returns error for invalid config", async () => {
    const result = await setItem(
      fakeTx,
      makeStep(),
      "not-an-object" as any,
      makeCtx(),
    );
    expect(result).toMatch(/Invalid config/);
  });

  it("returns error when target is null and no items match", async () => {
    const result = await setItem(
      fakeTx,
      makeStep({ target: null }),
      { status: "Approved" },
      makeCtx(),
    );
    expect(result).toBe("No item type specified for updating");
  });

  it("returns error when target port has no items", async () => {
    const result = await setItem(
      fakeTx,
      makeStep({ target: "source" }),
      { status: "Approved" },
      makeCtx({ items: {} }),
    );
    expect(result).toMatch(/Unknown able to update items type/);
  });

  describe("status updates", () => {
    it("updates status on all target items", async () => {
      const items = [
        makeItem({ id: "a", statusId: "status-1" }),
        makeItem({ id: "b", statusId: "status-1" }),
      ];
      const ctx = makeCtx({
        items: { source: items },
        itemTypes: new Map([
          [
            "type-1",
            makeItemType({
              statusDefinitions: [
                makeStatusDef({ id: "status-approved", name: "Approved" }),
              ],
            }),
          ],
        ]),
      });

      const result = await setItem(
        fakeTx,
        makeStep({ target: "source" }),
        { status: "Approved" },
        ctx,
      );

      expect(result).toBe("2 items updated.");
      expect(items[0]!.statusId).toBe("status-approved");
      expect(items[1]!.statusId).toBe("status-approved");
      expect(ctx.itemsUpdated).toEqual(new Set(["a", "b"]));
    });

    it("throws when status name is not found in item type", async () => {
      const ctx = makeCtx({
        items: { source: [makeItem()] },
        itemTypes: new Map([
          ["type-1", makeItemType({ statusDefinitions: [] })],
        ]),
      });

      await expect(
        setItem(
          fakeTx,
          makeStep({ target: "source" }),
          { status: "NonExistent" },
          ctx,
        ),
      ).rejects.toThrow('Status "NonExistent" not found for item type');
    });

    it("resolves status from a from-ref", async () => {
      const items = [makeItem({ id: "a" })];
      const ctx = makeCtx({
        items: { source: items },
        inputs: { desiredStatus: "Approved" },
        itemTypes: new Map([
          [
            "type-1",
            makeItemType({
              statusDefinitions: [
                makeStatusDef({ id: "status-approved", name: "Approved" }),
              ],
            }),
          ],
        ]),
      });

      const result = await setItem(
        fakeTx,
        makeStep({ target: "source" }),
        { status: { from: ["desiredStatus"] } },
        ctx,
      );

      expect(result).toBe("1 items updated.");
      expect(items[0]!.statusId).toBe("status-approved");
    });

    it("reports no items updated when status is null", async () => {
      const ctx = makeCtx({
        items: { source: [makeItem()] },
      });

      const result = await setItem(
        fakeTx,
        makeStep({ target: "source" }),
        { status: null },
        ctx,
      );

      expect(result).toBe("No items updated.");
    });
  });

  describe("attribute updates", () => {
    it("applies literal attribute values", async () => {
      const items = [makeItem({ id: "a" })];
      const ctx = makeCtx({
        items: { source: items },
      });

      const result = await setItem(
        fakeTx,
        makeStep({ target: "source" }),
        { attributes: { color: "red", weight: 50 } },
        ctx,
      );

      expect(result).toBe("1 items updated.");
    });

    it("reports no items updated when attributes is null", async () => {
      const ctx = makeCtx({
        items: { source: [makeItem()] },
      });

      const result = await setItem(
        fakeTx,
        makeStep({ target: "source" }),
        { attributes: null },
        ctx,
      );

      expect(result).toBe("No items updated.");
    });

    it("reports no items updated with empty config", async () => {
      const ctx = makeCtx({
        items: { source: [makeItem()] },
      });

      const result = await setItem(
        fakeTx,
        makeStep({ target: "source" }),
        {},
        ctx,
      );

      expect(result).toBe("No items updated.");
    });
  });

  describe("combined status + attributes", () => {
    it("updates both status and attributes in one call", async () => {
      const items = [makeItem({ id: "a" })];
      const ctx = makeCtx({
        items: { source: items },
        itemTypes: new Map([
          [
            "type-1",
            makeItemType({
              statusDefinitions: [
                makeStatusDef({ id: "status-approved", name: "Approved" }),
              ],
            }),
          ],
        ]),
      });

      const result = await setItem(
        fakeTx,
        makeStep({ target: "source" }),
        { status: "Approved", attributes: { grade: "A" } },
        ctx,
      );

      expect(result).toBe("1 items updated.");
      expect(items[0]!.statusId).toBe("status-approved");
      expect(ctx.itemsUpdated.has("a")).toBe(true);
    });
  });
});
