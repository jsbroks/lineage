"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { AttributeDefinitionRow } from "./ItemTypeForm";

type AttributesCardProps = {
  attrDefs: AttributeDefinitionRow[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, patch: Partial<AttributeDefinitionRow>) => void;
};

export function AttributesCard({
  attrDefs,
  onAdd,
  onRemove,
  onUpdate,
}: AttributesCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Custom Attributes</CardTitle>
            <CardDescription>
              Define extra data fields stored on each item.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <Plus className="mr-1 size-3.5" /> Add attribute
          </Button>
        </div>
      </CardHeader>
      {attrDefs.length > 0 && (
        <CardContent className="space-y-3">
          {attrDefs.map((d, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-md border p-3"
            >
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <Input
                  value={d.attrKey}
                  onChange={(e) => onUpdate(idx, { attrKey: e.target.value })}
                  placeholder="Attribute key"
                  className="min-w-[120px] flex-1"
                />
                <Select
                  value={d.dataType}
                  onValueChange={(val) =>
                    onUpdate(idx, {
                      dataType: val as AttributeDefinitionRow["dataType"],
                    })
                  }
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="select">Select</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={d.unit}
                  onChange={(e) => onUpdate(idx, { unit: e.target.value })}
                  placeholder="Unit (opt.)"
                  className="w-24"
                />
                <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                  <Checkbox
                    checked={d.isRequired}
                    onCheckedChange={(val) =>
                      onUpdate(idx, { isRequired: val === true })
                    }
                  />
                  Required
                </label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive mt-0.5 size-8 shrink-0 p-0"
                onClick={() => onRemove(idx)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
