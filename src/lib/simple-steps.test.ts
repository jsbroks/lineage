import { describe, it, expect } from "vitest";
import {
  simpleStepsToStepRows,
  stepRowsToSimpleSteps,
  type SimpleStepRow,
} from "./simple-steps";
import type { StepRow } from "~/app/[org]/tasks/_components/OperationTypeForm";

const EMPTY: SimpleStepRow = {
  action: "change-status",
  targetRef: "",
  statusName: "",
  attrKey: "",
  source: "literal",
  literalValue: "",
  fieldRef: "",
};

describe("simpleStepsToStepRows", () => {
  it("converts a change-status step", () => {
    const simple: SimpleStepRow[] = [
      {
        ...EMPTY,
        action: "change-status",
        targetRef: "Block",
        statusName: "Harvested",
      },
    ];
    const rows = simpleStepsToStepRows(simple);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      name: "Set status → Harvested",
      action: "change-status",
      target: "Block",
      value: JSON.stringify({ statusName: "Harvested" }),
    });
  });

  it("converts a set-attribute literal step", () => {
    const simple: SimpleStepRow[] = [
      {
        ...EMPTY,
        action: "set-attribute",
        targetRef: "Block",
        attrKey: "Weight",
        source: "literal",
        literalValue: "100",
      },
    ];
    const rows = simpleStepsToStepRows(simple);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.action).toBe("set-attribute");
    expect(JSON.parse(rows[0]!.value)).toEqual({
      attrKey: "Weight",
      value: "100",
    });
  });

  it("converts a set-attribute field reference step", () => {
    const simple: SimpleStepRow[] = [
      {
        ...EMPTY,
        action: "set-attribute",
        targetRef: "Block",
        attrKey: "Harvested By",
        source: "field",
        fieldRef: "Harvested By",
      },
    ];
    const rows = simpleStepsToStepRows(simple);
    expect(rows).toHaveLength(1);
    expect(JSON.parse(rows[0]!.value)).toEqual({
      attrKey: "Harvested By",
      value: { from: ["inputs", "Harvested By"] },
    });
  });

  it("converts multiple steps", () => {
    const simple: SimpleStepRow[] = [
      {
        ...EMPTY,
        action: "change-status",
        targetRef: "Block",
        statusName: "Harvested",
      },
      {
        ...EMPTY,
        action: "set-attribute",
        targetRef: "Block",
        attrKey: "Weight",
        source: "field",
        fieldRef: "Weight (g)",
      },
    ];
    const rows = simpleStepsToStepRows(simple);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.action).toBe("change-status");
    expect(rows[1]!.action).toBe("set-attribute");
  });
});

describe("stepRowsToSimpleSteps", () => {
  it("converts a change-status step row", () => {
    const rows: StepRow[] = [
      {
        name: "Set status",
        action: "change-status",
        target: "Block",
        value: JSON.stringify({ statusName: "Harvested" }),
      },
    ];
    const result = stepRowsToSimpleSteps(rows);
    expect(result.isFullyConvertible).toBe(true);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toMatchObject({
      action: "change-status",
      targetRef: "Block",
      statusName: "Harvested",
    });
  });

  it("converts a set-attribute literal step row", () => {
    const rows: StepRow[] = [
      {
        name: "Set weight",
        action: "set-attribute",
        target: "Block",
        value: JSON.stringify({ attrKey: "Weight", value: "100" }),
      },
    ];
    const result = stepRowsToSimpleSteps(rows);
    expect(result.isFullyConvertible).toBe(true);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toMatchObject({
      action: "set-attribute",
      targetRef: "Block",
      attrKey: "Weight",
      source: "literal",
      literalValue: "100",
    });
  });

  it("converts a set-attribute field-ref step row", () => {
    const rows: StepRow[] = [
      {
        name: "Set harvested by",
        action: "set-attribute",
        target: "Block",
        value: JSON.stringify({
          attrKey: "Harvested By",
          value: { from: ["inputs", "Harvested By"] },
        }),
      },
    ];
    const result = stepRowsToSimpleSteps(rows);
    expect(result.isFullyConvertible).toBe(true);
    expect(result.steps[0]).toMatchObject({
      action: "set-attribute",
      targetRef: "Block",
      attrKey: "Harvested By",
      source: "field",
      fieldRef: "Harvested By",
    });
  });

  it("marks unknown actions as not fully convertible", () => {
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
      {
        name: "Bad",
        action: "change-status",
        target: "Block",
        value: "not json",
      },
    ];
    const result = stepRowsToSimpleSteps(rows);
    expect(result.isFullyConvertible).toBe(false);
  });

  it("marks missing statusName as not fully convertible", () => {
    const rows: StepRow[] = [
      { name: "Empty", action: "change-status", target: "Block", value: "{}" },
    ];
    const result = stepRowsToSimpleSteps(rows);
    expect(result.isFullyConvertible).toBe(false);
  });
});

describe("round-trip conversion", () => {
  it("simple → step → simple preserves change-status", () => {
    const original: SimpleStepRow[] = [
      {
        ...EMPTY,
        action: "change-status",
        targetRef: "Block",
        statusName: "Colonized",
      },
    ];
    const rows = simpleStepsToStepRows(original);
    const { steps, isFullyConvertible } = stepRowsToSimpleSteps(rows);
    expect(isFullyConvertible).toBe(true);
    expect(steps).toEqual(original);
  });

  it("simple → step → simple preserves set-attribute with field ref", () => {
    const original: SimpleStepRow[] = [
      {
        ...EMPTY,
        action: "set-attribute",
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
        ...EMPTY,
        action: "set-attribute",
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
