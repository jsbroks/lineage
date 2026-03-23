import { describe, it, expect, vi } from "vitest";
import { execute } from "./operation-execute";
import { ActionRegistry, ActionResult, combineLotOps } from "./actions/actions";
import {
  OperationContext,
  type Operation,
  type LotTypeWithStatusDefinitions,
} from "./operation-context";
import type {
  Lot,
  OperationStep,
  OperationInputLot,
  LotTypeStatusDefinition,
} from "~/server/db/schema";
import { registry as actionsRegistry } from "./actions/index";

function makeStep(overrides: Partial<OperationStep> = {}): OperationStep {
  return {
    id: "step-1",
    operationId: "op-1",
    name: "Test step",
    action: "test-action",
    target: null,
    config: {},
    sortOrder: 0,
    success: true,
    skipped: false,
    message: null,
    details: {},
    ...overrides,
  };
}

function makeCtx(steps: OperationStep[] = []): OperationContext {
  const op: Operation = {
    id: "op-1",
    orgId: "org-1",
    operationTypeId: "op-type-1",
    status: "completed",
    startedAt: null,
    completedAt: new Date("2025-01-01"),
    performedBy: null,
    locationId: null,
    notes: null,
    attributes: {},
    createdAt: new Date("2025-01-01"),
    steps,
    inputLots: [],
    inputLocations: [],
    inputValues: [],
  };
  return new OperationContext(op);
}

describe("execute", () => {
  it("returns an empty array when there are no steps", () => {
    const results = execute(makeCtx(), new ActionRegistry());
    expect(results).toEqual([]);
  });

  it("marks unknown actions as skipped and failed", () => {
    const step = makeStep({ action: "nonexistent" });
    const results = execute(makeCtx([step]), new ActionRegistry());

    expect(results).toHaveLength(1);
    expect(results[0]!.step).toBe(step);
    expect(results[0]!.result.success).toBe(false);
    expect(results[0]!.result.skipped).toBe(true);
    expect(results[0]!.result.message).toBe("Unknown action: nonexistent");
  });

  it("invokes a registered handler and returns its result", () => {
    const step = makeStep({ action: "my-action" });
    const expectedResult = new ActionResult();
    expectedResult.message = "did something";

    const handler = vi.fn().mockReturnValue(expectedResult);
    const registry = new ActionRegistry().register({
      id: "my-action",
      name: "My action",
      description: "",
      schema: {} as any,
      handler,
    });

    const results = execute(makeCtx([step]), registry);

    expect(results).toHaveLength(1);
    expect(results[0]!.result).toBe(expectedResult);
    expect(results[0]!.step).toBe(step);
  });

  it("passes context and step to the handler", () => {
    const step = makeStep({ action: "my-action" });
    const handler = vi.fn().mockReturnValue(new ActionResult());
    const registry = new ActionRegistry().register({
      id: "my-action",
      name: "My action",
      description: "",
      schema: {} as any,
      handler,
    });

    const ctx = makeCtx([step]);
    execute(ctx, registry);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(ctx, step);
  });

  it("processes multiple steps in order", () => {
    const step1 = makeStep({ id: "s1", action: "a", sortOrder: 0 });
    const step2 = makeStep({ id: "s2", action: "b", sortOrder: 1 });

    const resultA = new ActionResult();
    resultA.message = "A";
    const resultB = new ActionResult();
    resultB.message = "B";

    const registry = new ActionRegistry()
      .register({
        id: "a",
        name: "A",
        description: "",
        schema: {} as any,
        handler: () => resultA,
      })
      .register({
        id: "b",
        name: "B",
        description: "",
        schema: {} as any,
        handler: () => resultB,
      });

    const results = execute(makeCtx([step1, step2]), registry);

    expect(results).toHaveLength(2);
    expect(results[0]!.result.message).toBe("A");
    expect(results[0]!.step.id).toBe("s1");
    expect(results[1]!.result.message).toBe("B");
    expect(results[1]!.step.id).toBe("s2");
  });

  it("continues processing after an unknown action", () => {
    const step1 = makeStep({ id: "s1", action: "missing", sortOrder: 0 });
    const step2 = makeStep({ id: "s2", action: "valid", sortOrder: 1 });

    const validResult = new ActionResult();
    validResult.message = "ok";

    const registry = new ActionRegistry().register({
      id: "valid",
      name: "Valid",
      description: "",
      schema: {} as any,
      handler: () => validResult,
    });

    const results = execute(makeCtx([step1, step2]), registry);

    expect(results).toHaveLength(2);
    expect(results[0]!.result.skipped).toBe(true);
    expect(results[0]!.result.message).toBe("Unknown action: missing");
    expect(results[1]!.result.message).toBe("ok");
    expect(results[1]!.result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Integration tests with the real action registry
// ---------------------------------------------------------------------------

function makeLot(overrides: Partial<Lot> = {}): Lot {
  return {
    id: "lot-1",
    orgId: "org-1",
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
    id: "status-1",
    lotTypeId: "type-1",
    name: "Active",
    color: null,
    category: "in_progress",
    ordinal: 0,
    ...overrides,
  };
}

function makeLotType(
  overrides: Partial<LotTypeWithStatusDefinitions> = {},
): LotTypeWithStatusDefinitions {
  return {
    id: "type-1",
    orgId: "org-1",
    name: "Block",
    description: null,
    category: "raw",
    quantityName: null,
    quantityDefaultUnit: "each",
    icon: null,
    color: null,
    codePrefix: "BLK",
    codeNextNumber: 1,
    statusDefinitions: [],
    ...overrides,
  };
}

function makeRealCtx({
  steps,
  lots = {},
  lotTypes = {},
  fields = [],
}: {
  steps: OperationStep[];
  lots?: Record<string, Lot[]>;
  lotTypes?: Record<string, LotTypeWithStatusDefinitions>;
  fields?: { key: string; value: unknown }[];
}): OperationContext {
  const allLots: Lot[] = Object.values(lots).flat();
  const opLots: OperationInputLot[] = Object.entries(lots).flatMap(
    ([key, list]) =>
      list.map((lot) => ({
        id: `oi-${lot.id}`,
        key,
        operationId: "op-1",
        lotId: lot.id,
      })),
  );

  const op: Operation = {
    id: "op-1",
    orgId: "org-1",
    operationTypeId: "op-type-1",
    status: "completed",
    startedAt: null,
    completedAt: new Date("2025-01-01"),
    performedBy: null,
    locationId: null,
    notes: null,
    attributes: {},
    createdAt: new Date("2025-01-01"),
    steps,
    inputLots: opLots,
    inputLocations: [],
    inputValues: fields.map((f, i) => ({
      id: `field-${i}`,
      key: f.key,
      operationId: "op-1",
      value: f.value,
    })),
  };

  const ctx = new OperationContext(op);
  ctx.lots = Object.fromEntries(allLots.map((l) => [l.id, l]));
  ctx.lotTypes = lotTypes;
  return ctx;
}

describe("real registry", () => {
  it("contains all 7 expected actions", () => {
    expect(actionsRegistry.actions.sort()).toEqual([
      "create-lot",
      "increment-attribute",
      "record-event",
      "set-lineage",
      "set-lot-attr",
      "set-lot-status",
      "set-operation",
    ]);
  });
});

describe("execute with real actions", () => {
  it("set-lot-status + set-lot-attr on the same lot merge correctly", () => {
    const lot = makeLot({ id: "a", lotTypeId: "type-1", statusId: "s-old" });
    const statusDef = makeStatusDef({
      id: "s-harvested",
      name: "Harvested",
      lotTypeId: "type-1",
    });
    const lt = makeLotType({
      id: "type-1",
      statusDefinitions: [statusDef],
    });

    const steps: OperationStep[] = [
      makeStep({
        id: "step-1",
        action: "set-lot-status",
        target: "source",
        config: { status: "Harvested" },
        sortOrder: 0,
      }),
      makeStep({
        id: "step-2",
        action: "set-lot-attr",
        target: "source",
        config: { attrKey: "Weight", value: "100" },
        sortOrder: 1,
      }),
    ];

    const ctx = makeRealCtx({
      steps,
      lots: { source: [lot] },
      lotTypes: { "type-1": lt },
    });

    const results = execute(ctx, actionsRegistry);

    expect(results).toHaveLength(2);
    expect(results[0]!.result.success).toBe(true);
    expect(results[1]!.result.success).toBe(true);

    const combined = combineLotOps(results.map((r) => r.result));
    expect(combined.updates["a"]).toEqual({
      statusId: "s-harvested",
      attributes: { Weight: "100" },
    });
  });

  it("set-lot-attr with field reference resolves input values", () => {
    const lot = makeLot({ id: "a", lotTypeId: "type-1" });

    const steps: OperationStep[] = [
      makeStep({
        id: "step-1",
        action: "set-lot-attr",
        target: "source",
        config: { attrKey: "Weight", value: { from: ["inputs", "Weight"] } },
        sortOrder: 0,
      }),
    ];

    const ctx = makeRealCtx({
      steps,
      lots: { source: [lot] },
      fields: [{ key: "Weight", value: 42 }],
    });

    const results = execute(ctx, actionsRegistry);
    expect(results[0]!.result.success).toBe(true);
    expect(results[0]!.result.lots.update["a"]).toEqual({
      attributes: { Weight: 42 },
    });
  });

  it("returns skipped when action config is invalid (schema validation)", () => {
    const steps: OperationStep[] = [
      makeStep({
        id: "step-1",
        action: "set-lot-status",
        target: "source",
        config: { badKey: true },
        sortOrder: 0,
      }),
    ];

    const ctx = makeRealCtx({ steps });
    const results = execute(ctx, actionsRegistry);

    expect(results).toHaveLength(1);
    expect(results[0]!.result.skipped).toBe(true);
    expect(results[0]!.result.message).toMatch(/Invalid config/);
  });

  it("set-operation updates operation-level metadata", () => {
    const steps: OperationStep[] = [
      makeStep({
        id: "step-1",
        action: "set-operation",
        target: null,
        config: { notes: "done", status: "completed" },
        sortOrder: 0,
      }),
    ];

    const ctx = makeRealCtx({ steps });
    const results = execute(ctx, actionsRegistry);

    expect(results[0]!.result.success).toBe(true);
    expect(results[0]!.result.operationUpdate).toEqual({
      notes: "done",
      status: "completed",
    });
  });

  it("combines set-lot-status + set-lot-attr + set-operation across steps", () => {
    const lot = makeLot({ id: "a", lotTypeId: "type-1" });
    const lt = makeLotType({
      id: "type-1",
      statusDefinitions: [
        makeStatusDef({ id: "s-done", name: "Done", lotTypeId: "type-1" }),
      ],
    });

    const steps: OperationStep[] = [
      makeStep({
        id: "s1",
        action: "set-lot-status",
        target: "source",
        config: { status: "Done" },
        sortOrder: 0,
      }),
      makeStep({
        id: "s2",
        action: "set-lot-attr",
        target: "source",
        config: { attrKey: "Grade", value: "A" },
        sortOrder: 1,
      }),
      makeStep({
        id: "s3",
        action: "set-operation",
        target: null,
        config: { notes: "All done" },
        sortOrder: 2,
      }),
    ];

    const ctx = makeRealCtx({
      steps,
      lots: { source: [lot] },
      lotTypes: { "type-1": lt },
    });

    const results = execute(ctx, actionsRegistry);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.result.success)).toBe(true);

    const combined = combineLotOps(results.map((r) => r.result));
    expect(combined.updates["a"]).toEqual({
      statusId: "s-done",
      attributes: { Grade: "A" },
    });
    expect(combined.operationUpdate).toEqual({ notes: "All done" });
  });
});
