"use client";

import { useMemo, useState } from "react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { api } from "~/trpc/react";

type FormState = {
  name: string;
  slug: string;
  category: string;
  defaultUom: string;
  description: string;
  icon: string;
  color: string;
  configText: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  category: "",
  defaultUom: "each",
  description: "",
  icon: "",
  color: "",
  configText: "{}",
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function ItemTypesSettingsPage() {
  const utils = api.useUtils();
  const { data: itemTypes = [], isLoading } = api.itemType.list.useQuery();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [configError, setConfigError] = useState<string | null>(null);

  const selectedItemType = useMemo(
    () => itemTypes.find((item) => item.id === selectedId) ?? null,
    [itemTypes, selectedId],
  );

  const resetForCreate = () => {
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setConfigError(null);
  };

  const loadForEdit = (id: string) => {
    const existing = itemTypes.find((item) => item.id === id);
    if (!existing) return;

    setSelectedId(existing.id);
    setForm({
      name: existing.name,
      slug: existing.slug,
      category: existing.category,
      defaultUom: existing.defaultUom,
      description: existing.description ?? "",
      icon: existing.icon ?? "",
      color: existing.color ?? "",
      configText: JSON.stringify(existing.config ?? {}, null, 2),
    });
    setConfigError(null);
  };

  const createMutation = api.itemType.create.useMutation({
    onSuccess: async () => {
      await utils.itemType.list.invalidate();
      resetForCreate();
    },
  });

  const editMutation = api.itemType.edit.useMutation({
    onSuccess: async () => {
      await utils.itemType.list.invalidate();
    },
  });

  const deleteMutation = api.itemType.delete.useMutation({
    onSuccess: async () => {
      await utils.itemType.list.invalidate();
      resetForCreate();
    },
  });

  const isSaving = createMutation.isPending || editMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  const handleNameChange = (value: string) => {
    setForm((prev) => {
      const next = { ...prev, name: value };
      if (!selectedId) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const parseConfig = () => {
    if (!form.configText.trim()) return {};

    try {
      const parsed = JSON.parse(form.configText) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        setConfigError(null);
        return parsed as Record<string, unknown>;
      }

      setConfigError("Config must be a JSON object.");
      return null;
    } catch {
      setConfigError("Config must be valid JSON.");
      return null;
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const config = parseConfig();
    if (!config) return;

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      category: form.category.trim(),
      defaultUom: form.defaultUom.trim() || "each",
      description: form.description.trim() || null,
      icon: form.icon.trim() || null,
      color: form.color.trim() || null,
      config,
    };

    if (selectedId) {
      await editMutation.mutateAsync({
        id: selectedId,
        ...payload,
      });
      return;
    }

    await createMutation.mutateAsync(payload);
  };

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Item Types</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create and manage inventory item types.
          </p>
        </div>
        <Button variant="outline" onClick={resetForCreate}>
          New item type
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Existing item types</CardTitle>
            <CardDescription>Pick one to edit.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">
                Loading item types...
              </p>
            ) : itemTypes.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No item types yet. Create one to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {itemTypes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => loadForEdit(item.id)}
                    className={`w-full rounded-md border px-3 py-2 text-left transition ${
                      selectedId === item.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{item.name}</p>
                      <span className="text-muted-foreground text-xs uppercase">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs">{item.slug}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedId ? "Edit item type" : "Create item type"}
            </CardTitle>
            <CardDescription>
              {selectedId
                ? "Update the selected item type."
                : "Define a new item type for inventory and operations."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span>Name</span>
                  <input
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    className="border-input bg-background w-full rounded-md border px-3 py-2"
                    placeholder="Fruiting Bed"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span>Slug</span>
                  <input
                    value={form.slug}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    required
                    className="border-input bg-background w-full rounded-md border px-3 py-2"
                    placeholder="fruiting-bed"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span>Category</span>
                  <input
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, category: e.target.value }))
                    }
                    required
                    className="border-input bg-background w-full rounded-md border px-3 py-2"
                    placeholder="biological"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span>Default UOM</span>
                  <input
                    value={form.defaultUom}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        defaultUom: e.target.value,
                      }))
                    }
                    required
                    className="border-input bg-background w-full rounded-md border px-3 py-2"
                    placeholder="each"
                  />
                </label>
              </div>

              <label className="space-y-1 text-sm">
                <span>Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2"
                  placeholder="Optional description"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span>Icon</span>
                  <input
                    value={form.icon}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, icon: e.target.value }))
                    }
                    className="border-input bg-background w-full rounded-md border px-3 py-2"
                    placeholder="box"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span>Color</span>
                  <input
                    value={form.color}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, color: e.target.value }))
                    }
                    className="border-input bg-background w-full rounded-md border px-3 py-2"
                    placeholder="#16a34a"
                  />
                </label>
              </div>

              <label className="space-y-1 text-sm">
                <span>Config (JSON object)</span>
                <textarea
                  value={form.configText}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, configText: e.target.value }))
                  }
                  className="border-input bg-background min-h-28 w-full rounded-md border px-3 py-2 font-mono text-xs"
                />
              </label>
              {configError && (
                <p className="text-destructive text-sm" role="alert">
                  {configError}
                </p>
              )}

              <div className="flex items-center gap-2">
                <Button type="submit" disabled={isSaving || isDeleting}>
                  {selectedId ? "Save changes" : "Create item type"}
                </Button>
                {selectedId && selectedItemType && (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isSaving || isDeleting}
                    onClick={async () => {
                      await deleteMutation.mutateAsync({
                        id: selectedItemType.id,
                      });
                    }}
                  >
                    Delete
                  </Button>
                )}
                {selectedId && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSaving || isDeleting}
                    onClick={resetForCreate}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
