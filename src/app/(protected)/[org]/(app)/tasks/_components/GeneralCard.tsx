"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { SelectValue } from "~/components/ui/select";
import { ColorSelector } from "~/app/_components/ColorSelector";
import { IconPicker } from "~/app/_components/IconPicker";
import type { OperationTypeBaseValues } from "./OperationTypeForm";

type GeneralCardProps = {
  base: OperationTypeBaseValues;
  setBase: React.Dispatch<React.SetStateAction<OperationTypeBaseValues>>;
};

export function GeneralCard({ base, setBase }: GeneralCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>
          Basic information about this activity.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="op-name">Name</Label>
            <Input
              id="op-name"
              value={base.name}
              onChange={(e) => setBase((p) => ({ ...p, name: e.target.value }))}
              required
              placeholder="Harvested"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="op-category">Category</Label>
            <Input
              id="op-category"
              value={base.category}
              onChange={(e) =>
                setBase((p) => ({ ...p, category: e.target.value }))
              }
              placeholder="production"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="op-description">Description</Label>
          <textarea
            id="op-description"
            value={base.description}
            onChange={(e) =>
              setBase((p) => ({ ...p, description: e.target.value }))
            }
            className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Describe what this activity does..."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="op-icon">Icon</Label>
            <IconPicker
              value={base.icon}
              onValueChange={(val) => setBase((p) => ({ ...p, icon: val }))}
            >
              <SelectValue placeholder="Icon" />
            </IconPicker>
          </div>
          <div className="space-y-2">
            <Label htmlFor="op-color">Color</Label>
            <ColorSelector
              value={base.color}
              onValueChange={(val) => setBase((p) => ({ ...p, color: val }))}
            >
              <SelectValue placeholder="Color" />
            </ColorSelector>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
