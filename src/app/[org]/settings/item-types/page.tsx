"use client";

import { useEffect, useMemo, useState } from "react";

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

type SequenceFormState = {
  enabled: boolean;
  prefix: string;
  nextNumber: string;
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

const EMPTY_SEQUENCE_FORM: SequenceFormState = {
  enabled: false,
  prefix: "",
  nextNumber: "1",
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function ItemTypesSettingsPage() {
  const utils = api.useUtils();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: itemTypes = [], isLoading } = api.itemType.list.useQuery();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [sequenceForm, setSequenceForm] =
    useState<SequenceFormState>(EMPTY_SEQUENCE_FORM);
  const [configError, setConfigError] = useState<string | null>(null);
  const [sequenceError, setSequenceError] = useState<string | null>(null);

  const selectedItemType = useMemo(
    () => itemTypes.find((item) => item.id === selectedId) ?? null,
    [itemTypes, selectedId],
  );

  const resetForCreate = () => {
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setSequenceForm(EMPTY_SEQUENCE_FORM);
    setConfigError(null);
    setSequenceError(null);
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
    setSequenceError(null);
  };

  const createMutation = api.itemType.create.useMutation();

  const editMutation = api.itemType.edit.useMutation();

  const deleteMutation = api.itemType.delete.useMutation({
    onSuccess: async () => {
      await utils.itemType.list.invalidate();
      resetForCreate();
    },
  });

  const isSaving = createMutation.isPending || editMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  useEffect(() => {
    if (!selectedId) return;

    const existing = itemTypes.find((item) => item.id === selectedId);
    if (!existing?.codePrefix) {
      setSequenceForm(EMPTY_SEQUENCE_FORM);
      return;
    }

    setSequenceForm({
      enabled: true,
      prefix: existing.codePrefix,
      nextNumber: String(existing.codeNextNumber),
    });
  }, [selectedId, itemTypes]);

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: slugify(value),
    }));
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

    let codePrefix: string | null = null;
    let codeNextNumber: number | undefined;

    if (sequenceForm.enabled) {
      const nextNumber = Number(sequenceForm.nextNumber);
      if (!Number.isInteger(nextNumber) || nextNumber <= 0) {
        setSequenceError("Next number must be a positive integer.");
        return;
      }
      if (!sequenceForm.prefix.trim()) {
        setSequenceError("Sequence prefix is required.");
        return;
      }

      codePrefix = sequenceForm.prefix.trim();
      codeNextNumber = nextNumber;
    }
    setSequenceError(null);

    if (selectedId) {
      await editMutation.mutateAsync({
        id: selectedId,
        ...payload,
        codePrefix,
        codeNextNumber,
      });
      await utils.itemType.list.invalidate();
      return;
    }

    await createMutation.mutateAsync({
      ...payload,
      codePrefix,
      codeNextNumber,
    });
    await utils.itemType.list.invalidate();
    resetForCreate();
  };

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Set up the types of things you track (blocks, batches, trays, etc.)
          </p>
        </div>
        <Button variant="outline" onClick={resetForCreate}>
          New category
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Existing categories</CardTitle>
            <CardDescription>Pick one to edit.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">
                Loading categories...
              </p>
            ) : itemTypes.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No categories yet. Create one to get started.
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
                    {item.description && (
                      <p className="text-muted-foreground text-xs">{item.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedId ? "Edit category" : "Create category"}
            </CardTitle>
            <CardDescription>
              {selectedId
                ? "Update the selected category."
                : "Define a new category for your inventory."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  <span>Default Unit</span>
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

              
              <div className="grid gap-4 rounded-md border p-4 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <input
                    type="checkbox"
                    checked={sequenceForm.enabled}
                    onChange={(e) =>
                      setSequenceForm((prev) => ({
                        ...prev,
                        enabled: e.target.checked,
                      }))
                    }
                    className="size-4"
                  />
                  <span>Configure item code sequence for this item type</span>
                </label>

                <label className="space-y-1 text-sm">
                  <span>Code Prefix</span>
                  <input
                    value={sequenceForm.prefix}
                    onChange={(e) =>
                      setSequenceForm((prev) => ({
                        ...prev,
                        prefix: e.target.value,
                      }))
                    }
                    disabled={!sequenceForm.enabled}
                    className="border-input bg-background w-full rounded-md border px-3 py-2 disabled:opacity-50"
                    placeholder="mushroom"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span>Next Number</span>
                  <input
                    value={sequenceForm.nextNumber}
                    onChange={(e) =>
                      setSequenceForm((prev) => ({
                        ...prev,
                        nextNumber: e.target.value,
                      }))
                    }
                    disabled={!sequenceForm.enabled}
                    className="border-input bg-background w-full rounded-md border px-3 py-2 disabled:opacity-50"
                    placeholder="1"
                  />
                </label>
              </div>
              {configError && (
                <p className="text-destructive text-sm" role="alert">
                  {configError}
                </p>
              )}
              {sequenceError && (
                <p className="text-destructive text-sm" role="alert">
                  {sequenceError}
                </p>
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  disabled={isSaving || isDeleting}
                >
                  {selectedId ? "Save changes" : "Create category"}
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
