import { describe, it, expect, vi } from "vitest";
import {
  execute,
  executeSteps,
  type OperationContext,
} from "./execute-operation";
import { ActionRegistry, type ExecCtx, type Item, type Tx } from "./types";
import type {
  OperationType,
  OperationTypeInputItem,
  OperationTypeInputField,
  OperationTypeStep,
} from "~/server/db/schema";

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    itemTypeId: "type-1",
    variantId: null,
    code: "BLK-001",
    statusId: "status-active",
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

function makeOpType(overrides: Partial<OperationType> = {}): OperationType {
  return {
    id: "op-type-1",
    name: "Test Op",
    description: null,
    icon: null,
    color: null,
    defaultLocation: null,
    category: null,
    ...overrides,
  };
}

function makeFieldDef(
  overrides: Partial<OperationTypeInputField> = {},
): OperationTypeInputField {
  return {
    id: "field-1",
    operationTypeId: "op-type-1",
    referenceKey: "myField",
    label: null,
    description: null,
    type: "string",
    required: false,
    options: null,
    defaultValue: null,
    sortOrder: 0,
    ...overrides,
  };
}

function makeItemDef(
  overrides: Partial<OperationTypeInputItem> & {
    allowedStatusIds?: Set<string> | null;
  } = {},
): OperationTypeInputItem & { allowedStatusIds: Set<string> | null } {
  const { allowedStatusIds = null, ...rest } = overrides;
  return {
    id: "item-def-1",
    operationTypeId: "op-type-1",
    itemTypeId: "type-1",
    referenceKey: "source",
    qtyMin: "0",
    qtyMax: null,
    preconditionsStatuses: null,
    ...rest,
    allowedStatusIds,
  };
}

function makeCtx(overrides: Partial<OperationContext> = {}): OperationContext {
  return {
    operationType: makeOpType(),
    inputItemDefs: [],
    inputFieldDefs: [],
    steps: [],
    items: {},
    fields: {},
    statusNames: new Map(),
    itemTypeNames: new Map(),
    ...overrides,
  };
}

// ── validateRequiredFields ──────────────────────────────────────────

describe("validateRequiredFields", () => {
  it("passes when no fields are required", () => {
    const ctx = makeCtx({
      inputFieldDefs: [makeFieldDef({ required: false })],
    });
    expect(() => execute(ctx)).not.toThrow();
  });

  it("passes when required field is present", () => {
    const ctx = makeCtx({
      inputFieldDefs: [makeFieldDef({ referenceKey: "Grade", required: true })],
      fields: { Grade: "A" },
    });
    expect(() => execute(ctx)).not.toThrow();
  });

  it("throws when required field is missing", () => {
    const ctx = makeCtx({
      inputFieldDefs: [makeFieldDef({ referenceKey: "Grade", required: true })],
      fields: {},
    });
    expect(() => execute(ctx)).toThrow("Missing required fields: Grade");
  });

  it("lists all missing required fields", () => {
    const ctx = makeCtx({
      inputFieldDefs: [
        makeFieldDef({ id: "f1", referenceKey: "Grade", required: true }),
        makeFieldDef({ id: "f2", referenceKey: "Weight", required: true }),
        makeFieldDef({ id: "f3", referenceKey: "Notes", required: false }),
      ],
      fields: {},
    });
    expect(() => execute(ctx)).toThrow(
      "Missing required fields: Grade, Weight",
    );
  });
});

// ── validateItemMinQuantities ───────────────────────────────────────

describe("validateItemMinQuantities", () => {
  it("passes when qtyMin is 0", () => {
    const ctx = makeCtx({
      inputItemDefs: [makeItemDef({ qtyMin: "0" })],
      items: {},
    });
    expect(() => execute(ctx)).not.toThrow();
  });

  it("passes when enough items are provided", () => {
    const ctx = makeCtx({
      inputItemDefs: [makeItemDef({ referenceKey: "boxes", qtyMin: "2" })],
      items: {
        boxes: [makeItem({ id: "a" }), makeItem({ id: "b" })],
      },
    });
    expect(() => execute(ctx)).not.toThrow();
  });

  it("throws when too few items are provided", () => {
    const ctx = makeCtx({
      inputItemDefs: [makeItemDef({ referenceKey: "boxes", qtyMin: "3" })],
      items: { boxes: [makeItem()] },
    });
    expect(() => execute(ctx)).toThrow('"boxes" requires at least 3, got 1');
  });

  it("throws when port has no items but requires some", () => {
    const ctx = makeCtx({
      inputItemDefs: [makeItemDef({ referenceKey: "boxes", qtyMin: "1" })],
      items: {},
    });
    expect(() => execute(ctx)).toThrow('"boxes" requires at least 1, got 0');
  });
});

// ── validateItemMaxQuantities ───────────────────────────────────────

describe("validateItemMaxQuantities", () => {
  it("passes when qtyMax is null (unlimited)", () => {
    const ctx = makeCtx({
      inputItemDefs: [makeItemDef({ referenceKey: "boxes", qtyMax: null })],
      items: {
        boxes: [makeItem({ id: "a" }), makeItem({ id: "b" })],
      },
    });
    expect(() => execute(ctx)).not.toThrow();
  });

  it("passes when items are within max", () => {
    const ctx = makeCtx({
      inputItemDefs: [makeItemDef({ referenceKey: "skid", qtyMax: "1" })],
      items: { skid: [makeItem()] },
    });
    expect(() => execute(ctx)).not.toThrow();
  });

  it("throws when too many items are provided", () => {
    const ctx = makeCtx({
      inputItemDefs: [makeItemDef({ referenceKey: "skid", qtyMax: "1" })],
      items: {
        skid: [makeItem({ id: "a" }), makeItem({ id: "b" })],
      },
    });
    expect(() => execute(ctx)).toThrow('"skid" allows at most 1, got 2');
  });
});

// ── validateItemPreconditions ───────────────────────────────────────

describe("validateItemPreconditions", () => {
  it("passes when no preconditions are defined", () => {
    const ctx = makeCtx({
      inputItemDefs: [makeItemDef({ allowedStatusIds: null })],
      items: { source: [makeItem()] },
    });
    expect(() => execute(ctx)).not.toThrow();
  });

  it("passes when item status matches allowed set", () => {
    const ctx = makeCtx({
      inputItemDefs: [
        makeItemDef({
          referenceKey: "boxes",
          allowedStatusIds: new Set(["status-active"]),
          preconditionsStatuses: ["Active"],
        }),
      ],
      items: {
        boxes: [makeItem({ statusId: "status-active" })],
      },
      statusNames: new Map([["status-active", "Active"]]),
    });
    expect(() => execute(ctx)).not.toThrow();
  });

  it("throws when item status does not match", () => {
    const ctx = makeCtx({
      inputItemDefs: [
        makeItemDef({
          referenceKey: "boxes",
          allowedStatusIds: new Set(["status-approved"]),
          preconditionsStatuses: ["Approved"],
        }),
      ],
      items: {
        boxes: [makeItem({ code: "BOX-001", statusId: "status-created" })],
      },
      statusNames: new Map([
        ["status-created", "Created"],
        ["status-approved", "Approved"],
      ]),
    });
    expect(() => execute(ctx)).toThrow(
      'BOX-001 has status "Created" but "boxes" requires one of: Approved',
    );
  });

  it("shows raw statusId when name is not in lookup", () => {
    const ctx = makeCtx({
      inputItemDefs: [
        makeItemDef({
          referenceKey: "boxes",
          allowedStatusIds: new Set(["status-approved"]),
          preconditionsStatuses: ["Approved"],
        }),
      ],
      items: {
        boxes: [makeItem({ code: "BOX-002", statusId: "unknown-id" })],
      },
    });
    expect(() => execute(ctx)).toThrow(
      'BOX-002 has status "unknown-id" but "boxes" requires one of: Approved',
    );
  });
});

// ── execute (integration of all validators) ─────────────────────────

describe("execute", () => {
  it("passes a fully valid context with no items or fields required", () => {
    const ctx = makeCtx();
    expect(() => execute(ctx)).not.toThrow();
  });

  it("validates fields before item quantities", () => {
    const ctx = makeCtx({
      inputFieldDefs: [makeFieldDef({ referenceKey: "Name", required: true })],
      inputItemDefs: [makeItemDef({ referenceKey: "src", qtyMin: "1" })],
      items: {},
      fields: {},
    });
    expect(() => execute(ctx)).toThrow("Missing required fields");
  });
});

// ── executeSteps ────────────────────────────────────────────────────

const fakeTx = {} as Tx;

function makeStep(
  overrides: Partial<OperationTypeStep> = {},
): OperationTypeStep {
  return {
    id: "step-1",
    operationTypeId: "op-type-1",
    name: "Test step",
    action: "test-action",
    target: null,
    value: {},
    sortOrder: 0,
    ...overrides,
  };
}

function makeExecCtx(overrides: Partial<ExecCtx> = {}): ExecCtx {
  return {
    items: {},
    inputs: {},
    itemTypeNames: new Map(),
    itemsCreated: [],
    itemsUpdated: new Set(),
    lineageCreated: 0,
    operationId: "op-1",
    ...overrides,
  };
}

describe("executeSteps", () => {
  it("returns empty results when there are no steps", async () => {
    const reg = new ActionRegistry();
    const results = await executeSteps(fakeTx, reg, [], makeExecCtx());
    expect(results).toEqual([]);
  });

  it("calls the registered handler and returns success", async () => {
    const handler = vi.fn().mockResolvedValue("did the thing");
    const reg = new ActionRegistry().register("my-action", handler);

    const step = makeStep({ action: "my-action", name: "Do thing" });
    const results = await executeSteps(fakeTx, reg, [step], makeExecCtx());

    expect(results).toEqual([
      {
        stepName: "Do thing",
        action: "my-action",
        skipped: false,
        success: true,
        detail: "did the thing",
      },
    ]);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("passes tx, step, config, and execCtx to the handler", async () => {
    const handler = vi.fn().mockResolvedValue("ok");
    const reg = new ActionRegistry().register("my-action", handler);

    const step = makeStep({
      action: "my-action",
      value: { target: "source", status: "Active" },
    });
    const ctx = makeExecCtx({ operationId: "op-99" });

    await executeSteps(fakeTx, reg, [step], ctx);

    const [tx, passedStep, config, passedCtx] = handler.mock.calls[0]!;
    expect(tx).toBe(fakeTx);
    expect(passedStep).toBe(step);
    expect(config).toEqual({ target: "source", status: "Active" });
    expect(passedCtx).toBe(ctx);
  });

  it("reports unknown action as a failure", async () => {
    const reg = new ActionRegistry();
    const step = makeStep({ action: "nope", name: "Bad step" });

    const results = await executeSteps(fakeTx, reg, [step], makeExecCtx());

    expect(results).toEqual([
      {
        stepName: "Bad step",
        action: "nope",
        skipped: false,
        success: false,
        detail: 'unknown action "nope"',
      },
    ]);
  });

  it("catches handler errors and reports failure", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("boom"));
    const reg = new ActionRegistry().register("explode", handler);

    const step = makeStep({ action: "explode", name: "Exploding step" });
    const results = await executeSteps(fakeTx, reg, [step], makeExecCtx());

    expect(results).toEqual([
      {
        stepName: "Exploding step",
        action: "explode",
        skipped: false,
        success: false,
        detail: "boom",
      },
    ]);
  });

  it("catches non-Error throws and stringifies them", async () => {
    const handler = vi.fn().mockRejectedValue("string error");
    const reg = new ActionRegistry().register("bad", handler);

    const step = makeStep({ action: "bad" });
    const [result] = await executeSteps(fakeTx, reg, [step], makeExecCtx());

    expect(result!.success).toBe(false);
    expect(result!.detail).toBe("string error");
  });

  it("skips steps whose condition is not met", async () => {
    const handler = vi.fn().mockResolvedValue("ran");
    const reg = new ActionRegistry().register("act", handler);

    const step = makeStep({
      action: "act",
      name: "Conditional",
      value: { condition: { exists: "missing_port" } },
    });
    const results = await executeSteps(fakeTx, reg, [step], makeExecCtx());

    expect(results).toEqual([
      {
        stepName: "Conditional",
        action: "act",
        skipped: true,
        success: true,
        detail: "condition not met",
      },
    ]);
    expect(handler).not.toHaveBeenCalled();
  });

  it("runs steps whose condition is met", async () => {
    const handler = vi.fn().mockResolvedValue("ran");
    const reg = new ActionRegistry().register("act", handler);

    const step = makeStep({
      action: "act",
      name: "Conditional",
      value: { condition: { exists: "inputs.grade" } },
    });
    const ctx = makeExecCtx({ inputs: { grade: "A" } });
    const results = await executeSteps(fakeTx, reg, [step], ctx);

    expect(results[0]!.skipped).toBe(false);
    expect(results[0]!.success).toBe(true);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("executes multiple steps in order", async () => {
    const callOrder: string[] = [];
    const makeHandler = (name: string) =>
      vi.fn().mockImplementation(async () => {
        callOrder.push(name);
        return `${name} done`;
      });

    const reg = new ActionRegistry()
      .register("first", makeHandler("first"))
      .register("second", makeHandler("second"))
      .register("third", makeHandler("third"));

    const steps = [
      makeStep({ id: "s1", action: "first", name: "Step 1", sortOrder: 0 }),
      makeStep({ id: "s2", action: "second", name: "Step 2", sortOrder: 1 }),
      makeStep({ id: "s3", action: "third", name: "Step 3", sortOrder: 2 }),
    ];

    const results = await executeSteps(fakeTx, reg, steps, makeExecCtx());

    expect(callOrder).toEqual(["first", "second", "third"]);
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.success)).toEqual([true, true, true]);
  });

  it("continues executing after a step fails", async () => {
    const reg = new ActionRegistry()
      .register("fail", vi.fn().mockRejectedValue(new Error("oops")))
      .register("ok", vi.fn().mockResolvedValue("fine"));

    const steps = [
      makeStep({ id: "s1", action: "fail", name: "Failing", sortOrder: 0 }),
      makeStep({ id: "s2", action: "ok", name: "After fail", sortOrder: 1 }),
    ];

    const results = await executeSteps(fakeTx, reg, steps, makeExecCtx());

    expect(results[0]!.success).toBe(false);
    expect(results[1]!.success).toBe(true);
    expect(results[1]!.detail).toBe("fine");
  });

  it("allows handlers to mutate execCtx accumulator fields", async () => {
    const handler = vi
      .fn()
      .mockImplementation(async (_tx, _step, _cfg, ctx: ExecCtx) => {
        ctx.itemsCreated.push("new-item-1");
        ctx.itemsUpdated.add("updated-item-1");
        ctx.lineageCreated += 2;
        return "mutated";
      });
    const reg = new ActionRegistry().register("mutator", handler);

    const ctx = makeExecCtx();
    await executeSteps(fakeTx, reg, [makeStep({ action: "mutator" })], ctx);

    expect(ctx.itemsCreated).toEqual(["new-item-1"]);
    expect(ctx.itemsUpdated).toEqual(new Set(["updated-item-1"]));
    expect(ctx.lineageCreated).toBe(2);
  });

  it("accumulates mutations across multiple steps", async () => {
    const handler1 = vi
      .fn()
      .mockImplementation(async (_tx, _step, _cfg, ctx: ExecCtx) => {
        ctx.itemsCreated.push("item-a");
        return "step1";
      });
    const handler2 = vi
      .fn()
      .mockImplementation(async (_tx, _step, _cfg, ctx: ExecCtx) => {
        ctx.itemsCreated.push("item-b");
        ctx.lineageCreated += 1;
        return "step2";
      });

    const reg = new ActionRegistry()
      .register("act1", handler1)
      .register("act2", handler2);

    const steps = [
      makeStep({ id: "s1", action: "act1", sortOrder: 0 }),
      makeStep({ id: "s2", action: "act2", sortOrder: 1 }),
    ];

    const ctx = makeExecCtx();
    await executeSteps(fakeTx, reg, steps, ctx);

    expect(ctx.itemsCreated).toEqual(["item-a", "item-b"]);
    expect(ctx.lineageCreated).toBe(1);
  });

  it("strips the condition key from config before passing to handler", async () => {
    const handler = vi.fn().mockResolvedValue("ok");
    const reg = new ActionRegistry().register("act", handler);

    const step = makeStep({
      action: "act",
      value: {
        condition: { exists: "inputs.x" },
        target: "source",
        status: "Done",
      },
    });
    const ctx = makeExecCtx({ inputs: { x: "yes" } });

    await executeSteps(fakeTx, reg, [step], ctx);

    const config = handler.mock.calls[0]![2];
    expect(config).toEqual({ target: "source", status: "Done" });
    expect(config).not.toHaveProperty("condition");
  });

  it("handles mixed results: skip, success, unknown, failure", async () => {
    const reg = new ActionRegistry()
      .register("good", vi.fn().mockResolvedValue("nice"))
      .register("bad", vi.fn().mockRejectedValue(new Error("fail")));

    const steps = [
      makeStep({
        id: "s1",
        action: "good",
        name: "Skipped",
        value: { condition: { exists: "nope" } },
        sortOrder: 0,
      }),
      makeStep({ id: "s2", action: "good", name: "Success", sortOrder: 1 }),
      makeStep({ id: "s3", action: "missing", name: "Unknown", sortOrder: 2 }),
      makeStep({ id: "s4", action: "bad", name: "Error", sortOrder: 3 }),
    ];

    const results = await executeSteps(fakeTx, reg, steps, makeExecCtx());

    expect(
      results.map((r) => ({
        name: r.stepName,
        skipped: r.skipped,
        success: r.success,
      })),
    ).toEqual([
      { name: "Skipped", skipped: true, success: true },
      { name: "Success", skipped: false, success: true },
      { name: "Unknown", skipped: false, success: false },
      { name: "Error", skipped: false, success: false },
    ]);
  });
});
