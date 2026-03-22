"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GripVertical, Pencil, Plus, Trash2, X, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";

const FIELD_TYPES = [
  "text",
  "number",
  "boolean",
  "date",
  "datetime",
  "select",
  "barcode",
  "qr",
  "weight",
  "temperature",
  "notes",
] as const;

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function OperationTypeDetailPage() {
  const params = useParams<{ org: string; operationTypeId: string }>();
  const router = useRouter();
  const isNew = params.operationTypeId === "new";

  const utils = api.useUtils();

  const { data: opType, isLoading } = api.operationType.getById.useQuery(
    { id: params.operationTypeId },
    { enabled: !isNew },
  );

  const { data: itemTypes = [] } = api.itemType.list.useQuery();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");

  useEffect(() => {
    if (!opType) return;
    setName(opType.name);
    setDescription(opType.description ?? "");
    setIcon(opType.icon ?? "");
  }, [opType]);

  const createMutation = api.operationType.create.useMutation({
    onSuccess: async (created) => {
      await utils.operationType.list.invalidate();
      if (created) {
        router.replace(`/${params.org}/settings/operations/${created.id}`);
      }
    },
  });

  const updateMutation = api.operationType.update.useMutation({
    onSuccess: async () => {
      await utils.operationType.getById.invalidate({
        id: params.operationTypeId,
      });
      await utils.operationType.list.invalidate();
    },
  });

  const deleteMutation = api.operationType.delete.useMutation({
    onSuccess: async () => {
      await utils.operationType.list.invalidate();
      router.replace(`/${params.org}/settings/operations`);
    },
  });

  const handleSaveGeneral = async () => {
    if (isNew) {
      await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        icon: icon.trim() || null,
      });
    } else {
      await updateMutation.mutateAsync({
        id: params.operationTypeId,
        name: name.trim(),
        description: description.trim() || null,
        icon: icon.trim() || null,
      });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${opType?.name}" and all its configuration?`))
      return;
    await deleteMutation.mutateAsync({ id: params.operationTypeId });
  };

  if (!isNew && isLoading) {
    return (
      <div className="text-muted-foreground p-8 text-sm">
        Loading task type...
      </div>
    );
  }

  if (!isNew && !opType) {
    return (
      <div className="text-destructive p-8 text-sm">Task type not found.</div>
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="container mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/${params.org}/settings/operations`}
            className="text-muted-foreground hover:text-foreground -ml-1 rounded-md p-1 transition-colors"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isNew ? "New Task Type" : opType?.name}
            </h1>
          </div>
        </div>
        {!isNew && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-1.5 size-3.5" />
            Delete
          </Button>
        )}
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>
              Basic information about this task type.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="op-name">
                  Name
                </label>
                <Input
                  id="op-name"
                  placeholder="Harvest"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="op-description">
                  Description
                </label>
                <Textarea
                  id="op-description"
                  placeholder="Describe what this task does..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-5">
              <Button
                onClick={handleSaveGeneral}
                disabled={isSaving || !name.trim()}
              >
                {isSaving
                  ? "Saving..."
                  : isNew
                    ? "Create Task Type"
                    : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {!isNew && opType && (
          <>
            <InputsSection
              operationTypeId={opType.id}
              inputs={opType.inputs}
              itemTypes={itemTypes}
            />
            <StepsSection operationTypeId={opType.id} steps={opType.steps} />
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inputs Section (unified items + fields)
// ---------------------------------------------------------------------------

type InputEntry = {
  id: string;
  operationTypeId: string;
  referenceKey: string;
  label: string | null;
  description: string | null;
  type: string;
  required: boolean;
  options: Record<string, unknown> | null;
  defaultValue: unknown;
  sortOrder: number;
  itemConfig: {
    itemTypeId: string;
    minCount: number;
    maxCount: number | null;
    preconditionsStatuses: string[] | null;
  } | null;
};

type InputsSectionProps = {
  operationTypeId: string;
  inputs: InputEntry[];
  itemTypes: { id: string; name: string }[];
};

function InputsSection({
  operationTypeId,
  inputs,
  itemTypes,
}: InputsSectionProps) {
  const utils = api.useUtils();

  const [adding, setAdding] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const addMutation = api.operationType.addInput.useMutation({
    onSuccess: async () => {
      await utils.operationType.getById.invalidate({ id: operationTypeId });
      setAdding(null);
    },
  });

  const updateMutation = api.operationType.updateInput.useMutation({
    onSuccess: async () => {
      await utils.operationType.getById.invalidate({ id: operationTypeId });
      setEditingId(null);
    },
  });

  const deleteMutation = api.operationType.deleteInput.useMutation({
    onSuccess: async () => {
      await utils.operationType.getById.invalidate({ id: operationTypeId });
    },
  });

  const handleDelete = async (id: string, key: string) => {
    if (!window.confirm(`Delete input "${key}"?`)) return;
    await deleteMutation.mutateAsync({ id });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Inputs</CardTitle>
            <CardDescription>
              Item types and data fields used by this task.
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAdding("items")}
              className="gap-1"
            >
              <Plus className="size-3.5" />
              Item Input
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAdding("string")}
              className="gap-1"
            >
              <Plus className="size-3.5" />
              Field
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {inputs.length === 0 && !adding && (
          <p className="text-muted-foreground py-3 text-center text-xs">
            No inputs configured.
          </p>
        )}

        <div className="space-y-2">
          {inputs.map((inp) =>
            editingId === inp.id ? (
              <InputForm
                key={inp.id}
                itemTypes={itemTypes}
                initial={inp}
                onSave={async (data) => {
                  await updateMutation.mutateAsync({ id: inp.id, ...data });
                }}
                onCancel={() => setEditingId(null)}
                saving={updateMutation.isPending}
              />
            ) : (
              <div
                key={inp.id}
                className="border-border flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="text-muted-foreground/50 size-3.5" />
                  <span className="text-sm font-medium">
                    {inp.referenceKey}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {inp.type === "items"
                      ? itemTypes.find(
                          (it) => it.id === inp.itemConfig?.itemTypeId,
                        )?.name ?? "Item"
                      : inp.type}
                  </Badge>
                  {(inp.required ||
                    (inp.itemConfig && inp.itemConfig.minCount > 0)) && (
                    <Badge
                      variant="ghost"
                      className="bg-blue-300/20 text-xs text-blue-600"
                    >
                      Required
                    </Badge>
                  )}
                  {inp.itemConfig?.preconditionsStatuses &&
                    inp.itemConfig.preconditionsStatuses.length > 0 && (
                      <Badge
                        variant="ghost"
                        className="bg-blue-300/20 text-xs text-blue-600"
                      >
                        {inp.itemConfig.preconditionsStatuses.join(", ")}
                      </Badge>
                    )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setEditingId(inp.id)}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive h-7 w-7 p-0"
                    onClick={() => handleDelete(inp.id, inp.referenceKey)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            ),
          )}

          {adding && (
            <InputForm
              itemTypes={itemTypes}
              defaultType={adding}
              onSave={async (data) => {
                await addMutation.mutateAsync({
                  operationTypeId,
                  ...data,
                });
              }}
              onCancel={() => setAdding(null)}
              saving={addMutation.isPending}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Input Form (inline — handles both item and field types)
// ---------------------------------------------------------------------------

type InputFormData = {
  referenceKey: string;
  label: string | null;
  description: string | null;
  type: string;
  required: boolean;
  sortOrder: number;
  options: Record<string, unknown> | null;
  defaultValue: unknown;
  itemTypeId?: string;
  minCount?: number;
  maxCount?: number | null;
  preconditionsStatuses?: string[] | null;
};

function InputForm({
  itemTypes,
  initial,
  defaultType,
  onSave,
  onCancel,
  saving,
}: {
  itemTypes: { id: string; name: string }[];
  initial?: InputEntry;
  defaultType?: string;
  onSave: (data: InputFormData) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const resolvedType = initial?.type ?? defaultType ?? "string";
  const [referenceKey, setReferenceKey] = useState(initial?.referenceKey ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [inputType, setInputType] = useState(resolvedType);
  const [required, setRequired] = useState(initial?.required ?? false);
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [enumText, setEnumText] = useState(
    ((initial?.options as { enum?: string[] } | null)?.enum ?? []).join(", "),
  );

  const [itemTypeId, setItemTypeId] = useState(
    initial?.itemConfig?.itemTypeId ?? itemTypes[0]?.id ?? "",
  );
  const [qtyMin, setQtyMin] = useState(
    String(initial?.itemConfig?.minCount ?? ""),
  );
  const [qtyMax, setQtyMax] = useState(
    initial?.itemConfig?.maxCount != null
      ? String(initial.itemConfig.maxCount)
      : "",
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    initial?.itemConfig?.preconditionsStatuses ?? [],
  );
  const [statusInput, setStatusInput] = useState("");

  const isItems = inputType === "items";

  const { data: availableStatuses = [] } =
    api.operationType.statusesForItemType.useQuery(
      { itemTypeId },
      { enabled: !!itemTypeId && isItems },
    );

  const toggleStatus = (name: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const enumOptions =
      inputType === "select" && enumText.trim()
        ? enumText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : null;

    await onSave({
      referenceKey: referenceKey.trim(),
      label: label.trim() || null,
      description: description.trim() || null,
      type: inputType,
      required,
      sortOrder: Number(sortOrder) || 0,
      options: enumOptions ? { enum: enumOptions } : null,
      defaultValue: null,
      ...(isItems
        ? {
            itemTypeId,
            minCount: parseInt(qtyMin, 10) || 0,
            maxCount: qtyMax.trim() ? parseInt(qtyMax, 10) || null : null,
            preconditionsStatuses:
              selectedStatuses.length > 0 ? selectedStatuses : null,
          }
        : {}),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border bg-muted/30 rounded-md border p-3"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium tracking-wider uppercase">
          {initial ? "Edit" : "New"} {isItems ? "item input" : "field"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onCancel}
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium">Reference Key</label>
          <Input
            required
            placeholder={isItems ? "primary" : "weight_kg"}
            value={referenceKey}
            onChange={(e) => setReferenceKey(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Type</label>
          <Select value={inputType} onValueChange={setInputType}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="items">Item Input</SelectItem>
              {FIELD_TYPES.map((ft) => (
                <SelectItem key={ft} value={ft}>
                  {ft}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isItems && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-medium">Item Category</label>
              <Select value={itemTypeId} onValueChange={setItemTypeId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {itemTypes.map((it) => (
                    <SelectItem key={it.id} value={it.id}>
                      {it.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Qty Min</label>
                <Input
                  placeholder="0"
                  value={qtyMin}
                  onChange={(e) => setQtyMin(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Qty Max</label>
                <Input
                  placeholder="—"
                  value={qtyMax}
                  onChange={(e) => setQtyMax(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {!isItems && (
          <>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium">Label</label>
              <Input
                placeholder="Optional display label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium">Description</label>
              <Input
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {inputType === "select" && (
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium">
                  Options (comma-separated)
                </label>
                <Input
                  placeholder="option1, option2, option3"
                  value={enumText}
                  onChange={(e) => setEnumText(e.target.value)}
                />
              </div>
            )}
          </>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium">Sort Order</label>
          <Input
            placeholder="0"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="size-4 rounded"
          />
          Required
        </label>
      </div>

      {isItems && (
        <div className="mt-3 space-y-1 sm:col-span-2">
          <label className="text-xs font-medium">Status Preconditions</label>
          <p className="text-muted-foreground text-xs">
            Only items in these statuses will be accepted. Leave empty for any
            status.
          </p>
          {availableStatuses.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {availableStatuses.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => toggleStatus(s.name)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedStatuses.includes(s.name)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Input
                placeholder="e.g. printed, approved"
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const val = statusInput.trim().replace(/,+$/, "").trim();
                    if (val && !selectedStatuses.includes(val)) {
                      setSelectedStatuses((prev) => [...prev, val]);
                    }
                    setStatusInput("");
                  }
                }}
              />
              {selectedStatuses.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedStatuses.map((s) => (
                    <span
                      key={s}
                      className="border-primary bg-primary/10 text-primary flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedStatuses((prev) =>
                            prev.filter((x) => x !== s),
                          )
                        }
                        className="hover:text-destructive ml-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-3">
        <Button
          type="submit"
          size="sm"
          disabled={saving || !referenceKey.trim()}
        >
          {saving
            ? "Saving..."
            : initial
              ? "Update Input"
              : isItems
                ? "Add Item Input"
                : "Add Field"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Steps Section
// ---------------------------------------------------------------------------

type StepsSectionProps = {
  operationTypeId: string;
  steps: {
    id: string;
    operationTypeId: string;
    name: string;
    action: string;
    target: string | null;
    config: unknown;
    sortOrder: number;
  }[];
};

function StepsSection({ operationTypeId, steps }: StepsSectionProps) {
  const utils = api.useUtils();

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const addMutation = api.operationType.addStep.useMutation({
    onSuccess: async () => {
      await utils.operationType.getById.invalidate({ id: operationTypeId });
      setAdding(false);
    },
  });

  const updateMutation = api.operationType.updateStep.useMutation({
    onSuccess: async () => {
      await utils.operationType.getById.invalidate({ id: operationTypeId });
      setEditingId(null);
    },
  });

  const deleteMutation = api.operationType.deleteStep.useMutation({
    onSuccess: async () => {
      await utils.operationType.getById.invalidate({ id: operationTypeId });
    },
  });

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete step "${name}"?`)) return;
    await deleteMutation.mutateAsync({ id });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Steps</CardTitle>
            <CardDescription>
              Ordered steps that make up this task&apos;s workflow.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAdding(true)}
            className="gap-1"
          >
            <Plus className="size-3.5" />
            Add Step
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {steps.length === 0 && !adding && (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No steps configured yet.
          </p>
        )}

        <div className="space-y-2">
          {steps.map((step, idx) =>
            editingId === step.id ? (
              <StepForm
                key={step.id}
                initial={step}
                onSave={async (data) => {
                  await updateMutation.mutateAsync({ id: step.id, ...data });
                }}
                onCancel={() => setEditingId(null)}
                saving={updateMutation.isPending}
              />
            ) : (
              <div
                key={step.id}
                className="border-border flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground flex size-5 items-center justify-center rounded-full bg-current/10 text-xs font-medium">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium">{step.name}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {step.action}
                  </Badge>
                  {step.target && (
                    <span className="text-muted-foreground text-xs">
                      → {step.target}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setEditingId(step.id)}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive h-7 w-7 p-0"
                    onClick={() => handleDelete(step.id, step.name)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            ),
          )}

          {adding && (
            <StepForm
              onSave={async (data) => {
                await addMutation.mutateAsync({
                  operationTypeId,
                  ...data,
                });
              }}
              onCancel={() => setAdding(false)}
              saving={addMutation.isPending}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Step Form (inline)
// ---------------------------------------------------------------------------

type StepFormData = {
  name: string;
  action: string;
  target: string | null;
  config: unknown;
  sortOrder: number;
};

function StepForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: StepFormData;
  onSave: (data: StepFormData) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const { data: availableActions = [] } = api.operation.actions.useQuery();

  const [name, setName] = useState(initial?.name ?? "");
  const [action, setAction] = useState(initial?.action ?? "");
  const [target, setTarget] = useState(initial?.target ?? "");
  const [valueText, setValueText] = useState(
    initial?.config != null ? JSON.stringify(initial.config) : "",
  );
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsedValue: unknown = null;
    if (valueText.trim()) {
      try {
        parsedValue = JSON.parse(valueText);
      } catch {
        parsedValue = valueText.trim();
      }
    }
    await onSave({
      name: name.trim(),
      action,
      target: target.trim() || null,
      config: parsedValue,
      sortOrder: Number(sortOrder) || 0,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border bg-muted/30 rounded-md border p-3"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium tracking-wider uppercase">
          {initial ? "Edit" : "New"} step
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onCancel}
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium">Name</label>
          <Input
            required
            placeholder="Scan input bag"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Action</label>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select action…" />
            </SelectTrigger>
            <SelectContent>
              {availableActions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Target</label>
          <Input
            placeholder="field key or port role..."
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Value (JSON)</label>
          <Input
            placeholder='e.g. "colonized" or 42'
            value={valueText}
            onChange={(e) => setValueText(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Sort Order</label>
          <Input
            placeholder="0"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-3">
        <Button type="submit" size="sm" disabled={saving || !name.trim()}>
          {saving ? "Saving..." : initial ? "Update Step" : "Add Step"}
        </Button>
      </div>
    </form>
  );
}
