"use client";

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
import { Separator } from "~/components/ui/separator";
import { SelectValue } from "~/components/ui/select";
import { ColorSelector } from "~/app/_components/ColorSelector";
import { IconPicker } from "~/app/_components/IconPicker";
import type { LotTypeFormValues } from "./LotTypeForm";

type GeneralCardProps = {
  base: LotTypeFormValues;
  setBase: React.Dispatch<React.SetStateAction<LotTypeFormValues>>;
  onNameChange: (value: string) => void;
  onCodePrefixChange: (value: string) => void;
};

export function GeneralCard({
  base,
  setBase,
  onNameChange,
  onCodePrefixChange,
}: GeneralCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>Basic information about this product.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="it-name">Name</Label>
            <Input
              id="it-name"
              value={base.name}
              onChange={(e) => onNameChange(e.target.value)}
              required
              placeholder="Fruiting Block"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="it-category">Category</Label>
            <Input
              id="it-category"
              value={base.categoryId}
              onChange={(e) =>
                setBase((p) => ({ ...p, categoryId: e.target.value }))
              }
              placeholder="Select a category"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="it-qty-name">Quantity Name</Label>
            <Input
              id="it-qty-name"
              value={base.quantityName}
              onChange={(e) =>
                setBase((p) => ({ ...p, quantityName: e.target.value }))
              }
              placeholder="Weight"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="it-uom">Default Unit</Label>
            <Input
              id="it-uom"
              value={base.defaultUom}
              onChange={(e) =>
                setBase((p) => ({ ...p, defaultUom: e.target.value }))
              }
              required
              placeholder="each"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="it-description">Description</Label>
          <textarea
            id="it-description"
            value={base.description}
            onChange={(e) =>
              setBase((p) => ({ ...p, description: e.target.value }))
            }
            className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Optional description"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="it-icon">Icon</Label>
            <IconPicker
              value={base.icon}
              onValueChange={(val) => setBase((p) => ({ ...p, icon: val }))}
            >
              <SelectValue placeholder="Icon" />
            </IconPicker>
          </div>
          <div className="space-y-2">
            <Label htmlFor="it-color">Color</Label>
            <ColorSelector
              value={base.color}
              onValueChange={(val) => setBase((p) => ({ ...p, color: val }))}
            >
              <SelectValue placeholder="Color" />
            </ColorSelector>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="it-prefix">Code Prefix</Label>
            <Input
              id="it-prefix"
              value={base.codePrefix}
              onChange={(e) => onCodePrefixChange(e.target.value)}
              placeholder="BLK"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
