import { describe, it, expect, vi } from "vitest";
import { execute } from "./operation-execute";
import { ActionRegistry, ActionResult } from "./actions/actions";
import { OperationContext, type Operation } from "./operation-context";
import type { OperationStep } from "~/server/db/schema";

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
