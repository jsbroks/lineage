import type {
  InputItemRow,
  InputFieldRow,
  StepRow,
} from "~/app/[org]/tasks/_components/OperationTypeForm";

// ── Simple step intermediate model ─────────────────────────────────────

export type SimpleStepChangeStatus = {
  kind: "change-status";
  targetRef: string;
  statusName: string;
};

export type SimpleStepSetAttributeLiteral = {
  kind: "set-attribute";
  targetRef: string;
  attrKey: string;
  source: "literal";
  literalValue: string;
};

export type SimpleStepSetAttributeField = {
  kind: "set-attribute";
  targetRef: string;
  attrKey: string;
  source: "field";
  fieldRef: string;
};

export type SimpleStepRow =
  | SimpleStepChangeStatus
  | SimpleStepSetAttributeLiteral
  | SimpleStepSetAttributeField;

// ── Simple → StepRow conversion ────────────────────────────────────────

function stepName(step: SimpleStepRow): string {
  if (step.kind === "change-status") {
    return `Set status → ${step.statusName || "?"}`;
  }
  return `Set ${step.attrKey || "attribute"}`;
}

export function simpleStepsToStepRows(steps: SimpleStepRow[]): StepRow[] {
  return steps.map((step) => {
    if (step.kind === "change-status") {
      return {
        name: stepName(step),
        action: "set-item",
        target: step.targetRef,
        value: JSON.stringify({ status: step.statusName }),
      };
    }

    const attrValue =
      step.source === "field"
        ? { from: ["inputs", step.fieldRef] }
        : step.literalValue;

    return {
      name: stepName(step),
      action: "set-item",
      target: step.targetRef,
      value: JSON.stringify({ attributes: { [step.attrKey]: attrValue } }),
    };
  });
}

// ── StepRow → Simple conversion ────────────────────────────────────────

export type ConversionResult = {
  steps: SimpleStepRow[];
  isFullyConvertible: boolean;
};

export function stepRowsToSimpleSteps(rows: StepRow[]): ConversionResult {
  const steps: SimpleStepRow[] = [];
  let isFullyConvertible = true;

  for (const row of rows) {
    if (row.action !== "set-item") {
      isFullyConvertible = false;
      continue;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(row.value) as Record<string, unknown>;
    } catch {
      isFullyConvertible = false;
      continue;
    }

    const hasStatus = "status" in parsed && parsed.status != null;
    const hasAttrs =
      "attributes" in parsed &&
      parsed.attributes != null &&
      typeof parsed.attributes === "object";

    if (hasStatus) {
      if (typeof parsed.status === "string") {
        steps.push({
          kind: "change-status",
          targetRef: row.target,
          statusName: parsed.status,
        });
      } else {
        isFullyConvertible = false;
      }
    }

    if (hasAttrs) {
      const attrs = parsed.attributes as Record<string, unknown>;
      for (const [key, val] of Object.entries(attrs)) {
        if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
          steps.push({
            kind: "set-attribute",
            targetRef: row.target,
            attrKey: key,
            source: "literal",
            literalValue: String(val),
          });
        } else if (
          val != null &&
          typeof val === "object" &&
          "from" in val &&
          Array.isArray((val as { from: unknown }).from)
        ) {
          const fromArr = (val as { from: string[] }).from;
          if (fromArr[0] === "inputs" && typeof fromArr[1] === "string") {
            steps.push({
              kind: "set-attribute",
              targetRef: row.target,
              attrKey: key,
              source: "field",
              fieldRef: fromArr[1],
            });
          } else {
            isFullyConvertible = false;
          }
        } else {
          isFullyConvertible = false;
        }
      }
    }

    if (!hasStatus && !hasAttrs) {
      isFullyConvertible = false;
    }
  }

  return { steps, isFullyConvertible };
}
