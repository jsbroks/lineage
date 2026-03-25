"use client";

import type { FC } from "react";
import { GripVertical } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export type OptionRow = {
  id?: string;
  name: string;
  values: string[];
  expanded: boolean;
};

type OptionEditorProps = {
  option: OptionRow;
  newValue: string;
  onUpdate: (patch: Partial<OptionRow>) => void;
  onRemove: () => void;
  onAddValue: () => void;
  onRemoveValue: (valIdx: number) => void;
  onNewValueChange: (value: string) => void;
};

export const OptionEditor: FC<OptionEditorProps> = ({
  option,
  newValue,
  onUpdate,
  onRemove,
  onAddValue,
  onRemoveValue,
  onNewValueChange,
}) => (
  <div className="rounded-lg border">
    <button
      type="button"
      className="flex w-full items-center gap-3 p-4 text-left"
      onClick={() => onUpdate({ expanded: !option.expanded })}
    >
      <GripVertical className="text-muted-foreground size-4 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium">
          {option.name || "Untitled option"}
        </p>
        {option.values.length > 0 && !option.expanded && (
          <div className="mt-1 flex flex-wrap gap-1">
            {option.values.map((val, vi) => (
              <span key={vi} className="bg-muted rounded px-1.5 py-0.5 text-xs">
                {val}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>

    {option.expanded && (
      <div className="space-y-3 border-t px-4 pt-3 pb-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Option name</Label>
          <Input
            value={option.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="e.g. Species, Size, Color"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Option values</Label>
          <div className="flex flex-wrap gap-1.5">
            {option.values.map((val, vi) => (
              <span
                key={vi}
                className="bg-muted inline-flex items-center gap-1 rounded px-2 py-1 text-xs"
              >
                {val}
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveValue(vi)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={newValue}
              onChange={(e) => onNewValueChange(e.target.value)}
              placeholder="Add value…"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddValue();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddValue}
            >
              Add
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            Delete
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onUpdate({ expanded: false })}
          >
            Done
          </Button>
        </div>
      </div>
    )}
  </div>
);
