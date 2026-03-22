import { describe, it, expect } from "vitest";
import { createLot } from "./create-lot";
import { ActionResult } from "./actions";
import {
  OperationContext,
  type LotTypeWithStatusDefinitions,
} from "../operation-context";
import type {
  Lot,
  LotType,
  LotTypeStatusDefinition,
  OperationInputValue,
} from "~/server/db/schema";

function makeStatusDef(
  overrides: Partial<LotTypeStatusDefinition> = {},
): LotTypeStatusDefinition {
  return {
    id: "status-created",
    lotTypeId: "type-1",
    name: "Created",
    color: null,
    category: "unstarted",
    ordinal: 0,
    ...overrides,
  };
}

function makeLotType(
  overrides: Partial<LotType> & {
    statusDefinitions?: LotTypeStatusDefinition[];
  } = {},
): LotTypeWithStatusDefinitions {
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
    name: "Create lot",
    action: "create-lot",
    target,
    config,
    sortOrder: 0,
  };
}

type CtxInput = {
  lots?: Record<string, Lot[]>;
  lotTypes?: Record<string, LotTypeWithStatusDefinitions>;
  fields?: { key: string; value: unknown }[];
};

function makeCtx({
  lots = {},
  lotTypes = {},
  fields = [],
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
    inputLots: operationLots,
    inputLocations: [],
    inputValues: operationValues,
  });

  ctx.lots = Object.fromEntries(allLots.map((i) => [i.id, i]));
  ctx.lotTypes = lotTypes;

  return ctx;
}

describe("createLot", () => {
  describe("schema validation", () => {
    it("returns skipped when config is empty", () => {
      const result = createLot.handler(makeCtx(), makeStep({ config: {} }));
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });

    it("returns skipped when lotTypeId is missing", () => {
      const result = createLot.handler(
        makeCtx(),
        makeStep({ config: { count: 1 } }),
      );
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });

    it("returns skipped when lotTypeId is not a string", () => {
      const result = createLot.handler(
        makeCtx(),
        makeStep({ config: { lotTypeId: 42 } }),
      );
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid config/);
    });
  });

  describe("when lot type is not found", () => {
    it("returns skipped with descriptive message", () => {
      const result = createLot.handler(
        makeCtx(),
        makeStep({ config: { lotTypeId: "unknown-type" } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Lot type not found/);
    });
  });

  describe("when no initial status is defined", () => {
    it("returns skipped", () => {
      const ctx = makeCtx({
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [
              makeStatusDef({ category: "in_progress", name: "Active" }),
            ],
          }),
        },
      });

      const result = createLot.handler(
        ctx,
        makeStep({ config: { lotTypeId: "type-1" } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/No initial status defined/);
    });
  });

  describe("single lot creation", () => {
    it("creates one lot when count is omitted", () => {
      const ctx = makeCtx({
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createLot.handler(
        ctx,
        makeStep({ config: { lotTypeId: "type-1" } }),
      );

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(false);
      expect(result.lots.create).toHaveLength(1);
      expect(result.message).toBe("Created 1 lot of type Block");
    });

    it("assigns the initial status", () => {
      const ctx = makeCtx({
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [
              makeStatusDef({ id: "status-init", category: "unstarted" }),
            ],
          }),
        },
      });

      const result = createLot.handler(
        ctx,
        makeStep({ config: { lotTypeId: "type-1" } }),
      );

      expect(result.lots.create[0]!.statusId).toBe("status-init");
    });

    it("assigns the correct lotTypeId", () => {
      const ctx = makeCtx({
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createLot.handler(
        ctx,
        makeStep({ config: { lotTypeId: "type-1" } }),
      );

      expect(result.lots.create[0]!.lotTypeId).toBe("type-1");
    });

    it("generates a code from the lot type prefix", () => {
      const ctx = makeCtx({
        lotTypes: {
          "type-1": makeLotType({
            codePrefix: "BLK",
            codeNextNumber: 1,
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createLot.handler(
        ctx,
        makeStep({ config: { lotTypeId: "type-1" } }),
      );

      expect(result.lots.create[0]!.code).toBe("BLK-0001");
    });

    it("generates a code from lot type name when prefix is null", () => {
      const ctx = makeCtx({
        lotTypes: {
          "type-1": makeLotType({
            name: "Batch",
            codePrefix: null,
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createLot.handler(
        ctx,
        makeStep({ config: { lotTypeId: "type-1" } }),
      );

      expect(result.lots.create[0]!.code).toBe("BAT-0001");
    });

    it("generates a unique id for the created lot", () => {
      const ctx = makeCtx({
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createLot.handler(
        ctx,
        makeStep({ config: { lotTypeId: "type-1" } }),
      );

      expect(result.lots.create[0]!.code).toBeDefined();
      expect(typeof result.lots.create[0]!.code).toBe("string");
      expect(result.lots.create[0]!.code.length).toBeGreaterThan(0);
    });
  });

  describe("multiple lot creation", () => {
    it("creates the specified number of lots", () => {
      const ctx = makeCtx({
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createLot.handler(
        ctx,
        makeStep({ config: { lotTypeId: "type-1", count: 3 } }),
      );

      expect(result.lots.create).toHaveLength(3);
      expect(result.message).toBe("Created 3 lots of type Block");
    });

    it("generates sequential codes", () => {
      const ctx = makeCtx({
        lotTypes: {
          "type-1": makeLotType({
            codePrefix: "BLK",
            codeNextNumber: 5,
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createLot.handler(
        ctx,
        makeStep({ config: { lotTypeId: "type-1", count: 3 } }),
      );

      const codes = result.lots.create.map((i) => i.code);
      expect(codes).toEqual(["BLK-0005", "BLK-0006", "BLK-0007"]);
    });

    it("generates unique ids for each lot", () => {
      const ctx = makeCtx({
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createLot.handler(
        ctx,
        makeStep({ config: { lotTypeId: "type-1", count: 3 } }),
      );

      const codes = result.lots.create.map((i) => i.code);
      expect(new Set(codes).size).toBe(3);
    });

    it("resolves count from an input field reference", () => {
      const ctx = makeCtx({
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
        fields: [{ key: "block_count", value: 4 }],
      });

      const result = createLot.handler(
        ctx,
        makeStep({
          config: {
            lotTypeId: "type-1",
            count: { from: ["inputs", "block_count"] },
          },
        }),
      );

      expect(result.lots.create).toHaveLength(4);
      expect(result.message).toBe("Created 4 lots of type Block");
    });
  });

  describe("invalid count", () => {
    it("returns skipped when count is zero", () => {
      const ctx = makeCtx({
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createLot.handler(
        ctx,
        makeStep({ config: { lotTypeId: "type-1", count: 0 } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid count/);
    });

    it("returns skipped when count is negative", () => {
      const ctx = makeCtx({
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createLot.handler(
        ctx,
        makeStep({ config: { lotTypeId: "type-1", count: -1 } }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid count/);
    });

    it("returns skipped when count resolves to NaN", () => {
      const ctx = makeCtx({
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
        fields: [{ key: "block_count", value: "not-a-number" }],
      });

      const result = createLot.handler(
        ctx,
        makeStep({
          config: {
            lotTypeId: "type-1",
            count: { from: ["inputs", "block_count"] },
          },
        }),
      );

      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/Invalid count/);
    });
  });

  describe("attributes", () => {
    it("sets literal attributes on created lots", () => {
      const ctx = makeCtx({
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createLot.handler(
        ctx,
        makeStep({
          config: {
            lotTypeId: "type-1",
            attributes: { species: "oyster", organic: true },
          },
        }),
      );

      expect(result.lots.create[0]!.attributes).toEqual({
        species: "oyster",
        organic: true,
      });
    });

    it("resolves attribute values from input field references", () => {
      const ctx = makeCtx({
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
        fields: [{ key: "bag_weight", value: 5.5 }],
      });

      const result = createLot.handler(
        ctx,
        makeStep({
          config: {
            lotTypeId: "type-1",
            attributes: {
              bag_weight_lb: { from: ["inputs", "bag_weight"] },
            },
          },
        }),
      );

      expect(result.lots.create[0]!.attributes).toEqual({
        bag_weight_lb: 5.5,
      });
    });

    it("applies the same attributes to all created lots", () => {
      const ctx = makeCtx({
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createLot.handler(
        ctx,
        makeStep({
          config: {
            lotTypeId: "type-1",
            count: 3,
            attributes: { variety: "shiitake" },
          },
        }),
      );

      for (const lot of result.lots.create) {
        expect(lot.attributes).toEqual({ variety: "shiitake" });
      }
    });

    it("defaults to empty attributes when none specified", () => {
      const ctx = makeCtx({
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createLot.handler(
        ctx,
        makeStep({ config: { lotTypeId: "type-1" } }),
      );

      expect(result.lots.create[0]!.attributes).toEqual({});
    });
  });

  describe("result structure", () => {
    it("returns an ActionResult instance", () => {
      const result = createLot.handler(
        makeCtx(),
        makeStep({ config: { lotTypeId: "type-1" } }),
      );

      expect(result).toBeInstanceOf(ActionResult);
    });

    it("returns empty update and link on success", () => {
      const ctx = makeCtx({
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createLot.handler(
        ctx,
        makeStep({ config: { lotTypeId: "type-1" } }),
      );

      expect(result.lots.update).toEqual({});
      expect(result.lots.link).toEqual([]);
    });

    it("sets default field values on created lots", () => {
      const ctx = makeCtx({
        lotTypes: {
          "type-1": makeLotType({
            statusDefinitions: [makeStatusDef()],
          }),
        },
      });

      const result = createLot.handler(
        ctx,
        makeStep({ config: { lotTypeId: "type-1" } }),
      );

      const created = result.lots.create[0]!;
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
