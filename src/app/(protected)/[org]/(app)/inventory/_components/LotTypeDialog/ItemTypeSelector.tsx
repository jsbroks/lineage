"use client";

import type { FC } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { CreditCard, Factory, Info, Tag } from "lucide-react";

import { cn } from "~/lib/utils";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { DetailsFormValues } from "./LotTypeDialog";

const ITEM_TYPES = [
  { label: "Buy", icon: CreditCard, field: "buy" as const },
  { label: "Make", icon: Factory, field: "make" as const },
  { label: "Sell", icon: Tag, field: "sell" as const },
] as const;

export const ItemTypeSelector: FC = () => {
  const { control } = useFormContext<DetailsFormValues>();

  return (
    <div className="space-y-2">
      <Label>
        Item Type{" "}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent className="max-w-48">
              Select all that apply.
              <br />
              <br />
              Buy: The item is purchased from a supplier.
              <br />
              <br />
              Make: The item is produced in-house.
              <br />
              <br />
              Sell: The item is sold to customers.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Label>

      <div className="grid gap-4 text-center md:grid-cols-3">
        {ITEM_TYPES.map(({ label, icon: Icon, field }) => (
          <Controller
            key={label}
            control={control}
            name={`itemTypes.${field}`}
            render={({ field: { value, onChange } }) => (
              <div
                role="checkbox"
                aria-checked={value}
                tabIndex={0}
                onClick={() => onChange(!value)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    onChange(!value);
                  }
                }}
                className={cn(
                  "relative flex cursor-pointer flex-col items-center space-y-4 rounded-md border p-0 pt-5 transition-colors",
                  value
                    ? "border-foreground"
                    : "hover:border-muted-foreground/50",
                )}
              >
                <Icon className="text-muted-foreground/60 size-10" />
                <span>{label}</span>
                <div className="pointer-events-none absolute top-0 right-0 p-2">
                  <Checkbox checked={value} tabIndex={-1} />
                </div>
              </div>
            )}
          />
        ))}
      </div>
    </div>
  );
};
