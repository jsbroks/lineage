import { describe, it, expect } from "vitest";
import { setLineage } from "./set-lineage";
import { ActionResult } from "./actions";
import { OperationContext } from "../operation-context";
import type { Lot } from "~/server/db/schema";

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
  lots?: Record<string, Lot[]>;
};

function makeCtx({ lots = {} }: CtxInput = {}): OperationContext {
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

  describe("when no parent lots found", () => {
    it("returns skipped", () => {
      const child = makeLot({ id: "c1" });
      const ctx = makeCtx({ lots: { blocks: [child] } });
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
      expect(result.message).toMatch(/No parent lots found/);
    });
  });

  describe("when no child lots found", () => {
    it("returns skipped", () => {
      const parent = makeLot({ id: "p1" });
      const ctx = makeCtx({ lots: { batch: [parent] } });
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
      expect(result.message).toMatch(/No child lots found/);
    });
  });

  describe("successful lineage creation", () => {
    it("creates a single link for one parent and one child", () => {
      const parent = makeLot({ id: "p1" });
      const child = makeLot({ id: "c1" });
      const ctx = makeCtx({
        lots: { batch: [parent], blocks: [child] },
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
      expect(result.lots.link).toHaveLength(1);
      expect(result.lots.link[0]).toMatchObject({
        parentLotId: "p1",
        childLotId: "c1",
        relationship: "batch_member",
        operationId: "op-1",
      });
      expect(result.message).toBe("Created 1 lineage link");
    });

    it("creates links for one parent and multiple children", () => {
      const parent = makeLot({ id: "p1" });
      const children = [
        makeLot({ id: "c1" }),
        makeLot({ id: "c2" }),
        makeLot({ id: "c3" }),
      ];
      const ctx = makeCtx({
        lots: { batch: [parent], blocks: children },
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

      expect(result.lots.link).toHaveLength(3);
      expect(result.lots.link.map((l) => l.childLotId)).toEqual([
        "c1",
        "c2",
        "c3",
      ]);
      expect(result.message).toBe("Created 3 lineage links");
    });

    it("creates cross-product links for multiple parents and children", () => {
      const parents = [makeLot({ id: "p1" }), makeLot({ id: "p2" })];
      const children = [makeLot({ id: "c1" }), makeLot({ id: "c2" })];
      const ctx = makeCtx({
        lots: { batch: parents, blocks: children },
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

      expect(result.lots.link).toHaveLength(4);
      expect(result.message).toBe("Created 4 lineage links");
    });

    it("sets the operationId on all links", () => {
      const parent = makeLot({ id: "p1" });
      const child = makeLot({ id: "c1" });
      const ctx = makeCtx({
        lots: { batch: [parent], blocks: [child] },
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

      for (const link of result.lots.link) {
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
      const parent = makeLot({ id: "p1" });
      const child = makeLot({ id: "c1" });
      const ctx = makeCtx({
        lots: { batch: [parent], blocks: [child] },
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

      expect(result.lots.create).toEqual([]);
      expect(result.lots.update).toEqual({});
    });
  });
});
