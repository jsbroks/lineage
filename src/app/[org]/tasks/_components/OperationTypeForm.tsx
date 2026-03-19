"use client";

import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import { GeneralCard } from "./GeneralCard";
import { InputItemsCard } from "./InputItemsCard";
import { InputFieldsCard } from "./InputFieldsCard";
import { StepsCard } from "./StepsCard";

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
  required: boolean;
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
  const [base, setBase] = useState<OperationTypeBaseValues>(
    initialData?.base ?? EMPTY_BASE,
  );
  const [inputItems, setInputItems] = useState<InputItemRow[]>(
    initialData?.inputItems ?? [],
  );
  const [inputFields, setInputFields] = useState<InputFieldRow[]>(
    initialData?.inputFields ?? [],
  );
  const [steps, setSteps] = useState<StepRow[]>(initialData?.steps ?? []);

  useEffect(() => {
    if (!initialData) return;
    setBase(initialData.base);
    setInputItems(initialData.inputItems);
    setInputFields(initialData.inputFields);
    setSteps(initialData.steps);
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ base, inputItems, inputFields, steps });
  };

  const addInputItem = () =>
    setInputItems((prev) => [
      ...prev,
      {
        itemTypeId: "",
        referenceKey: "",
        qtyMin: "0",
        qtyMax: "",
        required: false,
        preconditionsStatuses: [],
      },
    ]);

  const removeInputItem = (idx: number) =>
    setInputItems((prev) => prev.filter((_, i) => i !== idx));

  const updateInputItem = (idx: number, patch: Partial<InputItemRow>) =>
    setInputItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    );

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

  const addStep = () =>
    setSteps((prev) => [
      ...prev,
      { name: "", action: "set-item", target: "", value: "{}" },
    ]);

  const removeStep = (idx: number) =>
    setSteps((prev) => prev.filter((_, i) => i !== idx));

  const updateStep = (idx: number, patch: Partial<StepRow>) =>
    setSteps((prev) =>
      prev.map((step, i) => (i === idx ? { ...step, ...patch } : step)),
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <GeneralCard base={base} setBase={setBase} />

      <InputItemsCard
        inputItems={inputItems}
        onAdd={addInputItem}
        onRemove={removeInputItem}
        onUpdate={updateInputItem}
      />

      <InputFieldsCard
        inputFields={inputFields}
        onAdd={addInputField}
        onRemove={removeInputField}
        onUpdate={updateInputField}
      />

      <StepsCard
        steps={steps}
        inputItems={inputItems}
        onAdd={addStep}
        onRemove={removeStep}
        onUpdate={updateStep}
      />

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
