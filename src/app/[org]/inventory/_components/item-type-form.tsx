"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Plus, Trash2, GripVertical } from "lucide-react";

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
import { Separator } from "~/components/ui/separator";
import { ColorSelector } from "~/app/_components/ColorSelector";
import { IconPicker } from "~/app/_components/IconPicker";

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function cartesian(sets: string[][]): string[][] {
  if (sets.length === 0) return [[]];
  const [first, ...rest] = sets;
  const restCombos = cartesian(rest);
  return first!.flatMap((val) => restCombos.map((combo) => [val, ...combo]));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ItemTypeFormValues = {
  name: string;
  slug: string;
  category: string;
  defaultUom: string;
  quantityName: string;
  description: string;
  icon: string;
  color: string;
  codePrefix: string;
  codeNextNumber: string;
};

export type OptionRow = {
  id?: string;
  name: string;
  values: string[];
  expanded: boolean;
};

export type VariantRow = {
  id?: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  defaultValue: string;
  defaultValueCurrency: string;
  defaultQuantity: string;
  defaultQuantityUnit: string;
};

export type StatusRow = {
  id?: string;
  slug: string;
  name: string;
  color: string;
  isInitial: boolean;
  isTerminal: boolean;
};

export type TransitionRow = {
  fromSlug: string;
  toSlug: string;
};

export type AttributeDefinitionRow = {
  id?: string;
  attrKey: string;
  dataType: "text" | "number" | "boolean" | "date" | "select";
  isRequired: boolean;
  unit: string;
};

export type ItemTypeFormData = {
  base: ItemTypeFormValues;
  options: OptionRow[];
  variants: VariantRow[];
  statuses: StatusRow[];
  transitions: TransitionRow[];
  attributeDefinitions: AttributeDefinitionRow[];
};

const EMPTY_BASE: ItemTypeFormValues = {
  name: "",
  slug: "",
  category: "",
  defaultUom: "each",
  quantityName: "",
  description: "",
  icon: "",
  color: "",
  codePrefix: "",
  codeNextNumber: "1",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = {
  initialData?: ItemTypeFormData;
  onSubmit: (data: ItemTypeFormData) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
};

export function ItemTypeForm({
  initialData,
  onSubmit,
  isSubmitting,
  submitLabel,
}: Props) {
  const [base, setBase] = useState<ItemTypeFormValues>(
    initialData?.base ?? EMPTY_BASE,
  );
  const [options, setOptions] = useState<OptionRow[]>(
    initialData?.options ?? [],
  );
  const [variants, setVariants] = useState<VariantRow[]>(
    initialData?.variants ?? [],
  );
  const [statuses, setStatuses] = useState<StatusRow[]>(
    initialData?.statuses ?? [],
  );
  const [transitions, setTransitions] = useState<TransitionRow[]>(
    initialData?.transitions ?? [],
  );
  const [attrDefs, setAttrDefs] = useState<AttributeDefinitionRow[]>(
    initialData?.attributeDefinitions ?? [],
  );
  const [newValueInputs, setNewValueInputs] = useState<Record<number, string>>(
    {},
  );
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);

  useEffect(() => {
    if (!initialData) return;
    setBase(initialData.base);
    setOptions(initialData.options);
    setVariants(initialData.variants);
    setStatuses(initialData.statuses);
    setTransitions(initialData.transitions);
    setAttrDefs(initialData.attributeDefinitions);
  }, [initialData]);

  // Recompute generated variant rows when options change
  useEffect(() => {
    const sets = options.map((o) => o.values).filter((v) => v.length > 0);
    if (sets.length === 0) {
      setVariants([]);
      return;
    }
    const combos = cartesian(sets);
    const names = combos.map((c) => c.join(" / "));
    setVariants((prev) => {
      const byName = new Map(prev.map((v) => [v.name, v]));
      return names.map((name, i) => {
        const existing = byName.get(name);
        if (existing) return { ...existing, isDefault: i === 0 };
        return {
          name,
          isDefault: i === 0,
          isActive: true,
          defaultValue: "",
          defaultValueCurrency: "",
          defaultQuantity: "",
          defaultQuantityUnit: "",
        };
      });
    });
  }, [options]);

  const handleNameChange = (value: string) => {
    setBase((prev) => ({ ...prev, name: value, slug: slugify(value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      base,
      options,
      variants,
      statuses,
      transitions,
      attributeDefinitions: attrDefs,
    });
  };

  // -- Options helpers --
  const addOption = () =>
    setOptions((prev) => [...prev, { name: "", values: [], expanded: true }]);

  const removeOption = (idx: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
    setNewValueInputs((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const updateOption = (idx: number, patch: Partial<OptionRow>) =>
    setOptions((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
    );

  const addValueToOption = (optIdx: number) => {
    const val = (newValueInputs[optIdx] ?? "").trim();
    if (!val) return;
    setOptions((prev) =>
      prev.map((o, i) =>
        i === optIdx ? { ...o, values: [...o.values, val] } : o,
      ),
    );
    setNewValueInputs((prev) => ({ ...prev, [optIdx]: "" }));
  };

  const removeValueFromOption = (optIdx: number, valIdx: number) =>
    setOptions((prev) =>
      prev.map((o, i) =>
        i === optIdx
          ? { ...o, values: o.values.filter((_, vi) => vi !== valIdx) }
          : o,
      ),
    );

  const updateVariant = (idx: number, patch: Partial<VariantRow>) =>
    setVariants((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
    );

  // -- Statuses helpers --
  const addStatus = () => {
    setStatuses((prev) => [
      ...prev,
      {
        slug: "",
        name: "",
        color: "",
        isInitial: prev.length === 0,
        isTerminal: false,
      },
    ]);
  };

  const removeStatus = (idx: number) => {
    const removed = statuses[idx];
    if (!removed) return;
    setStatuses((prev) => prev.filter((_, i) => i !== idx));
    setTransitions((prev) =>
      prev.filter(
        (t) => t.fromSlug !== removed.slug && t.toSlug !== removed.slug,
      ),
    );
  };

  const updateStatus = (idx: number, patch: Partial<StatusRow>) => {
    const old = statuses[idx];
    setStatuses((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        const updated = { ...s, ...patch };
        if (patch.name !== undefined && !patch.slug) {
          updated.slug = slugify(patch.name);
        }
        return updated;
      }),
    );
    if (patch.name && old) {
      const newSlug = slugify(patch.name);
      setTransitions((prev) =>
        prev.map((t) => ({
          fromSlug: t.fromSlug === old.slug ? newSlug : t.fromSlug,
          toSlug: t.toSlug === old.slug ? newSlug : t.toSlug,
        })),
      );
    }
  };

  // -- Transition helpers --
  const addTransition = () =>
    setTransitions((prev) => [...prev, { fromSlug: "", toSlug: "" }]);

  const removeTransition = (idx: number) =>
    setTransitions((prev) => prev.filter((_, i) => i !== idx));

  const updateTransition = (idx: number, patch: Partial<TransitionRow>) =>
    setTransitions((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    );

  // -- Attribute definition helpers --
  const addAttrDef = () =>
    setAttrDefs((prev) => [
      ...prev,
      { attrKey: "", dataType: "text", isRequired: false, unit: "" },
    ]);

  const removeAttrDef = (idx: number) =>
    setAttrDefs((prev) => prev.filter((_, i) => i !== idx));

  const updateAttrDef = (
    idx: number,
    patch: Partial<AttributeDefinitionRow>,
  ) =>
    setAttrDefs((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ---- Basic info ---- */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Basic information about this item type.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="it-name">Name</Label>
              <Input
                id="it-name"
                value={base.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                placeholder="Fruiting Block"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="it-slug">Slug</Label>
              <Input
                id="it-slug"
                value={base.slug}
                onChange={(e) =>
                  setBase((p) => ({ ...p, slug: e.target.value }))
                }
                required
                placeholder="fruiting-block"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="it-category">Category</Label>
              <Input
                id="it-category"
                value={base.category}
                onChange={(e) =>
                  setBase((p) => ({ ...p, category: e.target.value }))
                }
                required
                placeholder="biological"
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
                onChange={(e) =>
                  setBase((p) => ({ ...p, codePrefix: e.target.value }))
                }
                placeholder="BLK"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="it-next">Next Number</Label>
              <Input
                id="it-next"
                type="number"
                min={1}
                value={base.codeNextNumber}
                onChange={(e) =>
                  setBase((p) => ({ ...p, codeNextNumber: e.target.value }))
                }
                placeholder="1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---- Variants (Options + Values) ---- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Variants</CardTitle>
              <CardDescription>
                Add options like size or color. Variants are generated from
                their combinations.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOption}
            >
              <Plus className="mr-1 size-3.5" /> Add variant
            </Button>
          </div>
        </CardHeader>
        {options.length > 0 && (
          <CardContent className="space-y-4">
            {options.map((opt, optIdx) => (
              <div key={optIdx} className="rounded-lg border">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 p-4 text-left"
                  onClick={() =>
                    updateOption(optIdx, { expanded: !opt.expanded })
                  }
                >
                  <GripVertical className="text-muted-foreground size-4 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {opt.name || "Untitled option"}
                    </p>
                    {opt.values.length > 0 && !opt.expanded && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {opt.values.map((val, vi) => (
                          <span
                            key={vi}
                            className="bg-muted rounded px-1.5 py-0.5 text-xs"
                          >
                            {val}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>

                {opt.expanded && (
                  <div className="space-y-3 border-t px-4 pt-3 pb-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Option name</Label>
                      <Input
                        value={opt.name}
                        onChange={(e) =>
                          updateOption(optIdx, { name: e.target.value })
                        }
                        placeholder="Size"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Option values</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {opt.values.map((val, vi) => (
                          <span
                            key={vi}
                            className="bg-muted inline-flex items-center gap-1 rounded px-2 py-1 text-xs"
                          >
                            {val}
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                removeValueFromOption(optIdx, vi)
                              }
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={newValueInputs[optIdx] ?? ""}
                          onChange={(e) =>
                            setNewValueInputs((prev) => ({
                              ...prev,
                              [optIdx]: e.target.value,
                            }))
                          }
                          placeholder="Add value..."
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addValueToOption(optIdx);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addValueToOption(optIdx)}
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
                        onClick={() => removeOption(optIdx)}
                      >
                        Delete
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          updateOption(optIdx, { expanded: false })
                        }
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
              onClick={addOption}
            >
              <Plus className="size-3.5" /> Add another option
            </button>
          </CardContent>
        )}
      </Card>

      {/* ---- Generated Variants ---- */}
      {variants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Variants</CardTitle>
            <CardDescription>
              {variants.length} variant{variants.length !== 1 && "s"} generated
              from option combinations. Expand to set defaults.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {variants.map((v, idx) => {
              const isOpen = expandedVariant === v.name;
              const hasDefaults =
                v.defaultValue !== "" ||
                v.defaultQuantity !== "" ||
                v.defaultQuantityUnit !== "";
              return (
                <div key={v.name} className="rounded-md border">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                    onClick={() =>
                      setExpandedVariant(isOpen ? null : v.name)
                    }
                  >
                    <div className="flex flex-1 items-center gap-2">
                      <span className="text-sm font-medium">{v.name}</span>
                      {hasDefaults && (
                        <span className="bg-primary size-1.5 rounded-full" />
                      )}
                    </div>
                    <ChevronDown
                      className={`text-muted-foreground size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="grid grid-cols-2 gap-2 border-t px-3 pt-2 pb-3 md:grid-cols-4">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Value (cents)</Label>
                        <Input
                          type="number"
                          value={v.defaultValue}
                          onChange={(e) =>
                            updateVariant(idx, {
                              defaultValue: e.target.value,
                            })
                          }
                          placeholder="0"
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Currency</Label>
                        <Input
                          value={v.defaultValueCurrency}
                          onChange={(e) =>
                            updateVariant(idx, {
                              defaultValueCurrency: e.target.value,
                            })
                          }
                          placeholder="CAD"
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Quantity</Label>
                        <Input
                          type="number"
                          value={v.defaultQuantity}
                          onChange={(e) =>
                            updateVariant(idx, {
                              defaultQuantity: e.target.value,
                            })
                          }
                          placeholder="0"
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Qty Unit</Label>
                        <Input
                          value={v.defaultQuantityUnit}
                          onChange={(e) =>
                            updateVariant(idx, {
                              defaultQuantityUnit: e.target.value,
                            })
                          }
                          placeholder="lb"
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ---- Statuses ---- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Statuses</CardTitle>
              <CardDescription>
                Define the lifecycle states for this item type.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addStatus}
            >
              <Plus className="mr-1 size-3.5" /> Add status
            </Button>
          </div>
        </CardHeader>
        {statuses.length > 0 && (
          <CardContent className="space-y-3">
            {statuses.map((s, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-md border p-3"
              >
                <GripVertical className="text-muted-foreground mt-2.5 size-4 shrink-0" />
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <Input
                    value={s.name}
                    onChange={(e) =>
                      updateStatus(idx, { name: e.target.value })
                    }
                    placeholder="Status name"
                    className="min-w-[140px] flex-1"
                  />
                  <Input
                    value={s.color}
                    onChange={(e) =>
                      updateStatus(idx, { color: e.target.value })
                    }
                    placeholder="#color"
                    className="w-24"
                  />
                  <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                    <Checkbox
                      checked={s.isInitial}
                      onCheckedChange={(val) =>
                        updateStatus(idx, { isInitial: val === true })
                      }
                    />
                    Initial
                  </label>
                  <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                    <Checkbox
                      checked={s.isTerminal}
                      onCheckedChange={(val) =>
                        updateStatus(idx, { isTerminal: val === true })
                      }
                    />
                    Terminal
                  </label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive mt-0.5 size-8 shrink-0 p-0"
                  onClick={() => removeStatus(idx)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* ---- Transitions ---- */}
      {statuses.length >= 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Transitions</CardTitle>
                <CardDescription>
                  Which status changes are allowed.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTransition}
              >
                <Plus className="mr-1 size-3.5" /> Add transition
              </Button>
            </div>
          </CardHeader>
          {transitions.length > 0 && (
            <CardContent className="space-y-3">
              {transitions.map((t, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <Select
                    value={t.fromSlug || undefined}
                    onValueChange={(val) =>
                      updateTransition(idx, { fromSlug: val })
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="From..." />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s.slug} value={s.slug}>
                          {s.name || s.slug}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground text-sm">→</span>
                  <Select
                    value={t.toSlug || undefined}
                    onValueChange={(val) =>
                      updateTransition(idx, { toSlug: val })
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="To..." />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s.slug} value={s.slug}>
                          {s.name || s.slug}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive size-8 p-0"
                    onClick={() => removeTransition(idx)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* ---- Custom Attributes ---- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Custom Attributes</CardTitle>
              <CardDescription>
                Define extra data fields stored on each item.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAttrDef}
            >
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
                    onChange={(e) =>
                      updateAttrDef(idx, { attrKey: e.target.value })
                    }
                    placeholder="Attribute key"
                    className="min-w-[120px] flex-1"
                  />
                  <Select
                    value={d.dataType}
                    onValueChange={(val) =>
                      updateAttrDef(idx, {
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
                    onChange={(e) =>
                      updateAttrDef(idx, { unit: e.target.value })
                    }
                    placeholder="Unit (opt.)"
                    className="w-24"
                  />
                  <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                    <Checkbox
                      checked={d.isRequired}
                      onCheckedChange={(val) =>
                        updateAttrDef(idx, { isRequired: val === true })
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
                  onClick={() => removeAttrDef(idx)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* ---- Submit ---- */}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
