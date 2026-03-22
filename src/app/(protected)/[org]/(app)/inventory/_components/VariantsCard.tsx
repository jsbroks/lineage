"use client";

import { GripVertical, Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { OptionRow } from "./LotTypeForm";

type VariantsCardProps = {
  options: OptionRow[];
  newValueInputs: Record<number, string>;
  onAddOption: () => void;
  onRemoveOption: (idx: number) => void;
  onUpdateOption: (idx: number, patch: Partial<OptionRow>) => void;
  onAddValue: (optIdx: number) => void;
  onRemoveValue: (optIdx: number, valIdx: number) => void;
  onNewValueInputChange: (optIdx: number, value: string) => void;
};

export function VariantsCard({
  options,
  newValueInputs,
  onAddOption,
  onRemoveOption,
  onUpdateOption,
  onAddValue,
  onRemoveValue,
  onNewValueInputChange,
}: VariantsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Variants</CardTitle>
            <CardDescription>
              Add options like size or color. Variants are generated from their
              combinations.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddOption}
          >
            <Plus className="mr-1 size-3.5" /> Add variant
          </Button>
        </div>
      </CardHeader>
      {options.length > 0 && (
        <CardContent className="space-y-4">
          {options.map((opt, optIdx) => (
            <div key={optIdx} className="rounded-lg border">
              <button
                type="button"
                className="flex w-full items-center gap-3 p-4 text-left"
                onClick={() =>
                  onUpdateOption(optIdx, { expanded: !opt.expanded })
                }
              >
                <GripVertical className="text-muted-foreground size-4 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {opt.name || "Untitled option"}
                  </p>
                  {opt.values.length > 0 && !opt.expanded && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {opt.values.map((val, vi) => (
                        <span
                          key={vi}
                          className="bg-muted rounded px-1.5 py-0.5 text-xs"
                        >
                          {val}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>

              {opt.expanded && (
                <div className="space-y-3 border-t px-4 pt-3 pb-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Option name</Label>
                    <Input
                      value={opt.name}
                      onChange={(e) =>
                        onUpdateOption(optIdx, { name: e.target.value })
                      }
                      placeholder="Size"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Option values</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {opt.values.map((val, vi) => (
                        <span
                          key={vi}
                          className="bg-muted inline-flex items-center gap-1 rounded px-2 py-1 text-xs"
                        >
                          {val}
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => onRemoveValue(optIdx, vi)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={newValueInputs[optIdx] ?? ""}
                        onChange={(e) =>
                          onNewValueInputChange(optIdx, e.target.value)
                        }
                        placeholder="Add value..."
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            onAddValue(optIdx);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onAddValue(optIdx)}
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => onRemoveOption(optIdx)}
                    >
                      Delete
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        onUpdateOption(optIdx, { expanded: false })
                      }
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
            onClick={onAddOption}
          >
            <Plus className="size-3.5" /> Add another option
          </button>
        </CardContent>
      )}
    </Card>
  );
}
