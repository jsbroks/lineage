"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { determineItemTypeCode } from "~/lib/item-type-code";
import { GeneralCard } from "./GeneralCard";
import { VariantsCard } from "./VariantsCard";
import { GeneratedVariantsCard } from "./GeneratedVariantsCard";
import { StatusesCard } from "./StatusesCard";
import { TransitionsCard } from "./TransitionsCard";
import { AttributesCard } from "./AttributesCard";

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function cartesian(sets: string[][]): string[][] {
  if (sets.length === 0) return [[]];
  const [first, ...rest] = sets;
  const restCombos = cartesian(rest);
  return first!.flatMap((val) => restCombos.map((combo) => [val, ...combo]));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ItemTypeFormValues = {
  name: string;
  category: string;
  defaultUom: string;
  quantityName: string;
  description: string;
  icon: string;
  color: string;
  codePrefix: string;
  codeNextNumber: string;
};

export type OptionRow = {
  id?: string;
  name: string;
  values: string[];
  expanded: boolean;
};

export type VariantRow = {
  id?: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  defaultValue: string;
  defaultValueCurrency: string;
  defaultQuantity: string;
  defaultQuantityUnit: string;
};

export type StatusRow = {
  id?: string;
  name: string;
  color: string;
  isInitial: boolean;
  isTerminal: boolean;
};

export type TransitionRow = {
  fromSlug: string;
  toSlug: string;
};

export type AttributeDefinitionRow = {
  id?: string;
  attrKey: string;
  dataType: "text" | "number" | "boolean" | "date" | "select";
  isRequired: boolean;
  unit: string;
};

export type ItemTypeFormData = {
  base: ItemTypeFormValues;
  options: OptionRow[];
  variants: VariantRow[];
  statuses: StatusRow[];
  transitions: TransitionRow[];
  attributeDefinitions: AttributeDefinitionRow[];
};

const EMPTY_BASE: ItemTypeFormValues = {
  name: "",
  category: "",
  defaultUom: "each",
  quantityName: "",
  description: "",
  icon: "",
  color: "",
  codePrefix: "",
  codeNextNumber: "1",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = {
  initialData?: ItemTypeFormData;
  onSubmit: (data: ItemTypeFormData) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
};

export function ItemTypeForm({
  initialData,
  onSubmit,
  isSubmitting,
  submitLabel,
}: Props) {
  const [base, setBase] = useState<ItemTypeFormValues>(
    initialData?.base ?? EMPTY_BASE,
  );
  const [options, setOptions] = useState<OptionRow[]>(
    initialData?.options ?? [],
  );
  const [variants, setVariants] = useState<VariantRow[]>(
    initialData?.variants ?? [],
  );
  const [statuses, setStatuses] = useState<StatusRow[]>(
    initialData?.statuses ?? [],
  );
  const [transitions, setTransitions] = useState<TransitionRow[]>(
    initialData?.transitions ?? [],
  );
  const [attrDefs, setAttrDefs] = useState<AttributeDefinitionRow[]>(
    initialData?.attributeDefinitions ?? [],
  );
  const [newValueInputs, setNewValueInputs] = useState<Record<number, string>>(
    {},
  );
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);
  const codePrefixTouched = useRef(!!initialData?.base.codePrefix);

  useEffect(() => {
    if (!initialData) return;
    setBase(initialData.base);
    setOptions(initialData.options);
    setVariants(initialData.variants);
    setStatuses(initialData.statuses);
    setTransitions(initialData.transitions);
    setAttrDefs(initialData.attributeDefinitions);
  }, [initialData]);

  useEffect(() => {
    const sets = options.map((o) => o.values).filter((v) => v.length > 0);
    if (sets.length === 0) {
      setVariants([]);
      return;
    }
    const combos = cartesian(sets);
    const names = combos.map((c) => c.join(" / "));
    setVariants((prev) => {
      const byName = new Map(prev.map((v) => [v.name, v]));
      return names.map((name, i) => {
        const existing = byName.get(name);
        if (existing) return { ...existing, isDefault: i === 0 };
        return {
          name,
          isDefault: i === 0,
          isActive: true,
          defaultValue: "",
          defaultValueCurrency: "",
          defaultQuantity: "",
          defaultQuantityUnit: "",
        };
      });
    });
  }, [options]);

  // -- Handlers --

  const handleNameChange = (value: string) => {
    setBase((prev) => {
      const next = { ...prev, name: value };
      if (!codePrefixTouched.current) {
        next.codePrefix = determineItemTypeCode({ name: value, slug: slugify(value) });
      }
      return next;
    });
  };

  const handleCodePrefixChange = (value: string) => {
    codePrefixTouched.current = true;
    setBase((prev) => ({ ...prev, codePrefix: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      base,
      options,
      variants,
      statuses,
      transitions,
      attributeDefinitions: attrDefs,
    });
  };

  // -- Options --

  const addOption = () =>
    setOptions((prev) => [...prev, { name: "", values: [], expanded: true }]);

  const removeOption = (idx: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
    setNewValueInputs((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const updateOption = (idx: number, patch: Partial<OptionRow>) =>
    setOptions((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
    );

  const addValueToOption = (optIdx: number) => {
    const val = (newValueInputs[optIdx] ?? "").trim();
    if (!val) return;
    setOptions((prev) =>
      prev.map((o, i) =>
        i === optIdx ? { ...o, values: [...o.values, val] } : o,
      ),
    );
    setNewValueInputs((prev) => ({ ...prev, [optIdx]: "" }));
  };

  const removeValueFromOption = (optIdx: number, valIdx: number) =>
    setOptions((prev) =>
      prev.map((o, i) =>
        i === optIdx
          ? { ...o, values: o.values.filter((_, vi) => vi !== valIdx) }
          : o,
      ),
    );

  const handleNewValueInputChange = (optIdx: number, value: string) =>
    setNewValueInputs((prev) => ({ ...prev, [optIdx]: value }));

  // -- Variants --

  const updateVariant = (idx: number, patch: Partial<VariantRow>) =>
    setVariants((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
    );

  // -- Statuses --

  const addStatus = () => {
    setStatuses((prev) => [
      ...prev,
      {
        name: "",
        color: "",
        isInitial: prev.length === 0,
        isTerminal: false,
      },
    ]);
  };

  const removeStatus = (idx: number) => {
    const removed = statuses[idx];
    if (!removed) return;
    setStatuses((prev) => prev.filter((_, i) => i !== idx));
    setTransitions((prev) =>
      prev.filter(
        (t) => t.fromSlug !== removed.name && t.toSlug !== removed.name,
      ),
    );
  };

  const updateStatus = (idx: number, patch: Partial<StatusRow>) => {
    const old = statuses[idx];
    setStatuses((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
    if (patch.name && old) {
      setTransitions((prev) =>
        prev.map((t) => ({
          fromSlug: t.fromSlug === old.name ? patch.name! : t.fromSlug,
          toSlug: t.toSlug === old.name ? patch.name! : t.toSlug,
        })),
      );
    }
  };

  // -- Transitions --

  const addTransition = () =>
    setTransitions((prev) => [...prev, { fromSlug: "", toSlug: "" }]);

  const removeTransition = (idx: number) =>
    setTransitions((prev) => prev.filter((_, i) => i !== idx));

  const updateTransition = (idx: number, patch: Partial<TransitionRow>) =>
    setTransitions((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    );

  // -- Attribute definitions --

  const addAttrDef = () =>
    setAttrDefs((prev) => [
      ...prev,
      { attrKey: "", dataType: "text", isRequired: false, unit: "" },
    ]);

  const removeAttrDef = (idx: number) =>
    setAttrDefs((prev) => prev.filter((_, i) => i !== idx));

  const updateAttrDef = (idx: number, patch: Partial<AttributeDefinitionRow>) =>
    setAttrDefs((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <GeneralCard
        base={base}
        setBase={setBase}
        onNameChange={handleNameChange}
        onCodePrefixChange={handleCodePrefixChange}
      />

      <VariantsCard
        options={options}
        newValueInputs={newValueInputs}
        onAddOption={addOption}
        onRemoveOption={removeOption}
        onUpdateOption={updateOption}
        onAddValue={addValueToOption}
        onRemoveValue={removeValueFromOption}
        onNewValueInputChange={handleNewValueInputChange}
      />

      <GeneratedVariantsCard
        variants={variants}
        expandedVariant={expandedVariant}
        onExpandVariant={setExpandedVariant}
        onUpdateVariant={updateVariant}
      />

      <StatusesCard
        statuses={statuses}
        onAdd={addStatus}
        onRemove={removeStatus}
        onUpdate={updateStatus}
      />

      <TransitionsCard
        statuses={statuses}
        transitions={transitions}
        onAdd={addTransition}
        onRemove={removeTransition}
        onUpdate={updateTransition}
      />

      <AttributesCard
        attrDefs={attrDefs}
        onAdd={addAttrDef}
        onRemove={removeAttrDef}
        onUpdate={updateAttrDef}
      />

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
