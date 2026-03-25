"use client";

import type { FC } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Grid2x2, LayoutGrid } from "lucide-react";

import { cn } from "~/lib/utils";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import type { DetailsFormValues } from "./LotTypeDialog";

const TRACKING_OPTIONS = [
  {
    value: "standard" as const,
    label: "Standard",
    description: "Track quantity only",
    detail: "For bulk, unpackaged, or non-serialized inventory",
    icon: Grid2x2,
  },
  {
    value: "serialized" as const,
    label: "Serialized",
    description: "Track quantity by label",
    detail: "For serialized, batch, or lot-based inventory",
    icon: LayoutGrid,
  },
];

export const QuantityTrackingSelector: FC = () => {
  const { control } = useFormContext<DetailsFormValues>();

  return (
    <div className="space-y-2">
      <Label>Quantity Tracking</Label>

      <Controller
        control={control}
        name="trackingType"
        render={({ field: { value, onChange } }) => (
          <div className="grid gap-4 md:grid-cols-2">
            {TRACKING_OPTIONS.map(
              ({ value: optValue, label, description, detail, icon: Icon }) => {
                const selected = value === optValue;
                return (
                  <div
                    key={optValue}
                    role="radio"
                    aria-checked={selected}
                    tabIndex={0}
                    onClick={() => onChange(optValue)}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        onChange(optValue);
                      }
                    }}
                    className={cn(
                      "relative flex cursor-pointer flex-col items-center gap-1 rounded-md border px-4 pt-6 pb-5 text-center transition-colors",
                      selected
                        ? "border-foreground bg-muted/40"
                        : "hover:border-muted-foreground/50",
                    )}
                  >
                    <Icon className="text-muted-foreground/60 size-8" />
                    <span className="text-sm font-medium">{label}</span>
                    <p className="text-muted-foreground text-xs">
                      {description}
                    </p>
                    <p className="text-muted-foreground/70 text-xs">{detail}</p>
                    <div className="pointer-events-none absolute top-0 right-0 p-2">
                      <Checkbox checked={selected} tabIndex={-1} />
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      />
    </div>
  );
};
