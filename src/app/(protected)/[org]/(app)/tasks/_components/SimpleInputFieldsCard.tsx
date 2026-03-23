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
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { InputRow } from "./OperationTypeForm";

type SimpleInputFieldsCardProps = {
  inputFields: InputRow[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, patch: Partial<InputRow>) => void;
};

export function SimpleInputFieldsCard({
  inputFields,
  onAdd,
  onRemove,
  onUpdate,
}: SimpleInputFieldsCardProps) {
  const handleLabelChange = (idx: number, label: string) => {
    onUpdate(idx, { label, referenceKey: label });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Ask the operator...</CardTitle>
            <CardDescription>
              Data fields to collect when running this task.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <Plus className="mr-1 size-3.5" /> Add question
          </Button>
        </div>
      </CardHeader>
      {inputFields.length > 0 && (
        <CardContent className="space-y-3">
          {inputFields.map((field, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-md border p-3"
            >
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <div className="min-w-[160px] flex-1 space-y-1">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={field.label}
                    onChange={(e) => handleLabelChange(idx, e.target.value)}
                    placeholder="e.g. Harvested By"
                  />
                </div>
                <div className="w-28 space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={field.type}
                    onValueChange={(val) => onUpdate(idx, { type: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="boolean">Yes / No</SelectItem>
                      <SelectItem value="locations">Location</SelectItem>
                      <SelectItem value="select">Select</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="mt-5 flex items-center gap-1.5 text-xs whitespace-nowrap">
                  <Checkbox
                    checked={field.required}
                    onCheckedChange={(val) =>
                      onUpdate(idx, { required: val === true })
                    }
                  />
                  Required
                </label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive mt-5 size-8 shrink-0 p-0"
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
