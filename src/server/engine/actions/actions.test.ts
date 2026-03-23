import { describe, it, expect } from "vitest";
import {
  ActionResult,
  ActionRegistry,
  combineLotOps,
  createAction,
} from "./actions";
import { z } from "zod";

// ---------------------------------------------------------------------------
// ActionResult
// ---------------------------------------------------------------------------

describe("ActionResult", () => {
  it("initialises with sensible defaults", () => {
    const r = new ActionResult();
    expect(r.lots.create).toEqual([]);
    expect(r.lots.update).toEqual({});
    expect(r.lots.link).toEqual([]);
    expect(r.events).toEqual([]);
    expect(r.operationUpdate).toEqual({});
    expect(r.success).toBe(true);
    expect(r.skipped).toBe(false);
    expect(r.message).toBe("");
  });

  describe("updateLot", () => {
    it("deep-merges different attribute keys on the same lot", () => {
      const r = new ActionResult();
      r.updateLot("lot-1", { attributes: { color: "red" } } as any);
      r.updateLot("lot-1", { attributes: { weight: 100 } } as any);

      expect(r.lots.update["lot-1"]).toEqual({
        attributes: { color: "red", weight: 100 },
      });
    });

    it("last write wins for the same attribute key on the same lot", () => {
      const r = new ActionResult();
      r.updateLot("lot-1", { attributes: { color: "red" } } as any);
      r.updateLot("lot-1", { attributes: { color: "blue" } } as any);

      expect((r.lots.update["lot-1"] as any).attributes.color).toBe("blue");
    });

    it("keeps separate lots independent", () => {
      const r = new ActionResult();
      r.updateLot("a", { statusId: "s1" } as any);
      r.updateLot("b", { statusId: "s2" } as any);

      expect(r.lots.update["a"]).toEqual({ statusId: "s1" });
      expect(r.lots.update["b"]).toEqual({ statusId: "s2" });
    });

    it("does not mutate previously stored changes via reference sharing", () => {
      const r = new ActionResult();
      const attrs = { nested: { x: 1 } };
      r.updateLot("lot-1", { attributes: attrs } as any);
      attrs.nested.x = 999;

      expect((r.lots.update["lot-1"] as any).attributes.nested.x).toBe(1);
    });
  });

  describe("addEvent", () => {
    it("appends events in order", () => {
      const r = new ActionResult();
      r.addEvent({ lotId: "a", eventType: "first" });
      r.addEvent({ lotId: "b", eventType: "second", message: "hello" });

      expect(r.events).toHaveLength(2);
      expect(r.events[0]).toEqual({ lotId: "a", eventType: "first" });
      expect(r.events[1]).toEqual({
        lotId: "b",
        eventType: "second",
        message: "hello",
      });
    });
  });
});

// ---------------------------------------------------------------------------
// combineLotOps
// ---------------------------------------------------------------------------

describe("combineLotOps", () => {
  it("returns empty collections for an empty results array", () => {
    const combined = combineLotOps([]);
    expect(combined.creates).toEqual([]);
    expect(combined.updates).toEqual({});
    expect(combined.links).toEqual([]);
    expect(combined.events).toEqual([]);
    expect(combined.operationUpdate).toEqual({});
  });

  it("passes through a single result unchanged", () => {
    const r = new ActionResult();
    r.updateLot("lot-1", { statusId: "s1" } as any);
    r.lots.create.push({ orgId: "org-1", lotTypeId: "t1", code: "X" } as any);
    r.lots.link.push({
      parentLotId: "a",
      childLotId: "b",
      relationship: "derived",
    } as any);
    r.addEvent({ lotId: "lot-1", eventType: "test" });
    r.operationUpdate = { notes: "hello" };

    const combined = combineLotOps([r]);
    expect(combined.updates).toEqual({ "lot-1": { statusId: "s1" } });
    expect(combined.creates).toHaveLength(1);
    expect(combined.links).toHaveLength(1);
    expect(combined.events).toHaveLength(1);
    expect(combined.operationUpdate).toEqual({ notes: "hello" });
  });

  it("deep-merges updates for the same lot from multiple results", () => {
    const r1 = new ActionResult();
    r1.updateLot("lot-1", { attributes: { color: "red" } } as any);

    const r2 = new ActionResult();
    r2.updateLot("lot-1", { attributes: { weight: 50 } } as any);

    const combined = combineLotOps([r1, r2]);
    expect(combined.updates["lot-1"]).toEqual({
      attributes: { color: "red", weight: 50 },
    });
  });

  it("last result wins when updating the same attribute key on the same lot", () => {
    const r1 = new ActionResult();
    r1.updateLot("lot-1", { attributes: { color: "red" } } as any);

    const r2 = new ActionResult();
    r2.updateLot("lot-1", { attributes: { color: "blue" } } as any);

    const combined = combineLotOps([r1, r2]);
    expect((combined.updates["lot-1"] as any).attributes.color).toBe("blue");
  });

  it("keeps updates for different lot IDs separate", () => {
    const r1 = new ActionResult();
    r1.updateLot("a", { statusId: "s1" } as any);

    const r2 = new ActionResult();
    r2.updateLot("b", { statusId: "s2" } as any);

    const combined = combineLotOps([r1, r2]);
    expect(combined.updates["a"]).toEqual({ statusId: "s1" });
    expect(combined.updates["b"]).toEqual({ statusId: "s2" });
  });

  it("concatenates creates from multiple results", () => {
    const r1 = new ActionResult();
    r1.lots.create.push({ code: "A" } as any);

    const r2 = new ActionResult();
    r2.lots.create.push({ code: "B" } as any, { code: "C" } as any);

    const combined = combineLotOps([r1, r2]);
    expect(combined.creates).toHaveLength(3);
    expect(combined.creates.map((c: any) => c.code)).toEqual(["A", "B", "C"]);
  });

  it("concatenates links from multiple results", () => {
    const r1 = new ActionResult();
    r1.lots.link.push({
      parentLotId: "p1",
      childLotId: "c1",
      relationship: "derived",
    } as any);

    const r2 = new ActionResult();
    r2.lots.link.push({
      parentLotId: "p2",
      childLotId: "c2",
      relationship: "split",
    } as any);

    const combined = combineLotOps([r1, r2]);
    expect(combined.links).toHaveLength(2);
  });

  it("concatenates events from multiple results", () => {
    const r1 = new ActionResult();
    r1.addEvent({ lotId: "a", eventType: "e1" });

    const r2 = new ActionResult();
    r2.addEvent({ lotId: "b", eventType: "e2" });
    r2.addEvent({ lotId: "c", eventType: "e3" });

    const combined = combineLotOps([r1, r2]);
    expect(combined.events).toHaveLength(3);
  });

  it("deep-merges operationUpdate from multiple results", () => {
    const r1 = new ActionResult();
    r1.operationUpdate = { notes: "hello" };

    const r2 = new ActionResult();
    r2.operationUpdate = { locationId: "loc-1" };

    const combined = combineLotOps([r1, r2]);
    expect(combined.operationUpdate).toEqual({
      notes: "hello",
      locationId: "loc-1",
    });
  });

  it("last operationUpdate wins for conflicting keys", () => {
    const r1 = new ActionResult();
    r1.operationUpdate = { status: "pending" };

    const r2 = new ActionResult();
    r2.operationUpdate = { status: "completed" };

    const combined = combineLotOps([r1, r2]);
    expect(combined.operationUpdate.status).toBe("completed");
  });
});

// ---------------------------------------------------------------------------
// ActionRegistry
// ---------------------------------------------------------------------------

describe("ActionRegistry", () => {
  const dummyAction = {
    id: "test-action",
    name: "Test",
    description: "A test action",
    schema: z.object({}) as any,
    handler: () => new ActionResult(),
  };

  it("returns undefined for an unregistered action", () => {
    const registry = new ActionRegistry();
    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("returns the handler for a registered action", () => {
    const registry = new ActionRegistry().register(dummyAction);
    expect(registry.get("test-action")).toBe(dummyAction.handler);
  });

  it("lists all registered action ids", () => {
    const registry = new ActionRegistry()
      .register({ ...dummyAction, id: "alpha" })
      .register({ ...dummyAction, id: "beta" });

    expect(registry.actions).toEqual(["alpha", "beta"]);
  });

  it("supports fluent chaining via register()", () => {
    const registry = new ActionRegistry();
    const returned = registry.register(dummyAction);
    expect(returned).toBe(registry);
  });

  it("overwrites a previously registered action with the same id", () => {
    const handler1 = () => new ActionResult();
    const handler2 = () => {
      const r = new ActionResult();
      r.message = "v2";
      return r;
    };

    const registry = new ActionRegistry()
      .register({ ...dummyAction, handler: handler1 })
      .register({ ...dummyAction, handler: handler2 });

    expect(registry.get("test-action")).toBe(handler2);
    expect(registry.actions).toEqual(["test-action"]);
  });
});

// ---------------------------------------------------------------------------
// createAction (schema validation wrapper)
// ---------------------------------------------------------------------------

describe("createAction", () => {
  it("wraps handler with schema validation and returns skipped on invalid config", () => {
    const action = createAction({
      id: "strict",
      name: "Strict",
      description: "",
      schema: z.object({ required: z.string() }),
      handler: () => new ActionResult(),
    });

    const result = action.handler({} as any, { config: {} } as any);
    expect(result.skipped).toBe(true);
    expect(result.message).toMatch(/Invalid config/);
  });

  it("passes parsed config to handler on valid input", () => {
    const action = createAction({
      id: "ok",
      name: "Ok",
      description: "",
      schema: z.object({ name: z.string() }),
      handler: (_ctx, step) => {
        const r = new ActionResult();
        r.message = `Hello ${step.config.name}`;
        return r;
      },
    });

    const result = action.handler(
      {} as any,
      { config: { name: "World" } } as any,
    );
    expect(result.message).toBe("Hello World");
    expect(result.skipped).toBe(false);
  });
});
