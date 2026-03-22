"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { InputItemRow, StepRow } from "./OperationTypeForm";

type StepsCardProps = {
  steps: StepRow[];
  inputItems: InputItemRow[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, patch: Partial<StepRow>) => void;
};

export function StepsCard({
  steps,
  inputItems,
  onAdd,
  onRemove,
  onUpdate,
}: StepsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Steps</CardTitle>
            <CardDescription>
              Actions executed when this task runs.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <Plus className="mr-1 size-3.5" /> Add step
          </Button>
        </div>
      </CardHeader>
      {steps.length > 0 && (
        <CardContent className="space-y-4">
          {steps.map((step, idx) => (
            <div key={idx} className="space-y-3 rounded-md border p-3">
              <div className="flex items-start gap-3">
                <GripVertical className="text-muted-foreground mt-7 size-4 shrink-0" />
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <div className="min-w-[140px] flex-1 space-y-1">
                    <Label className="text-xs">Step Name</Label>
                    <Input
                      value={step.name}
                      onChange={(e) => onUpdate(idx, { name: e.target.value })}
                      placeholder="Set Item Status"
                    />
                  </div>
                  <div className="w-36 space-y-1">
                    <Label className="text-xs">Action</Label>
                    <Select
                      value={step.action}
                      onValueChange={(val) => onUpdate(idx, { action: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="set-item">Set Item</SelectItem>
                        <SelectItem value="set-operation">
                          Set Operation
                        </SelectItem>
                        <SelectItem value="set-lineage">Set Lineage</SelectItem>
                        <SelectItem value="create-item">Create Item</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-36 space-y-1">
                    <Label className="text-xs">Target</Label>
                    {inputItems.length > 0 ? (
                      <Select
                        value={step.target || undefined}
                        onValueChange={(val) => onUpdate(idx, { target: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select target..." />
                        </SelectTrigger>
                        <SelectContent>
                          {inputItems
                            .filter((it) => it.referenceKey)
                            .map((it) => (
                              <SelectItem
                                key={it.referenceKey}
                                value={it.referenceKey}
                              >
                                {it.referenceKey}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={step.target}
                        onChange={(e) =>
                          onUpdate(idx, { target: e.target.value })
                        }
                        placeholder="target ref"
                      />
                    )}
                  </div>
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

              <div className="space-y-1 pl-7">
                <Label className="text-xs">Value (JSON)</Label>
                <textarea
                  value={step.value}
                  onChange={(e) => onUpdate(idx, { value: e.target.value })}
                  className="border-input bg-background min-h-16 w-full rounded-md border px-3 py-2 font-mono text-xs"
                  placeholder='{"status": "Approved", "attributes": {}}'
                />
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
