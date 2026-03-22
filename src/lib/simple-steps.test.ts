import { describe, it, expect } from "vitest";
import {
  simpleStepsToStepRows,
  stepRowsToSimpleSteps,
  type SimpleStepRow,
} from "./simple-steps";
import type { StepRow } from "~/app/(protected)/[org]/(app)/tasks/_components/OperationTypeForm";

const EMPTY: SimpleStepRow = {
  action: "set-lot-status",
  targetRef: "",
  statusName: "",
  attrKey: "",
  source: "literal",
  literalValue: "",
  fieldRef: "",
};

describe("simpleStepsToStepRows", () => {
  it("converts a set-lot-status step", () => {
    const simple: SimpleStepRow[] = [
      {
        ...EMPTY,
        action: "set-lot-status",
        targetRef: "Block",
        statusName: "Harvested",
      },
    ];
    const rows = simpleStepsToStepRows(simple);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      name: "Set status → Harvested",
      action: "set-lot-status",
      target: "Block",
      value: JSON.stringify({ status: "Harvested" }),
    });
  });

  it("converts a set-lot-attr literal step", () => {
    const simple: SimpleStepRow[] = [
      {
        ...EMPTY,
        action: "set-lot-attr",
        targetRef: "Block",
        attrKey: "Weight",
        source: "literal",
        literalValue: "100",
      },
    ];
    const rows = simpleStepsToStepRows(simple);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.action).toBe("set-lot-attr");
    expect(JSON.parse(rows[0]!.value)).toEqual({
      attrKey: "Weight",
      value: "100",
    });
  });

  it("converts a set-lot-attr field reference step", () => {
    const simple: SimpleStepRow[] = [
      {
        ...EMPTY,
        action: "set-lot-attr",
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
        action: "set-lot-status",
        targetRef: "Block",
        statusName: "Harvested",
      },
      {
        ...EMPTY,
        action: "set-lot-attr",
        targetRef: "Block",
        attrKey: "Weight",
        source: "field",
        fieldRef: "Weight (g)",
      },
    ];
    const rows = simpleStepsToStepRows(simple);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.action).toBe("set-lot-status");
    expect(rows[1]!.action).toBe("set-lot-attr");
  });
});

describe("stepRowsToSimpleSteps", () => {
  it("converts a set-lot-status step row", () => {
    const rows: StepRow[] = [
      {
        name: "Set status",
        action: "set-lot-status",
        target: "Block",
        value: JSON.stringify({ status: "Harvested" }),
      },
    ];
    const result = stepRowsToSimpleSteps(rows);
    expect(result.isFullyConvertible).toBe(true);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toMatchObject({
      action: "set-lot-status",
      targetRef: "Block",
      statusName: "Harvested",
    });
  });

  it("converts a set-lot-attr literal step row", () => {
    const rows: StepRow[] = [
      {
        name: "Set weight",
        action: "set-lot-attr",
        target: "Block",
        value: JSON.stringify({ attrKey: "Weight", value: "100" }),
      },
    ];
    const result = stepRowsToSimpleSteps(rows);
    expect(result.isFullyConvertible).toBe(true);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toMatchObject({
      action: "set-lot-attr",
      targetRef: "Block",
      attrKey: "Weight",
      source: "literal",
      literalValue: "100",
    });
  });

  it("converts a set-lot-attr field-ref step row", () => {
    const rows: StepRow[] = [
      {
        name: "Set harvested by",
        action: "set-lot-attr",
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
      action: "set-lot-attr",
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
        action: "unknown-action",
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
        action: "set-lot-status",
        target: "Block",
        value: "not json",
      },
    ];
    const result = stepRowsToSimpleSteps(rows);
    expect(result.isFullyConvertible).toBe(false);
  });

  it("marks missing statusName as not fully convertible", () => {
    const rows: StepRow[] = [
      {
        name: "Empty",
        action: "set-lot-status",
        target: "Block",
        value: "{}",
      },
    ];
    const result = stepRowsToSimpleSteps(rows);
    expect(result.isFullyConvertible).toBe(false);
  });
});

describe("round-trip conversion", () => {
  it("simple → step → simple preserves set-lot-status", () => {
    const original: SimpleStepRow[] = [
      {
        ...EMPTY,
        action: "set-lot-status",
        targetRef: "Block",
        statusName: "Colonized",
      },
    ];
    const rows = simpleStepsToStepRows(original);
    const { steps, isFullyConvertible } = stepRowsToSimpleSteps(rows);
    expect(isFullyConvertible).toBe(true);
    expect(steps).toEqual(original);
  });

  it("simple → step → simple preserves set-lot-attr with field ref", () => {
    const original: SimpleStepRow[] = [
      {
        ...EMPTY,
        action: "set-lot-attr",
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

  it("simple → step → simple preserves set-lot-attr with literal", () => {
    const original: SimpleStepRow[] = [
      {
        ...EMPTY,
        action: "set-lot-attr",
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
