"use client";

import type { FC } from "react";
import { useFormContext } from "react-hook-form";

import { Card, CardContent } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import {
  STOCK_UOM_OPTIONS,
  MASS_UNITS,
  isMassStockUom,
} from "~/lib/measurements";
import type { DetailsFormValues } from "./LotTypeDialog";

export const InventoryCard: FC = () => {
  const { register, watch } = useFormContext<DetailsFormValues>();
  const qtyUom = watch("qtyUom");
  const isMassUom = isMassStockUom(qtyUom);

  return (
    <div className="space-y-2">
      <Label>Inventory</Label>
      <Card>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <label>Default location</label>
            <input
              className="max-w-32 text-right outline-none"
              placeholder="Select location"
              {...register("defaultLocation")}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <label>Default unit of measurement (UOM)</label>
            <select
              className="max-w-48 text-right outline-none"
              {...register("qtyUom")}
            >
              <option value="" disabled>
                Set UoM
              </option>
              {STOCK_UOM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {!isMassUom && (
            <>
              <Separator />
              <div className="flex justify-between">
                <label className="grow">Weight per unit</label>
                <div className="text-muted-foreground">uL =</div>
                <input
                  className="max-w-15 text-right outline-none"
                  placeholder="0"
                  {...register("weightPerUnit")}
                />
                <select
                  className="text-muted-foreground ml-1 w-10 text-right outline-none"
                  {...register("weightUnit")}
                >
                  {MASS_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <Separator />
          <div className="flex justify-between">
            <label>Default unit sell price</label>
            <input
              className="max-w-16 text-right outline-none"
              placeholder="0.00"
              {...register("defaultUnitPrice")}
            />
          </div>

          <Separator />
          <div className="flex justify-between">
            <label>Default unit purchase price</label>
            <input
              className="max-w-16 text-right outline-none"
              placeholder="0.00"
              {...register("defaultPurchasePrice")}
            />
          </div>

          <Separator />
          <div className="flex justify-between">
            <label>Minimum stock level</label>
            <input
              className="max-w-16 text-right outline-none"
              placeholder="0"
              {...register("minimumStockLevel")}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
