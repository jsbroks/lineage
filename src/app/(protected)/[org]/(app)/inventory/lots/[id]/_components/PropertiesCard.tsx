"use client";

import React, { useEffect, useState } from "react";
import { Check, Pencil } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
import { api } from "~/trpc/react";

import { type AttrDef } from "./types";

export const PropertiesCard: React.FC<{
  lotId: string;
  attrDefs: AttrDef[];
  currentAttrs: Record<string, unknown>;
}> = ({ lotId, attrDefs, currentAttrs }) => {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const vals: Record<string, string> = {};
    for (const d of attrDefs) {
      vals[d.attrKey] = String(currentAttrs[d.attrKey] ?? "");
    }
    setValues(vals);
  }, [attrDefs, currentAttrs]);

  const utils = api.useUtils();
  const updateAttributes = api.lot.updateAttributes.useMutation({
    onSuccess: () => {
      void utils.lot.getById.invalidate({ lotId });
      setEditing(false);
    },
  });

  const handleSave = () => {
    const merged: Record<string, unknown> = { ...currentAttrs };
    for (const d of attrDefs) {
      const raw = values[d.attrKey] ?? "";
      if (!raw && !d.isRequired) {
        delete merged[d.attrKey];
        continue;
      }
      switch (d.dataType) {
        case "number":
          merged[d.attrKey] = raw ? Number(raw) : null;
          break;
        case "boolean":
          merged[d.attrKey] = raw === "true";
          break;
        default:
          merged[d.attrKey] = raw;
      }
    }
    updateAttributes.mutate({ lotId, attributes: merged });
  };

  const resetAndCancel = () => {
    setEditing(false);
    const vals: Record<string, string> = {};
    for (const d of attrDefs) {
      vals[d.attrKey] = String(currentAttrs[d.attrKey] ?? "");
    }
    setValues(vals);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Properties</CardTitle>
        {attrDefs.length > 0 && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-1 size-3.5" /> Edit
          </Button>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={resetAndCancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateAttributes.isPending}
            >
              <Check className="mr-1 size-3.5" />
              {updateAttributes.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {attrDefs.length === 0 ? (
          <PropertiesEmptyState currentAttrs={currentAttrs} />
        ) : editing ? (
          <PropertiesForm
            attrDefs={attrDefs}
            values={values}
            onChange={setValues}
          />
        ) : (
          <PropertiesReadOnly attrDefs={attrDefs} currentAttrs={currentAttrs} />
        )}
      </CardContent>
    </Card>
  );
};

const PropertiesEmptyState: React.FC<{
  currentAttrs: Record<string, unknown>;
}> = ({ currentAttrs }) => (
  <div className="text-muted-foreground text-sm">
    <p>No custom attributes defined for this lot type.</p>
    {Object.keys(currentAttrs).length > 0 && (
      <div className="mt-2">
        <span className="font-medium">Raw data:</span>
        <pre className="bg-muted mt-1 overflow-auto rounded-md p-2 text-xs">
          {JSON.stringify(currentAttrs, null, 2)}
        </pre>
      </div>
    )}
  </div>
);

const PropertiesForm: React.FC<{
  attrDefs: AttrDef[];
  values: Record<string, string>;
  onChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}> = ({ attrDefs, values, onChange }) => (
  <div className="space-y-3">
    {attrDefs.map((d) => (
      <div key={d.id} className="space-y-1">
        <Label className="text-xs">
          {d.attrKey}
          {d.unit ? ` (${d.unit})` : ""}
          {d.isRequired && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {d.dataType === "boolean" ? (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={values[d.attrKey] === "true"}
              onCheckedChange={(val) =>
                onChange((prev) => ({
                  ...prev,
                  [d.attrKey]: val ? "true" : "false",
                }))
              }
            />
            <span className="text-muted-foreground text-xs">
              {values[d.attrKey] === "true" ? "Yes" : "No"}
            </span>
          </div>
        ) : d.dataType === "select" && Array.isArray(d.options) ? (
          <Select
            value={values[d.attrKey] ?? ""}
            onValueChange={(val) =>
              onChange((prev) => ({ ...prev, [d.attrKey]: val }))
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {(d.options as string[]).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            type={
              d.dataType === "number"
                ? "number"
                : d.dataType === "date"
                  ? "date"
                  : "text"
            }
            value={values[d.attrKey] ?? ""}
            onChange={(e) =>
              onChange((prev) => ({
                ...prev,
                [d.attrKey]: e.target.value,
              }))
            }
            className="h-8 text-sm"
          />
        )}
      </div>
    ))}
  </div>
);

const PropertiesReadOnly: React.FC<{
  attrDefs: AttrDef[];
  currentAttrs: Record<string, unknown>;
}> = ({ attrDefs, currentAttrs }) => (
  <div className="space-y-2 text-sm">
    {attrDefs.map((d) => {
      const val = currentAttrs[d.attrKey];
      return (
        <div key={d.id} className="flex items-baseline gap-2">
          <span className="text-muted-foreground min-w-[80px] text-xs font-medium">
            {d.attrKey}
            {d.unit ? ` (${d.unit})` : ""}
          </span>
          <span className="text-sm">
            {val === undefined || val === null || val === ""
              ? "—"
              : d.dataType === "boolean"
                ? val
                  ? "Yes"
                  : "No"
                : String(val)}
          </span>
        </div>
      );
    })}
  </div>
);
