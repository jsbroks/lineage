import type { StepRow } from "~/app/[org]/tasks/_components/OperationTypeForm";

// ── Simple step model ───────────────────────────────────────────────
// Single flat type; the `action` field determines which properties
// are relevant.  Maps 1:1 to an engine action of the same name.

export type SimpleStepRow = {
  action: "set-item-status" | "set-item-attr";
  targetRef: string;
  /** set-item-status: the status name to apply */
  statusName: string;
  /** set-item-attr: the attribute key */
  attrKey: string;
  /** set-item-attr: where the value comes from */
  source: "literal" | "field";
  /** set-item-attr + literal: the fixed value */
  literalValue: string;
  /** set-item-attr + field: the input field reference key */
  fieldRef: string;
};

// ── Simple → StepRow conversion ─────────────────────────────────────

function stepName(step: SimpleStepRow): string {
  if (step.action === "set-item-status") {
    return `Set status → ${step.statusName || "?"}`;
  }
  return `Set ${step.attrKey || "attribute"}`;
}

function stepValue(step: SimpleStepRow): string {
  if (step.action === "set-item-status") {
    return JSON.stringify({ status: step.statusName });
  }

  const value =
    step.source === "field"
      ? { from: ["inputs", step.fieldRef] }
      : step.literalValue;

  return JSON.stringify({ attrKey: step.attrKey, value });
}

export function simpleStepsToStepRows(steps: SimpleStepRow[]): StepRow[] {
  return steps.map((step) => ({
    name: stepName(step),
    action: step.action,
    target: step.targetRef,
    value: stepValue(step),
  }));
}

// ── StepRow → Simple conversion ─────────────────────────────────────

export type ConversionResult = {
  steps: SimpleStepRow[];
  isFullyConvertible: boolean;
};

const EMPTY: SimpleStepRow = {
  action: "set-item-status",
  targetRef: "",
  statusName: "",
  attrKey: "",
  source: "literal",
  literalValue: "",
  fieldRef: "",
};

export function stepRowsToSimpleSteps(rows: StepRow[]): ConversionResult {
  const steps: SimpleStepRow[] = [];
  let isFullyConvertible = true;

  for (const row of rows) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(row.value) as Record<string, unknown>;
    } catch {
      isFullyConvertible = false;
      continue;
    }

    if (row.action === "set-item-status") {
      const name = parsed.status;
      if (typeof name === "string") {
        steps.push({
          ...EMPTY,
          action: "set-item-status",
          targetRef: row.target,
          statusName: name,
        });
      } else {
        isFullyConvertible = false;
      }
    } else if (row.action === "set-item-attr") {
      const attrKey = parsed.attrKey;
      const val = parsed.value;
      if (typeof attrKey !== "string") {
        isFullyConvertible = false;
        continue;
      }

      if (
        val != null &&
        typeof val === "object" &&
        "from" in val &&
        Array.isArray((val as { from: unknown }).from)
      ) {
        const fromArr = (val as { from: string[] }).from;
        if (fromArr[0] === "inputs" && typeof fromArr[1] === "string") {
          steps.push({
            ...EMPTY,
            action: "set-item-attr",
            targetRef: row.target,
            attrKey,
            source: "field",
            fieldRef: fromArr[1],
          });
        } else {
          isFullyConvertible = false;
        }
      } else if (
        typeof val === "string" ||
        typeof val === "number" ||
        typeof val === "boolean"
      ) {
        steps.push({
          ...EMPTY,
          action: "set-item-attr",
          targetRef: row.target,
          attrKey,
          source: "literal",
          literalValue: String(val),
        });
      } else {
        isFullyConvertible = false;
      }
    } else {
      isFullyConvertible = false;
    }
  }

  return { steps, isFullyConvertible };
}
