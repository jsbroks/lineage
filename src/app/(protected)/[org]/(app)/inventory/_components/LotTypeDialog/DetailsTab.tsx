"use client";

import type { FC } from "react";
import { useFormContext } from "react-hook-form";

import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { GeneralCard } from "./GeneralCard";
import { ItemTypeSelector } from "./ItemTypeSelector";
import { QuantityTrackingSelector } from "./QuantityTrackingSelector";
import { InventoryCard } from "./InventoryCard";
import type { DetailsFormValues } from "./LotTypeDialog";

export const DetailsTab: FC = () => {
  const { register, getValues } = useFormContext<DetailsFormValues>();

  const codePrefix = getValues("codePrefix");
  return (
    <div className="mx-auto w-xl space-y-6 py-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lt-name" className="text-sm">
            Name
          </Label>
          <Input
            id="lt-name"
            required
            placeholder="Fruiting Block"
            {...register("name")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lt-description">Description</Label>
        <Textarea
          id="lt-description"
          placeholder="Optional description"
          {...register("description")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lt-sku" className="text-sm">
            SKU
          </Label>
          <Input
            disabled={codePrefix !== "" || codePrefix != null}
            id="lt-sku"
            placeholder="SKU"
            {...register("codePrefix")}
          />
        </div>
      </div>

      <GeneralCard />
      <ItemTypeSelector />
      <QuantityTrackingSelector />
      <InventoryCard />
    </div>
  );
};
