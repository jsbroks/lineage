import { describe, it, expect } from "vitest";
import { setOperation } from "./set-operation";
import { ActionResult } from "./actions";
import { OperationContext } from "../operation-context";
import type { OperationInputField } from "~/server/db/schema";

type StepInput = {
  target?: string | null;
  config?: unknown;
};

function makeStep({ target = null, config = {} }: StepInput = {}) {
  return {
    id: "step-1",
    name: "Set operation",
    action: "set-operation",
    target,
    config,
    sortOrder: 0,
  };
}

type CtxInput = {
  fields?: { key: string; value: unknown }[];
};

function makeCtx({ fields = [] }: CtxInput = {}): OperationContext {
  const operationFields: OperationInputField[] = fields.map((f, i) => ({
    id: `field-${i}`,
    key: f.key,
    operationId: "op-1",
    value: f.value,
  }));

  return new OperationContext({
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
    items: [],
  });
}

describe("setOperation", () => {
  describe("schema validation", () => {
    it("returns skipped when config has no recognized fields", () => {
      const result = setOperation.handler(makeCtx(), makeStep({ config: {} }));
      expect(result.skipped).toBe(true);
      expect(result.message).toMatch(/No operation metadata to update/);
    });
  });

  describe("setting locationId", () => {
    it("sets locationId from a literal string", () => {
      const result = setOperation.handler(
        makeCtx(),
        makeStep({ config: { locationId: "loc-1" } }),
      );

      expect(result.success).toBe(true);
      expect(result.operationUpdate).toEqual({ locationId: "loc-1" });
      expect(result.message).toBe("Operation metadata updated");
    });

    it("resolves locationId from an input field reference", () => {
      const ctx = makeCtx({
        fields: [{ key: "room", value: "loc-42" }],
      });

      const result = setOperation.handler(
        ctx,
        makeStep({
          config: { locationId: { from: ["inputs", "room"] } },
        }),
      );

      expect(result.operationUpdate).toEqual({ locationId: "loc-42" });
    });
  });

  describe("setting notes", () => {
    it("sets notes from a literal string", () => {
      const result = setOperation.handler(
        makeCtx(),
        makeStep({ config: { notes: "Batch completed successfully" } }),
      );

      expect(result.operationUpdate).toEqual({
        notes: "Batch completed successfully",
      });
    });
  });

  describe("setting status", () => {
    it("sets status from a literal string", () => {
      const result = setOperation.handler(
        makeCtx(),
        makeStep({ config: { status: "in_progress" } }),
      );

      expect(result.operationUpdate).toEqual({ status: "in_progress" });
    });
  });

  describe("setting attributes", () => {
    it("sets attributes from literal values", () => {
      const result = setOperation.handler(
        makeCtx(),
        makeStep({
          config: { attributes: { temperature: 72, humidity: "high" } },
        }),
      );

      expect(result.operationUpdate).toEqual({
        attributes: { temperature: 72, humidity: "high" },
      });
    });

    it("resolves attribute values from input field references", () => {
      const ctx = makeCtx({
        fields: [{ key: "temp", value: 68 }],
      });

      const result = setOperation.handler(
        ctx,
        makeStep({
          config: {
            attributes: { temperature: { from: ["inputs", "temp"] } },
          },
        }),
      );

      expect(result.operationUpdate).toEqual({
        attributes: { temperature: 68 },
      });
    });
  });

  describe("multiple fields", () => {
    it("sets multiple fields at once", () => {
      const result = setOperation.handler(
        makeCtx(),
        makeStep({
          config: {
            locationId: "loc-1",
            notes: "test",
            status: "in_progress",
          },
        }),
      );

      expect(result.operationUpdate).toEqual({
        locationId: "loc-1",
        notes: "test",
        status: "in_progress",
      });
    });
  });

  describe("result structure", () => {
    it("returns an ActionResult instance", () => {
      const result = setOperation.handler(makeCtx(), makeStep({ config: {} }));
      expect(result).toBeInstanceOf(ActionResult);
    });

    it("does not produce item changes", () => {
      const result = setOperation.handler(
        makeCtx(),
        makeStep({ config: { notes: "test" } }),
      );

      expect(result.items.create).toEqual([]);
      expect(result.items.update).toEqual({});
      expect(result.items.link).toEqual([]);
    });
  });
});
