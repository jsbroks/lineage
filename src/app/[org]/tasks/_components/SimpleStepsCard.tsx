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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import type { SimpleStepRow } from "~/lib/simple-steps";
import type { InputItemRow, InputFieldRow } from "./OperationTypeForm";

type SimpleStepsCardProps = {
  steps: SimpleStepRow[];
  inputItems: InputItemRow[];
  inputFields: InputFieldRow[];
  onUpdate: (steps: SimpleStepRow[]) => void;
};

function emptyChangeStatus(): SimpleStepRow {
  return { kind: "change-status", targetRef: "", statusName: "" };
}

function emptySetAttribute(): SimpleStepRow {
  return {
    kind: "set-attribute",
    targetRef: "",
    attrKey: "",
    source: "field",
    fieldRef: "",
  };
}

export function SimpleStepsCard({
  steps,
  inputItems,
  inputFields,
  onUpdate,
}: SimpleStepsCardProps) {
  const { data: itemTypesWithStatuses = [] } =
    api.itemType.listWithStatuses.useQuery();

  const statusesForTarget = (targetRef: string) => {
    const inputItem = inputItems.find((i) => i.referenceKey === targetRef);
    if (!inputItem) return [];
    const itemType = itemTypesWithStatuses.find(
      (t) => t.id === inputItem.itemTypeId,
    );
    return itemType?.statuses ?? [];
  };

  const updateStep = (idx: number, patch: Partial<SimpleStepRow>) => {
    const next = steps.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onUpdate(next as SimpleStepRow[]);
  };

  const removeStep = (idx: number) => {
    onUpdate(steps.filter((_, i) => i !== idx));
  };

  const addStep = (kind: "change-status" | "set-attribute") => {
    const step =
      kind === "change-status" ? emptyChangeStatus() : emptySetAttribute();
    onUpdate([...steps, step]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Then do this...</CardTitle>
            <CardDescription>
              Actions to perform when this task runs.
            </CardDescription>
          </div>
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addStep("change-status")}
            >
              <Plus className="mr-1 size-3.5" /> Change status
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addStep("set-attribute")}
            >
              <Plus className="mr-1 size-3.5" /> Set attribute
            </Button>
          </div>
        </div>
      </CardHeader>
      {steps.length > 0 && (
        <CardContent className="space-y-4">
          {steps.map((step, idx) => (
            <div key={idx} className="rounded-md border p-3">
              {step.kind === "change-status" ? (
                <ChangeStatusRow
                  step={step}
                  idx={idx}
                  inputItems={inputItems}
                  statuses={statusesForTarget(step.targetRef)}
                  onUpdate={updateStep}
                  onRemove={removeStep}
                />
              ) : (
                <SetAttributeRow
                  step={step}
                  idx={idx}
                  inputItems={inputItems}
                  inputFields={inputFields}
                  onUpdate={updateStep}
                  onRemove={removeStep}
                />
              )}
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

// ── Change Status Row ──────────────────────────────────────────────────

type StatusInfo = { id: string; name: string };

function ChangeStatusRow({
  step,
  idx,
  inputItems,
  statuses,
  onUpdate,
  onRemove,
}: {
  step: Extract<SimpleStepRow, { kind: "change-status" }>;
  idx: number;
  inputItems: InputItemRow[];
  statuses: StatusInfo[];
  onUpdate: (idx: number, patch: Partial<SimpleStepRow>) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <span className="text-muted-foreground shrink-0 text-sm font-medium">
          Change status of
        </span>
        <div className="min-w-[140px] flex-1 space-y-1">
          <TargetSelect
            value={step.targetRef}
            inputItems={inputItems}
            onChange={(val) => onUpdate(idx, { targetRef: val, statusName: "" })}
          />
        </div>
        <span className="text-muted-foreground shrink-0 text-sm font-medium">
          to
        </span>
        <div className="min-w-[140px] flex-1 space-y-1">
          <Select
            value={step.statusName || undefined}
            onValueChange={(val) => onUpdate(idx, { statusName: val })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select status..." />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <RemoveButton onClick={() => onRemove(idx)} />
    </div>
  );
}

// ── Set Attribute Row ──────────────────────────────────────────────────

function SetAttributeRow({
  step,
  idx,
  inputItems,
  inputFields,
  onUpdate,
  onRemove,
}: {
  step: Extract<SimpleStepRow, { kind: "set-attribute" }>;
  idx: number;
  inputItems: InputItemRow[];
  inputFields: InputFieldRow[];
  onUpdate: (idx: number, patch: Partial<SimpleStepRow>) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <span className="text-muted-foreground shrink-0 text-sm font-medium">
            Set
          </span>
          <div className="min-w-[120px] flex-1">
            <Input
              value={step.attrKey}
              onChange={(e) => onUpdate(idx, { attrKey: e.target.value })}
              placeholder="Attribute name"
              className="h-8 text-xs"
            />
          </div>
          <span className="text-muted-foreground shrink-0 text-sm font-medium">
            on
          </span>
          <div className="min-w-[140px] flex-1">
            <TargetSelect
              value={step.targetRef}
              inputItems={inputItems}
              onChange={(val) => onUpdate(idx, { targetRef: val })}
            />
          </div>
        </div>
        <RemoveButton onClick={() => onRemove(idx)} />
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-0">
        <span className="text-muted-foreground shrink-0 text-sm font-medium">
          to
        </span>
        <div className="w-32 space-y-1">
          <Select
            value={step.source}
            onValueChange={(val) => {
              if (val === "literal") {
                onUpdate(idx, { source: "literal", literalValue: "" } as Partial<SimpleStepRow>);
              } else {
                onUpdate(idx, { source: "field", fieldRef: "" } as Partial<SimpleStepRow>);
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="field">Answer from...</SelectItem>
              <SelectItem value="literal">Fixed value</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[140px] flex-1">
          {step.source === "field" ? (
            <Select
              value={step.fieldRef || undefined}
              onValueChange={(val) => onUpdate(idx, { fieldRef: val } as Partial<SimpleStepRow>)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select field..." />
              </SelectTrigger>
              <SelectContent>
                {inputFields
                  .filter((f) => f.label || f.referenceKey)
                  .map((f, i) => (
                    <SelectItem
                      key={f.referenceKey || i}
                      value={f.referenceKey}
                    >
                      {f.label || f.referenceKey}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={(step as Extract<SimpleStepRow, { source: "literal" }>).literalValue ?? ""}
              onChange={(e) =>
                onUpdate(idx, { literalValue: e.target.value } as Partial<SimpleStepRow>)
              }
              placeholder="Value"
              className="h-8 text-xs"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared components ──────────────────────────────────────────────────

function TargetSelect({
  value,
  inputItems,
  onChange,
}: {
  value: string;
  inputItems: InputItemRow[];
  onChange: (val: string) => void;
}) {
  const targets = inputItems.filter((i) => i.referenceKey);

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="Select target..." />
      </SelectTrigger>
      <SelectContent>
        {targets.map((it) => (
          <SelectItem key={it.referenceKey} value={it.referenceKey}>
            {it.referenceKey}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-destructive mt-0.5 size-8 shrink-0 p-0"
      onClick={onClick}
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}
