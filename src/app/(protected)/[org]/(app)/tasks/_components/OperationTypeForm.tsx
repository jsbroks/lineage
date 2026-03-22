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

export type InputRow = {
  id?: string;
  referenceKey: string;
  label: string;
  description: string;
  type: string;
  required: boolean;
  sortOrder: number;
  itemTypeId?: string;
  qtyMin?: string;
  qtyMax?: string;
  preconditionsStatuses?: string[];
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
  inputs: InputRow[];
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
  const [inputs, setInputs] = useState<InputRow[]>(
    initialData?.inputs ?? [],
  );
  const [simpleSteps, setSimpleSteps] = useState<SimpleStepRow[]>(
    initialConversion.steps,
  );

  useEffect(() => {
    if (!initialData) return;
    setBase(initialData.base);
    setInputs(initialData.inputs);

    const conversion = stepRowsToSimpleSteps(initialData.steps);
    setSimpleSteps(conversion.steps);
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const steps = simpleStepsToStepRows(simpleSteps);
    await onSubmit({ base, inputs, steps });
  };

  const inputItems = inputs.filter((i) => i.type === "items");
  const inputFields = inputs.filter((i) => i.type !== "items");

  const addInputItem = () =>
    setInputs((prev) => [
      ...prev,
      {
        type: "items",
        referenceKey: "",
        label: "",
        description: "",
        required: false,
        sortOrder: prev.length,
        itemTypeId: "",
        qtyMin: "1",
        qtyMax: "",
        preconditionsStatuses: [],
      },
    ]);

  const removeInput = (idx: number) =>
    setInputs((prev) => prev.filter((_, i) => i !== idx));

  const updateInput = (idx: number, patch: Partial<InputRow>) =>
    setInputs((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    );

  const addInputField = () =>
    setInputs((prev) => [
      ...prev,
      {
        type: "string",
        referenceKey: "",
        label: "",
        description: "",
        required: false,
        sortOrder: prev.length,
      },
    ]);

  const itemInputIndices = inputs
    .map((inp, i) => (inp.type === "items" ? i : -1))
    .filter((i) => i >= 0);
  const fieldInputIndices = inputs
    .map((inp, i) => (inp.type !== "items" ? i : -1))
    .filter((i) => i >= 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <GeneralCard base={base} setBase={setBase} />

      <SimpleInputItemsCard
        inputItems={itemInputIndices.map((i) => inputs[i]!)}
        onAdd={addInputItem}
        onRemove={(localIdx) => removeInput(itemInputIndices[localIdx]!)}
        onUpdate={(localIdx, patch) =>
          updateInput(itemInputIndices[localIdx]!, patch)
        }
      />

      <SimpleInputFieldsCard
        inputFields={fieldInputIndices.map((i) => inputs[i]!)}
        onAdd={addInputField}
        onRemove={(localIdx) => removeInput(fieldInputIndices[localIdx]!)}
        onUpdate={(localIdx, patch) =>
          updateInput(fieldInputIndices[localIdx]!, patch)
        }
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
