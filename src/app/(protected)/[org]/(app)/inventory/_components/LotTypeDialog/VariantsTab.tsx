"use client";

import { useCallback, useEffect, useState } from "react";
import type { FC } from "react";
import { Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { OptionEditor, type OptionRow } from "./OptionEditor";
import { GeneratedVariants, type VariantRow } from "./GeneratedVariants";

function cartesian(sets: string[][]): string[][] {
  if (sets.length === 0) return [[]];
  const [first, ...rest] = sets;
  const restCombos = cartesian(rest);
  return first!.flatMap((val) => restCombos.map((combo) => [val, ...combo]));
}

export const VariantsTab: FC = () => {
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [newValueInputs, setNewValueInputs] = useState<Record<number, string>>(
    {},
  );
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);

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
          defaultUnitCost: "",
          defaultQuantity: "",
          defaultQuantityUnit: "",
        };
      });
    });
  }, [options]);

  const addOption = useCallback(
    () =>
      setOptions((prev) => [...prev, { name: "", values: [], expanded: true }]),
    [],
  );

  const removeOption = useCallback((idx: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
    setNewValueInputs((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  }, []);

  const updateOption = useCallback(
    (idx: number, patch: Partial<OptionRow>) =>
      setOptions((prev) =>
        prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
      ),
    [],
  );

  const addValueToOption = useCallback(
    (idx: number) => {
      const val = (newValueInputs[idx] ?? "").trim();
      if (!val) return;
      setOptions((prev) =>
        prev.map((o, i) =>
          i === idx ? { ...o, values: [...o.values, val] } : o,
        ),
      );
      setNewValueInputs((prev) => ({ ...prev, [idx]: "" }));
    },
    [newValueInputs],
  );

  const removeValueFromOption = useCallback(
    (optIdx: number, valIdx: number) =>
      setOptions((prev) =>
        prev.map((o, i) =>
          i === optIdx
            ? { ...o, values: o.values.filter((_, vi) => vi !== valIdx) }
            : o,
        ),
      ),
    [],
  );

  const updateVariant = useCallback(
    (idx: number, patch: Partial<VariantRow>) =>
      setVariants((prev) =>
        prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
      ),
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label>Options</Label>
          <p className="text-muted-foreground text-xs">
            Add options like species, size, or color. Varieties are generated
            from their combinations.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addOption}>
          <Plus className="mr-1 size-3.5" /> Add option
        </Button>
      </div>

      {options.length === 0 && (
        <div className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
          No options defined yet. Add an option to start creating varieties.
        </div>
      )}

      {options.map((opt, idx) => (
        <OptionEditor
          key={idx}
          option={opt}
          newValue={newValueInputs[idx] ?? ""}
          onUpdate={(patch) => updateOption(idx, patch)}
          onRemove={() => removeOption(idx)}
          onAddValue={() => addValueToOption(idx)}
          onRemoveValue={(valIdx) => removeValueFromOption(idx, valIdx)}
          onNewValueChange={(v) =>
            setNewValueInputs((prev) => ({ ...prev, [idx]: v }))
          }
        />
      ))}

      {options.length > 0 && (
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
          onClick={addOption}
        >
          <Plus className="size-3.5" /> Add another option
        </button>
      )}

      <GeneratedVariants
        variants={variants}
        expandedVariant={expandedVariant}
        onExpandVariant={setExpandedVariant}
        onUpdateVariant={updateVariant}
      />
    </div>
  );
};
