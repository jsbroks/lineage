"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { AttrDef } from "./types";

interface BulkAttributeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  attrDefs: AttrDef[];
  onConfirm: (attributes: Record<string, unknown>) => void;
  isPending: boolean;
}

export const BulkAttributeDialog: React.FC<BulkAttributeDialogProps> = ({
  open,
  onOpenChange,
  selectedCount,
  attrDefs,
  onConfirm,
  isPending,
}) => {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [enabledKeys, setEnabledKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setValues({});
      setEnabledKeys(new Set());
    }
  }, [open]);

  const toggleKey = (key: string) => {
    setEnabledKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setValues((v) => {
          const { [key]: _, ...rest } = v;
          return rest;
        });
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const setValue = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleConfirm = () => {
    const attrs: Record<string, unknown> = {};
    for (const key of enabledKeys) {
      attrs[key] = values[key] ?? null;
    }
    onConfirm(attrs);
  };

  const hasSelection = enabledKeys.size > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set attributes</DialogTitle>
          <DialogDescription>
            Update attributes on {selectedCount} selected lot
            {selectedCount > 1 ? "s" : ""}. Only checked attributes will be
            changed.
          </DialogDescription>
        </DialogHeader>
        {attrDefs.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No attributes defined for this lot type.
          </p>
        ) : (
          <div className="space-y-3">
            {attrDefs.map((d) => {
              const enabled = enabledKeys.has(d.attrKey);
              return (
                <div key={d.id} className="flex items-start gap-3">
                  <Checkbox
                    checked={enabled}
                    onCheckedChange={() => toggleKey(d.attrKey)}
                    className="mt-2.5"
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      className={
                        enabled
                          ? "text-sm font-medium"
                          : "text-muted-foreground text-sm font-medium"
                      }
                    >
                      {d.attrKey}
                      {d.unit && (
                        <span className="text-muted-foreground ml-1 text-xs font-normal">
                          ({d.unit})
                        </span>
                      )}
                    </Label>
                    {enabled && (
                      <AttrInput
                        def={d}
                        value={values[d.attrKey]}
                        onChange={(v) => setValue(d.attrKey, v)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!hasSelection || isPending}>
            {isPending
              ? "Updating..."
              : `Update ${enabledKeys.size} attribute${enabledKeys.size !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AttrInput: React.FC<{
  def: AttrDef;
  value: unknown;
  onChange: (value: unknown) => void;
}> = ({ def, value, onChange }) => {
  switch (def.dataType) {
    case "boolean":
      return (
        <Select
          value={value === true ? "true" : value === false ? "false" : ""}
          onValueChange={(v) => onChange(v === "true")}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      );

    case "select":
      return (
        <Select
          value={(value as string) ?? ""}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {Array.isArray(def.options) &&
              (def.options as string[]).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      );

    case "number":
      return (
        <Input
          type="number"
          className="h-8 text-sm"
          value={(value as string) ?? ""}
          onChange={(e) =>
            onChange(e.target.value ? Number(e.target.value) : null)
          }
          placeholder="Enter value..."
        />
      );

    case "date":
      return (
        <Input
          type="date"
          className="h-8 text-sm"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );

    default:
      return (
        <Input
          className="h-8 text-sm"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="Enter value..."
        />
      );
  }
};
