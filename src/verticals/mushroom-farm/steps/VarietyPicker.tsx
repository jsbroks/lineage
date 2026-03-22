"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { StepProps } from "../../types";
import type { MushroomWizardAnswers } from "../config";
import { VARIETY_CATALOG } from "../seed-data";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export function VarietyPicker({ answers, onNext, onBack }: StepProps<MushroomWizardAnswers>) {
  const initial = answers.varieties ?? [];
  const [selected, setSelected] = useState<string[]>(initial);
  const [custom, setCustom] = useState("");

  function toggle(label: string) {
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label],
    );
  }

  function addCustom() {
    const trimmed = custom.trim();
    if (trimmed && !selected.includes(trimmed)) {
      setSelected((prev) => [...prev, trimmed]);
      setCustom("");
    }
  }

  const allLabels = [
    ...VARIETY_CATALOG.map((v) => v.label),
    ...selected.filter((s) => !VARIETY_CATALOG.some((c) => c.label === s)),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">What varieties do you grow?</h2>
        <p className="text-muted-foreground text-sm">
          Tap to select. You can add more later in settings.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {allLabels.map((label) => {
          const isSelected = selected.includes(label);
          const isCustom = !VARIETY_CATALOG.some((c) => c.label === label);
          return (
            <button
              key={label}
              type="button"
              onClick={() => toggle(label)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-muted-foreground/40 hover:bg-muted/50"
              }`}
            >
              {label}
              {isCustom && isSelected && <X className="size-3" />}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add a custom variety..."
        />
        <Button
          type="button"
          variant="outline"
          onClick={addCustom}
          disabled={!custom.trim()}
        >
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          onClick={() => onNext({ varieties: selected })}
          disabled={selected.length === 0}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
