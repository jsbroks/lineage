"use client";

import { ChevronDown } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { VariantRow } from "./LotTypeForm";

type GeneratedVariantsCardProps = {
  variants: VariantRow[];
  expandedVariant: string | null;
  onExpandVariant: (name: string | null) => void;
  onUpdateVariant: (idx: number, patch: Partial<VariantRow>) => void;
};

export function GeneratedVariantsCard({
  variants,
  expandedVariant,
  onExpandVariant,
  onUpdateVariant,
}: GeneratedVariantsCardProps) {
  if (variants.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Variants</CardTitle>
        <CardDescription>
          {variants.length} variant{variants.length !== 1 && "s"} generated from
          option combinations. Expand to set defaults.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {variants.map((v, idx) => {
          const isOpen = expandedVariant === v.name;
          const hasDefaults =
            v.defaultValue !== "" ||
            v.defaultQuantity !== "" ||
            v.defaultQuantityUnit !== "";
          return (
            <div key={v.name} className="rounded-md border">
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                onClick={() => onExpandVariant(isOpen ? null : v.name)}
              >
                <div className="flex flex-1 items-center gap-2">
                  <span className="text-sm font-medium">{v.name}</span>
                  {hasDefaults && (
                    <span className="bg-primary size-1.5 rounded-full" />
                  )}
                </div>
                <ChevronDown
                  className={`text-muted-foreground size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div className="grid grid-cols-2 gap-2 border-t px-3 pt-2 pb-3 md:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Value (cents)</Label>
                    <Input
                      type="number"
                      value={v.defaultValue}
                      onChange={(e) =>
                        onUpdateVariant(idx, {
                          defaultValue: e.target.value,
                        })
                      }
                      placeholder="0"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Currency</Label>
                    <Input
                      value={v.defaultValueCurrency}
                      onChange={(e) =>
                        onUpdateVariant(idx, {
                          defaultValueCurrency: e.target.value,
                        })
                      }
                      placeholder="CAD"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Quantity</Label>
                    <Input
                      type="number"
                      value={v.defaultQuantity}
                      onChange={(e) =>
                        onUpdateVariant(idx, {
                          defaultQuantity: e.target.value,
                        })
                      }
                      placeholder="0"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Qty Unit</Label>
                    <Input
                      value={v.defaultQuantityUnit}
                      onChange={(e) =>
                        onUpdateVariant(idx, {
                          defaultQuantityUnit: e.target.value,
                        })
                      }
                      placeholder="lb"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
