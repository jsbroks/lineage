"use client";

import type { FC } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Info } from "lucide-react";

import { Card, CardContent } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  Icon,
  type IconComponentName,
  IconComponents,
} from "~/app/_components/IconPicker";
import { Colors, getColorClasses } from "~/app/_components/ColorSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import type { DetailsFormValues } from "./LotTypeDialog";

export const GeneralCard: FC = () => {
  const { register, control, watch } = useFormContext<DetailsFormValues>();
  const iconValue = watch("icon");
  const colorValue = watch("color");

  return (
    <div className="space-y-2">
      <Label>General</Label>
      <Card className="rounded-md">
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <label>Icon</label>
            <Controller
              control={control}
              name="icon"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    size="other"
                    className="m-0 max-w-64 border-none p-0 shadow-none outline-none"
                  >
                    <SelectValue placeholder="Select an icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(IconComponents)
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([name]) => (
                        <SelectItem key={name} value={name}>
                          <Icon icon={name as IconComponentName} /> {name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <label>Color</label>
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    size="other"
                    className="m-0 max-w-32 border-none p-0 shadow-none outline-none"
                  >
                    <SelectValue
                      placeholder="Select color"
                      className="text-right"
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(Colors).map(([name, color]) => (
                      <SelectItem
                        key={color}
                        value={color}
                        className="flex items-center gap-2"
                      >
                        <div
                          className={cn(
                            "size-4 h-5 w-full rounded-sm px-2 text-sm hover:text-inherit",
                            getColorClasses(color).text,
                            getColorClasses(color).bg,
                          )}
                        >
                          {name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <Separator />
          <div className="flex justify-between">
            <label>Category</label>
            <input
              className="max-w-32 text-right outline-none"
              placeholder="Select category"
              {...register("categoryId")}
            />
          </div>
          <Separator />
          <div className="flex justify-between">
            <label>Default Status</label>
            <input
              className="max-w-32 text-right outline-none"
              placeholder="Active"
              {...register("defaultStatus")}
            />
          </div>
          <Separator />
          <div className="flex justify-between">
            <label className="flex items-center gap-2">
              This item has variants{" "}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-48">
                    Define variants to create different versions of the item.
                    For example, a product with different species, colors, or
                    sizes.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
            <Controller
              control={control}
              name="hasVariants"
              render={({ field }) => (
                <Switch
                  size="sm"
                  disabled={field.value}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
