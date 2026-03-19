"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "~/components/ui/button";
import { GeneralCard } from "./GeneralCard";
import { SimpleInputItemsCard } from "./SimpleInputItemsCard";
import { SimpleInputFieldsCard } from "./SimpleInputFieldsCard";
import { SimpleStepsCard } from "./SimpleStepsCard";
import {
  simpleStepsToStepRows,
  stepRowsToSimpleSteps,
  type SimpleStepRow,
} from "~/lib/simple-steps";

export type OperationTypeBaseValues = {
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
};

export type InputItemRow = {
  id?: string;
  itemTypeId: string;
  referenceKey: string;
  qtyMin: string;
  qtyMax: string;
  preconditionsStatuses: string[];
};

export type InputFieldRow = {
  id?: string;
  referenceKey: string;
  label: string;
  description: string;
  type: string;
  required: boolean;
};

export type StepRow = {
  id?: string;
  name: string;
  action: string;
  target: string;
  value: string;
};

export type OperationTypeFormData = {
  base: OperationTypeBaseValues;
  inputItems: InputItemRow[];
  inputFields: InputFieldRow[];
  steps: StepRow[];
};

const EMPTY_BASE: OperationTypeBaseValues = {
  name: "",
  description: "",
  icon: "",
  color: "",
  category: "",
};

type Props = {
  initialData?: OperationTypeFormData;
  onSubmit: (data: OperationTypeFormData) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
};

export function OperationTypeForm({
  initialData,
  onSubmit,
  isSubmitting,
  submitLabel,
}: Props) {
  const initialConversion = useMemo(() => {
    if (!initialData?.steps.length)
      return { steps: [], isFullyConvertible: true };
    return stepRowsToSimpleSteps(initialData.steps);
  }, [initialData]);

  const [base, setBase] = useState<OperationTypeBaseValues>(
    initialData?.base ?? EMPTY_BASE,
  );
  const [inputItems, setInputItems] = useState<InputItemRow[]>(
    initialData?.inputItems ?? [],
  );
  const [inputFields, setInputFields] = useState<InputFieldRow[]>(
    initialData?.inputFields ?? [],
  );
  const [simpleSteps, setSimpleSteps] = useState<SimpleStepRow[]>(
    initialConversion.steps,
  );

  useEffect(() => {
    if (!initialData) return;
    setBase(initialData.base);
    setInputItems(initialData.inputItems);
    setInputFields(initialData.inputFields);

    const conversion = stepRowsToSimpleSteps(initialData.steps);
    setSimpleSteps(conversion.steps);
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const steps = simpleStepsToStepRows(simpleSteps);
    await onSubmit({ base, inputItems, inputFields, steps });
  };

  // ── Input items CRUD ───────────────────────────────────────────────

  const addInputItem = () =>
    setInputItems((prev) => [
      ...prev,
      {
        itemTypeId: "",
        referenceKey: "",
        qtyMin: "1",
        qtyMax: "",
        preconditionsStatuses: [],
      },
    ]);

  const removeInputItem = (idx: number) =>
    setInputItems((prev) => prev.filter((_, i) => i !== idx));

  const updateInputItem = (idx: number, patch: Partial<InputItemRow>) =>
    setInputItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    );

  // ── Input fields CRUD ──────────────────────────────────────────────

  const addInputField = () =>
    setInputFields((prev) => [
      ...prev,
      {
        referenceKey: "",
        label: "",
        description: "",
        type: "string",
        required: false,
      },
    ]);

  const removeInputField = (idx: number) =>
    setInputFields((prev) => prev.filter((_, i) => i !== idx));

  const updateInputField = (idx: number, patch: Partial<InputFieldRow>) =>
    setInputFields((prev) =>
      prev.map((field, i) => (i === idx ? { ...field, ...patch } : field)),
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <GeneralCard base={base} setBase={setBase} />

      <SimpleInputItemsCard
        inputItems={inputItems}
        onAdd={addInputItem}
        onRemove={removeInputItem}
        onUpdate={updateInputItem}
      />

      <SimpleInputFieldsCard
        inputFields={inputFields}
        onAdd={addInputField}
        onRemove={removeInputField}
        onUpdate={updateInputField}
      />

      <SimpleStepsCard
        steps={simpleSteps}
        inputItems={inputItems}
        inputFields={inputFields}
        onUpdate={setSimpleSteps}
      />

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
