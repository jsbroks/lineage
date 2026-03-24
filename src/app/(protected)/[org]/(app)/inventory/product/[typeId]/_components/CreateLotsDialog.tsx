"use client";

import { useEffect, useState } from "react";
import { Circle } from "lucide-react";
import { Button } from "~/components/ui/button";
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
import { Separator } from "~/components/ui/separator";
import type { AttrDef, StatusDef, VariantDef } from "./types";

interface CreateLotsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotTypeName: string;
  codePrefix: string | null;
  statuses: StatusDef[];
  variants: VariantDef[];
  attrDefs: AttrDef[];
  onConfirm: (params: {
    count: number;
    variantId: string | null;
    status: string;
    attributes: Record<string, unknown>;
  }) => void;
  isPending: boolean;
  error?: string | null;
}

function defaultForDef(def: AttrDef): unknown {
  if (def.defaultValue != null && def.defaultValue !== "") {
    if (def.dataType === "number") return Number(def.defaultValue);
    if (def.dataType === "boolean") return def.defaultValue === "true";
    return def.defaultValue;
  }
  return undefined;
}

export const CreateLotsDialog: React.FC<CreateLotsDialogProps> = ({
  open,
  onOpenChange,
  lotTypeName,
  codePrefix,
  statuses,
  variants,
  attrDefs,
  onConfirm,
  isPending,
  error,
}) => {
  const [count, setCount] = useState("10");
  const [variant, setVariant] = useState("none");
  const [status, setStatus] = useState("");
  const [attrValues, setAttrValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (open) {
      setCount("10");
      setVariant("none");
      setStatus("");
      const defaults: Record<string, unknown> = {};
      for (const d of attrDefs) {
        const v = defaultForDef(d);
        if (v !== undefined) defaults[d.attrKey] = v;
      }
      setAttrValues(defaults);
    }
  }, [open, attrDefs]);

  const setAttrValue = (key: string, value: unknown) => {
    setAttrValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleConfirm = () => {
    const cnt = parseInt(count, 10);
    if (!cnt || cnt < 1) return;
    const initialStatus = statuses.find((s) => s.category === "unstarted");
    const attributes: Record<string, unknown> = {};
    for (const d of attrDefs) {
      const v = attrValues[d.attrKey];
      if (v !== undefined && v !== null && v !== "") {
        attributes[d.attrKey] = v;
      }
    }
    onConfirm({
      count: cnt,
      variantId: variant === "none" ? null : variant,
      status: status || initialStatus?.id || "created",
      attributes,
    });
  };

  const parsedCount = parseInt(count, 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create lots</DialogTitle>
          <DialogDescription>
            Batch-create new {lotTypeName} lots using the auto-sequence
            {codePrefix ? ` (${codePrefix}-XXXXX)` : ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-count">How many?</Label>
            <Input
              id="create-count"
              type="number"
              min={1}
              max={1000}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              placeholder="10"
            />
            <p className="text-muted-foreground text-xs">
              Max 1,000 per batch.
            </p>
          </div>

          {variants.length > 0 && (
            <div className="space-y-2">
              <Label>Variety</Label>
              <Select value={variant} onValueChange={setVariant}>
                <SelectTrigger>
                  <SelectValue placeholder="No variety" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {variants.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {statuses.length > 0 && (
            <div className="space-y-2">
              <Label>Initial status</Label>
              <Select
                value={
                  status ||
                  statuses.find((s) => s.category === "unstarted")?.id ||
                  ""
                }
                onValueChange={setStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <Circle
                          className="size-2"
                          fill={s.color ?? "currentColor"}
                          stroke={s.color ?? "currentColor"}
                        />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {attrDefs.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs tracking-wide uppercase">
                  Attributes
                </Label>
                {attrDefs.map((d) => (
                  <div key={d.id} className="space-y-1">
                    <Label className="text-sm font-medium">
                      {d.attrKey}
                      {d.isRequired && (
                        <span className="text-destructive ml-0.5">*</span>
                      )}
                      {d.unit && (
                        <span className="text-muted-foreground ml-1 text-xs font-normal">
                          ({d.unit})
                        </span>
                      )}
                    </Label>
                    <AttrInput
                      def={d}
                      value={attrValues[d.attrKey]}
                      onChange={(v) => setAttrValue(d.attrKey, v)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {!codePrefix && (
            <p className="text-destructive text-xs">
              This product has no code prefix configured. Set one via
              &ldquo;Edit product&rdquo; before creating lots with
              auto-sequencing.
            </p>
          )}

          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || !codePrefix || !count || parsedCount < 1}
          >
            {isPending ? "Creating..." : `Create ${parsedCount || 0} lots`}
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
