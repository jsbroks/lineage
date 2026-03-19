import { describe, it, expect } from "vitest";
import {
  simpleStepsToStepRows,
  stepRowsToSimpleSteps,
  type SimpleStepRow,
} from "./simple-steps";
import type { StepRow } from "~/app/[org]/tasks/_components/OperationTypeForm";

describe("simpleStepsToStepRows", () => {
  it("converts a change-status step", () => {
    const simple: SimpleStepRow[] = [
      { kind: "change-status", targetRef: "Block", statusName: "Harvested" },
    ];
    const rows = simpleStepsToStepRows(simple);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      name: "Set status → Harvested",
      action: "set-item",
      target: "Block",
      value: JSON.stringify({ status: "Harvested" }),
    });
  });

  it("converts a set-attribute literal step", () => {
    const simple: SimpleStepRow[] = [
      {
        kind: "set-attribute",
        targetRef: "Block",
        attrKey: "Weight",
        source: "literal",
        literalValue: "100",
      },
    ];
    const rows = simpleStepsToStepRows(simple);
    expect(rows).toHaveLength(1);
    expect(JSON.parse(rows[0]!.value)).toEqual({
      attributes: { Weight: "100" },
    });
  });

  it("converts a set-attribute field reference step", () => {
    const simple: SimpleStepRow[] = [
      {
        kind: "set-attribute",
        targetRef: "Block",
        attrKey: "Harvested By",
        source: "field",
        fieldRef: "Harvested By",
      },
    ];
    const rows = simpleStepsToStepRows(simple);
    expect(rows).toHaveLength(1);
    expect(JSON.parse(rows[0]!.value)).toEqual({
      attributes: { "Harvested By": { from: ["inputs", "Harvested By"] } },
    });
  });

  it("converts multiple steps", () => {
    const simple: SimpleStepRow[] = [
      { kind: "change-status", targetRef: "Block", statusName: "Harvested" },
      {
        kind: "set-attribute",
        targetRef: "Block",
        attrKey: "Weight",
        source: "field",
        fieldRef: "Weight (g)",
      },
    ];
    const rows = simpleStepsToStepRows(simple);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.action).toBe("set-item");
    expect(rows[1]!.action).toBe("set-item");
  });
});

describe("stepRowsToSimpleSteps", () => {
  it("converts a status-only step row", () => {
    const rows: StepRow[] = [
      {
        name: "Set status",
        action: "set-item",
        target: "Block",
        value: JSON.stringify({ status: "Harvested" }),
      },
    ];
    const result = stepRowsToSimpleSteps(rows);
    expect(result.isFullyConvertible).toBe(true);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toEqual({
      kind: "change-status",
      targetRef: "Block",
      statusName: "Harvested",
    });
  });

  it("converts an attribute literal step row", () => {
    const rows: StepRow[] = [
      {
        name: "Set weight",
        action: "set-item",
        target: "Block",
        value: JSON.stringify({ attributes: { Weight: "100" } }),
      },
    ];
    const result = stepRowsToSimpleSteps(rows);
    expect(result.isFullyConvertible).toBe(true);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toEqual({
      kind: "set-attribute",
      targetRef: "Block",
      attrKey: "Weight",
      source: "literal",
      literalValue: "100",
    });
  });

  it("converts an attribute field-ref step row", () => {
    const rows: StepRow[] = [
      {
        name: "Set harvested by",
        action: "set-item",
        target: "Block",
        value: JSON.stringify({
          attributes: {
            "Harvested By": { from: ["inputs", "Harvested By"] },
          },
        }),
      },
    ];
    const result = stepRowsToSimpleSteps(rows);
    expect(result.isFullyConvertible).toBe(true);
    expect(result.steps[0]).toEqual({
      kind: "set-attribute",
      targetRef: "Block",
      attrKey: "Harvested By",
      source: "field",
      fieldRef: "Harvested By",
    });
  });

  it("splits a combined status+attributes row into separate simple steps", () => {
    const rows: StepRow[] = [
      {
        name: "Update",
        action: "set-item",
        target: "Block",
        value: JSON.stringify({
          status: "Harvested",
          attributes: { Weight: "50" },
        }),
      },
    ];
    const result = stepRowsToSimpleSteps(rows);
    expect(result.isFullyConvertible).toBe(true);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]!.kind).toBe("change-status");
    expect(result.steps[1]!.kind).toBe("set-attribute");
  });

  it("marks non-set-item actions as not fully convertible", () => {
    const rows: StepRow[] = [
      {
        name: "Create",
        action: "create-item",
        target: "Block",
        value: "{}",
      },
    ];
    const result = stepRowsToSimpleSteps(rows);
    expect(result.isFullyConvertible).toBe(false);
    expect(result.steps).toHaveLength(0);
  });

  it("marks invalid JSON as not fully convertible", () => {
    const rows: StepRow[] = [
      { name: "Bad", action: "set-item", target: "Block", value: "not json" },
    ];
    const result = stepRowsToSimpleSteps(rows);
    expect(result.isFullyConvertible).toBe(false);
  });

  it("marks empty config as not fully convertible", () => {
    const rows: StepRow[] = [
      { name: "Empty", action: "set-item", target: "Block", value: "{}" },
    ];
    const result = stepRowsToSimpleSteps(rows);
    expect(result.isFullyConvertible).toBe(false);
  });
});

describe("round-trip conversion", () => {
  it("simple → step → simple preserves change-status", () => {
    const original: SimpleStepRow[] = [
      { kind: "change-status", targetRef: "Block", statusName: "Colonized" },
    ];
    const rows = simpleStepsToStepRows(original);
    const { steps, isFullyConvertible } = stepRowsToSimpleSteps(rows);
    expect(isFullyConvertible).toBe(true);
    expect(steps).toEqual(original);
  });

  it("simple → step → simple preserves set-attribute with field ref", () => {
    const original: SimpleStepRow[] = [
      {
        kind: "set-attribute",
        targetRef: "Block",
        attrKey: "Notes",
        source: "field",
        fieldRef: "Notes",
      },
    ];
    const rows = simpleStepsToStepRows(original);
    const { steps, isFullyConvertible } = stepRowsToSimpleSteps(rows);
    expect(isFullyConvertible).toBe(true);
    expect(steps).toEqual(original);
  });

  it("simple → step → simple preserves set-attribute with literal", () => {
    const original: SimpleStepRow[] = [
      {
        kind: "set-attribute",
        targetRef: "Block",
        attrKey: "Grade",
        source: "literal",
        literalValue: "A",
      },
    ];
    const rows = simpleStepsToStepRows(original);
    const { steps, isFullyConvertible } = stepRowsToSimpleSteps(rows);
    expect(isFullyConvertible).toBe(true);
    expect(steps).toEqual(original);
  });
});
