"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";

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
import { Separator } from "~/components/ui/separator";

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ItemTypeFormValues = {
  name: string;
  slug: string;
  category: string;
  defaultUom: string;
  description: string;
  icon: string;
  color: string;
  codePrefix: string;
  codeNextNumber: string;
};

export type VariantRow = {
  id?: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
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

export type ItemTypeFormData = {
  base: ItemTypeFormValues;
  variants: VariantRow[];
  statuses: StatusRow[];
  transitions: TransitionRow[];
};

const EMPTY_BASE: ItemTypeFormValues = {
  name: "",
  slug: "",
  category: "",
  defaultUom: "each",
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
  const [variants, setVariants] = useState<VariantRow[]>(
    initialData?.variants ?? [],
  );
  const [statuses, setStatuses] = useState<StatusRow[]>(
    initialData?.statuses ?? [],
  );
  const [transitions, setTransitions] = useState<TransitionRow[]>(
    initialData?.transitions ?? [],
  );

  useEffect(() => {
    if (!initialData) return;
    setBase(initialData.base);
    setVariants(initialData.variants);
    setStatuses(initialData.statuses);
    setTransitions(initialData.transitions);
  }, [initialData]);

  const handleNameChange = (value: string) => {
    setBase((prev) => ({ ...prev, name: value, slug: slugify(value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ base, variants, statuses, transitions });
  };

  // -- Variants helpers --
  const addVariant = () =>
    setVariants((prev) => [
      ...prev,
      { name: "", isDefault: prev.length === 0, isActive: true },
    ]);

  const removeVariant = (idx: number) =>
    setVariants((prev) => prev.filter((_, i) => i !== idx));

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ---- Basic info ---- */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic information about this item type.</CardDescription>
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

          <div className="grid gap-4 md:grid-cols-2">
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
              <Input
                id="it-icon"
                value={base.icon}
                onChange={(e) =>
                  setBase((p) => ({ ...p, icon: e.target.value }))
                }
                placeholder="package"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="it-color">Color</Label>
              <Input
                id="it-color"
                value={base.color}
                onChange={(e) =>
                  setBase((p) => ({ ...p, color: e.target.value }))
                }
                placeholder="#6366f1"
              />
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

      {/* ---- Variants ---- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Variants</CardTitle>
              <CardDescription>
                Define size, strain, or other product variations.
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addVariant}>
              <Plus className="mr-1 size-3.5" /> Add variant
            </Button>
          </div>
        </CardHeader>
        {variants.length > 0 && (
          <CardContent className="space-y-3">
            {variants.map((v, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-md border p-3"
              >
                <GripVertical className="text-muted-foreground size-4 shrink-0" />
                <Input
                  value={v.name}
                  onChange={(e) => updateVariant(idx, { name: e.target.value })}
                  placeholder="Variant name"
                  className="flex-1"
                />
                <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                  <Checkbox
                    checked={v.isDefault}
                    onCheckedChange={(val) =>
                      updateVariant(idx, { isDefault: val === true })
                    }
                  />
                  Default
                </label>
                <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                  <Checkbox
                    checked={v.isActive}
                    onCheckedChange={(val) =>
                      updateVariant(idx, { isActive: val === true })
                    }
                  />
                  Active
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive size-8 p-0"
                  onClick={() => removeVariant(idx)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

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
            <Button type="button" variant="outline" size="sm" onClick={addStatus}>
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
                  <select
                    value={t.fromSlug}
                    onChange={(e) =>
                      updateTransition(idx, { fromSlug: e.target.value })
                    }
                    className="border-input bg-background flex-1 rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">From...</option>
                    {statuses.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.name || s.slug}
                      </option>
                    ))}
                  </select>
                  <span className="text-muted-foreground text-sm">→</span>
                  <select
                    value={t.toSlug}
                    onChange={(e) =>
                      updateTransition(idx, { toSlug: e.target.value })
                    }
                    className="border-input bg-background flex-1 rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">To...</option>
                    {statuses.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.name || s.slug}
                      </option>
                    ))}
                  </select>
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

      {/* ---- Submit ---- */}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
