import { describe, it, expect } from "vitest";
import { setLotStatus } from "./set-lot-status";
import { ActionResult } from "./actions";
import {
  OperationContext,
  type LotTypeWithStatusDefinitions,
} from "../operation-context";
import type { Lot, LotType, LotTypeStatusDefinition } from "~/server/db/schema";

function makeLot(overrides: Partial<Lot> = {}): Lot {
  return {
    id: "lot-1",
    lotTypeId: "type-1",
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
  } as Lot;
}

function makeStatusDef(
  overrides: Partial<LotTypeStatusDefinition> = {},
): LotTypeStatusDefinition {
  return {
    id: "status-approved",
    lotTypeId: "type-1",
    name: "Approved",
    color: null,
    category: "in_progress",
    ordinal: 0,
    ...overrides,
  };
}

function makeLotType(
  overrides: Partial<LotType> & {
    statusDefinitions?: LotTypeStatusDefinition[];
  } = {},
): LotType & { statusDefinitions: LotTypeStatusDefinition[] } {
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
    action: "set-lot-status",
    target,
    config,
    sortOrder: 0,
  };
}

type CtxInput = {
  lots?: Record<string, Lot[]>;
  lotTypes?: Record<string, LotTypeWithStatusDefinitions>;
};

function makeCtx({
  lots = {},
  lotTypes = {},
}: CtxInput = {}): OperationContext {
  const allLots: Lot[] = Object.values(lots).flat();

  const operationLots = Object.entries(lots).flatMap(([key, list]) =>
    list.map((lot) => ({
      id: `oi-${lot.id}`,
      key,
      operationId: "op-1",
      lotId: lot.id,
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
    inputLots: operationLots,
    inputLocations: [],
    inputValues: [],
  });

  ctx.lots = Object.fromEntries(allLots.map((i) => [i.id, i]));
  ctx.lotTypes = lotTypes;

  return ctx;
}

describe("setLotStatus", () => {
  describe("schema validation", () => {
    it("returns skipped when config has no status field", () => {
      const result = setLotStatus.handler(makeCtx(), makeStep({ config: {} }));
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });

    it("returns skipped when status is not a string", () => {
      const result = setLotStatus.handler(
        makeCtx(),
        makeStep({ config: { status: 123 } }),
      );
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });
  });

  describe("when no lots match target", () => {
    it("returns skipped with descriptive message", () => {
      const result = setLotStatus.handler(
        makeCtx(),
        makeStep({ config: { status: "Approved" } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/No lots found for target/);
    });
  });

  describe("when lot type is not found", () => {
    it("returns skipped when lot has unknown lotTypeId", () => {
      const lot = makeLot({ id: "a", lotTypeId: "unknown-type" });
      const ctx = makeCtx({ lots: { source: [lot] } });
      const result = setLotStatus.handler(
        ctx,
        makeStep({ config: { status: "Approved" } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Lot type not found/);
    });
  });

  describe("when status definition is not found", () => {
    it("returns skipped when status name does not exist on lot type", () => {
      const lot = makeLot({ id: "a", lotTypeId: "type-1" });
      const ctx = makeCtx({
        lots: { source: [lot] },
        lotTypes: {
          "type-1": makeLotType({ statusDefinitions: [] }),
        },
      });
      const result = setLotStatus.handler(
        ctx,
        makeStep({ config: { status: "NonExistent" } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Status definition not found/);
    });
  });

  describe("successful status updates", () => {
    it("sets statusId on a single lot", () => {
      const lot = makeLot({ id: "a", lotTypeId: "type-1" });
      const ctx = makeCtx({
        lots: { source: [lot] },
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [
              makeStatusDef({ id: "status-approved", name: "Approved" }),
            ],
          }),
        },
      });

      const result = setLotStatus.handler(
        ctx,
        makeStep({ config: { status: "Approved" } }),
      );

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(false);
      expect(result.lots.update).toEqual({
        a: { statusId: "status-approved" },
      });
      expect(result.message).toBe("Set status for 1 lot");
    });

    it("sets statusId on multiple lots", () => {
      const lots = [
        makeLot({ id: "a", lotTypeId: "type-1" }),
        makeLot({ id: "b", lotTypeId: "type-1" }),
        makeLot({ id: "c", lotTypeId: "type-1" }),
      ];
      const ctx = makeCtx({
        lots: { source: lots },
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [
              makeStatusDef({ id: "status-packed", name: "Packed" }),
            ],
          }),
        },
      });

      const result = setLotStatus.handler(
        ctx,
        makeStep({ config: { status: "Packed" } }),
      );

      expect(result.success).toBe(true);
      expect(result.lots.update).toEqual({
        a: { statusId: "status-packed" },
        b: { statusId: "status-packed" },
        c: { statusId: "status-packed" },
      });
      expect(result.message).toBe("Set status for 3 lots");
    });

    it("uses singular 'lot' for exactly one lot", () => {
      const lot = makeLot({ id: "x", lotTypeId: "type-1" });
      const ctx = makeCtx({
        lots: { source: [lot] },
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [makeStatusDef({ id: "s1", name: "Active" })],
          }),
        },
      });

      const result = setLotStatus.handler(
        ctx,
        makeStep({ config: { status: "Active" } }),
      );

      expect(result.message).toBe("Set status for 1 lot");
    });

    it("uses plural 'lots' for more than one lot", () => {
      const lots = [
        makeLot({ id: "a", lotTypeId: "type-1" }),
        makeLot({ id: "b", lotTypeId: "type-1" }),
      ];
      const ctx = makeCtx({
        lots: { source: lots },
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [makeStatusDef({ id: "s1", name: "Done" })],
          }),
        },
      });

      const result = setLotStatus.handler(
        ctx,
        makeStep({ config: { status: "Done" } }),
      );

      expect(result.message).toBe("Set status for 2 lots");
    });
  });

  describe("lots with different lot types", () => {
    it("resolves status from each lot's own lot type", () => {
      const lots = [
        makeLot({ id: "a", lotTypeId: "type-1" }),
        makeLot({ id: "b", lotTypeId: "type-2" }),
      ];
      const ctx = makeCtx({
        lots: { source: lots },
        lotTypes: {
          "type-1": makeLotType({
            id: "type-1",
            statusDefinitions: [
              makeStatusDef({ id: "s1-ready", name: "Ready" }),
            ],
          }),
          "type-2": makeLotType({
            id: "type-2",
            statusDefinitions: [
              makeStatusDef({
                id: "s2-ready",
                lotTypeId: "type-2",
                name: "Ready",
              }),
            ],
          }),
        },
      });

      const result = setLotStatus.handler(
        ctx,
        makeStep({ config: { status: "Ready" } }),
      );

      expect(result.success).toBe(true);
      expect(result.lots.update).toEqual({
        a: { statusId: "s1-ready" },
        b: { statusId: "s2-ready" },
      });
    });

    it("returns skipped if second lot's type is missing", () => {
      const lots = [
        makeLot({ id: "a", lotTypeId: "type-1" }),
        makeLot({ id: "b", lotTypeId: "type-missing" }),
      ];
      const ctx = makeCtx({
        lots: { source: lots },
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [makeStatusDef({ id: "s1", name: "Approved" })],
          }),
        },
      });

      const result = setLotStatus.handler(
        ctx,
        makeStep({ config: { status: "Approved" } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Lot type not found/);
    });

    it("returns skipped if second lot's type lacks the status", () => {
      const lots = [
        makeLot({ id: "a", lotTypeId: "type-1" }),
        makeLot({ id: "b", lotTypeId: "type-2" }),
      ];
      const ctx = makeCtx({
        lots: { source: lots },
        lotTypes: {
          "type-1": makeLotType({
            id: "type-1",
            statusDefinitions: [makeStatusDef({ id: "s1", name: "Approved" })],
          }),
          "type-2": makeLotType({
            id: "type-2",
            statusDefinitions: [],
          }),
        },
      });

      const result = setLotStatus.handler(
        ctx,
        makeStep({ config: { status: "Approved" } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Status definition not found/);
    });
  });

  describe("result structure", () => {
    it("returns empty create and link arrays on success", () => {
      const lot = makeLot({ id: "a", lotTypeId: "type-1" });
      const ctx = makeCtx({
        lots: { source: [lot] },
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [makeStatusDef({ id: "s1", name: "Active" })],
          }),
        },
      });

      const result = setLotStatus.handler(
        ctx,
        makeStep({ config: { status: "Active" } }),
      );

      expect(result.lots.create).toEqual([]);
      expect(result.lots.link).toEqual([]);
    });

    it("returns an ActionResult instance", () => {
      const result = setLotStatus.handler(
        makeCtx(),
        makeStep({ config: { status: "Approved" } }),
      );

      expect(result).toBeInstanceOf(ActionResult);
    });
  });
});

describe("ActionResult.updateLot", () => {
  it("merges new changes into pre-existing update values", () => {
    const result = new ActionResult();
    result.updateLot("a", { attributes: { color: "red" } } as any);
    result.updateLot("a", { statusId: "status-approved" } as any);

    expect(result.lots.update["a"]).toEqual({
      attributes: { color: "red" },
      statusId: "status-approved",
    });
  });

  it("does not overwrite existing fields when adding new ones", () => {
    const result = new ActionResult();
    result.updateLot("a", { notes: "original note" } as any);
    result.updateLot("a", { statusId: "status-1" } as any);

    expect(result.lots.update["a"]).toEqual({
      notes: "original note",
      statusId: "status-1",
    });
  });

  it("overwrites the same field with the latest value", () => {
    const result = new ActionResult();
    result.updateLot("a", { statusId: "status-old" } as any);
    result.updateLot("a", { statusId: "status-new" } as any);

    expect(result.lots.update["a"]).toEqual({
      statusId: "status-new",
    });
  });

  it("keeps updates for different lots independent", () => {
    const result = new ActionResult();
    result.updateLot("a", { statusId: "s1" } as any);
    result.updateLot("b", { notes: "hello" } as any);

    expect(result.lots.update["a"]).toEqual({ statusId: "s1" });
    expect(result.lots.update["b"]).toEqual({ notes: "hello" });
  });
});
