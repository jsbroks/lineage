"use client";

import { useEffect, useRef, useState } from "react";
import {
  Barcode,
  ChevronLeft,
  Hash,
  Loader2,
  PackagePlus,
  Play,
  Plus,
  Sparkles,
  Tag,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";
import type {
  ScanWorkflow,
  ScanContext,
  WorkflowPanelProps,
  ScannedItem,
} from "./types";

const PRODUCT_FORMATS = new Set([
  "EAN_13",
  "EAN_8",
  "UPC_A",
  "UPC_E",
  "UPC_EAN_EXTENSION",
]);
function isProductFormat(fmt?: string) {
  return fmt != null && PRODUCT_FORMATS.has(fmt);
}

function categoryForFormat(fmt?: string): string {
  if (!fmt) return "product";
  if (PRODUCT_FORMATS.has(fmt)) return "product";
  if (fmt === "QR_CODE") return "product";
  return "product";
}

function unitForFormat(fmt?: string): string {
  if (fmt && PRODUCT_FORMATS.has(fmt)) return "each";
  return "each";
}

const LOT_TYPE_CATEGORIES = [
  { value: "product", label: "Product" },
  { value: "biological", label: "Biological" },
  { value: "material", label: "Material" },
  { value: "logistics", label: "Logistics" },
  { value: "equipment", label: "Equipment" },
];

function NewLotTypeForm({
  barcodeFormat,
  onCreated,
  onCancel,
}: {
  barcodeFormat?: string;
  onCreated: (lotTypeId: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categoryForFormat(barcodeFormat));
  const [defaultUnit, setDefaultUnit] = useState(unitForFormat(barcodeFormat));
  const [formError, setFormError] = useState<string | null>(null);

  const createTypeMutation = api.lotType.create.useMutation();
  const saveStatusesMutation = api.lotType.saveStatuses.useMutation();
  const utils = api.useUtils();

  const handleSubmit = async () => {
    if (!name.trim()) {
      setFormError("Name is required");
      return;
    }
    setFormError(null);

    try {
      const newType = await createTypeMutation.mutateAsync({
        name: name.trim(),
        category,
        quantityDefaultUnit: defaultUnit,
      });

      if (newType) {
        await saveStatusesMutation.mutateAsync({
          lotTypeId: newType.id,
          statuses: [
            { name: "Created", category: "unstarted", ordinal: 0 },
            { name: "Active", category: "in_progress", ordinal: 1 },
            { name: "Completed", category: "done", ordinal: 2 },
          ],
          transitions: [
            { fromSlug: "Created", toSlug: "Active" },
            { fromSlug: "Active", toSlug: "Completed" },
          ],
        });

        await utils.lotType.listWithStatuses.invalidate();
        onCreated(newType.id);
      }
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to create type");
    }
  };

  const isPending =
    createTypeMutation.isPending || saveStatusesMutation.isPending;

  return (
    <div className="border-primary/20 bg-primary/5 space-y-3 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-medium">New Lot Type</span>
        {barcodeFormat && (
          <Badge variant="secondary" className="text-[10px]">
            {barcodeFormat.replace(/_/g, " ")}
          </Badge>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </label>
        <Input
          autoFocus
          placeholder="e.g. Packaged Product"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSubmit();
            }
          }}
          className="text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOT_TYPE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Default Unit</label>
          <Input
            value={defaultUnit}
            onChange={(e) => setDefaultUnit(e.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      <p className="text-muted-foreground text-[11px]">
        A default status workflow (Created → Active → Completed) will be added
        automatically.
      </p>

      {formError && (
        <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
      )}

      <Button
        onClick={() => void handleSubmit()}
        disabled={isPending || !name.trim()}
        size="sm"
        className="w-full gap-1.5"
      >
        {isPending ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Plus className="size-3.5" />
            Create Lot Type
          </>
        )}
      </Button>
    </div>
  );
}

function CreateLotPanel({ ctx, onComplete }: WorkflowPanelProps) {
  const unknownCodes = ctx.unknowns.map((u) => u.rawCode);
  const firstCode = ctx.unknowns[0]?.rawCode;
  const firstFormat = ctx.unknowns[0]?.formatName;
  const isSingle = unknownCodes.length === 1;

  const resolveQuery = api.lotType.resolveByIdentifier.useQuery(
    { identifierValue: firstCode! },
    { enabled: !!firstCode },
  );

  const lotTypesQuery = api.lotType.listWithStatuses.useQuery();
  const createMutation = api.lot.create.useMutation();
  const addLotIdentifierMutation = api.lot.addIdentifier.useMutation();
  const addTypeIdentifierMutation = api.lotType.addIdentifier.useMutation();
  const utils = api.useUtils();

  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [autoFilled, setAutoFilled] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creatingNewType, setCreatingNewType] = useState(false);

  const typeDetailQuery = api.lotType.getById.useQuery(
    { id: selectedTypeId },
    { enabled: !!selectedTypeId },
  );

  const hasAutoFilled = useRef(false);
  useEffect(() => {
    if (resolveQuery.data && !hasAutoFilled.current) {
      setSelectedTypeId(resolveQuery.data.lotTypeId);
      if (resolveQuery.data.variantId) {
        setSelectedVariantId(resolveQuery.data.variantId);
      }
      setAutoFilled(true);
      hasAutoFilled.current = true;
    }
  }, [resolveQuery.data]);

  const resolvedMatch = resolveQuery.data;

  const selectedType = lotTypesQuery.data?.find((t) => t.id === selectedTypeId);
  const defaultStatus = selectedType?.statuses.find((s) => s.ordinal === 0);
  const variants =
    typeDetailQuery.data?.variants.filter((v) => v.isActive) ?? [];

  const handleTypeChange = (typeId: string) => {
    setSelectedTypeId(typeId);
    setSelectedVariantId("");
    if (typeId !== resolvedMatch?.lotTypeId) {
      setAutoFilled(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedTypeId || !defaultStatus) return;
    setError(null);

    try {
      const hostname = window.location.origin;
      const newItems: ScannedItem[] = [];
      const variantId = selectedVariantId || null;

      for (const unknown of ctx.unknowns) {
        const lot = await createMutation.mutateAsync({
          hostname,
          lotTypeId: selectedTypeId,
          variantId,
          code: unknown.rawCode,
          status: defaultStatus.id,
          notes: notes || undefined,
        });

        if (!isProductFormat(unknown.formatName)) {
          await addLotIdentifierMutation.mutateAsync({
            lotId: lot.id,
            identifierType: unknown.formatName ?? "Barcode",
            identifierValue: unknown.rawCode,
          });
        }

        await addTypeIdentifierMutation.mutateAsync({
          lotTypeId: selectedTypeId,
          variantId: autoFilled ? resolvedMatch?.variantId : variantId,
          identifierType: unknown.formatName ?? "Barcode",
          identifierValue: unknown.rawCode,
        });

        const lotData = await utils.lot.getByCode.fetch({
          code: unknown.rawCode,
        });
        newItems.push({
          kind: "lot",
          lot: lotData,
          rawCode: unknown.rawCode,
          formatName: unknown.formatName,
        });
      }

      onComplete({
        message: `Created ${unknownCodes.length} lot(s).`,
        updatedItems: [
          ...ctx.items.filter((i) => i.kind !== "unknown"),
          ...newItems,
        ],
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create lot");
    }
  };

  const isPending =
    createMutation.isPending ||
    addLotIdentifierMutation.isPending ||
    addTypeIdentifierMutation.isPending;

  return (
    <>
      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        <label className="text-muted-foreground mb-1.5 block text-xs font-medium tracking-wide uppercase">
          Create New Lot
        </label>

        {autoFilled && resolvedMatch && (
          <div className="bg-primary/5 border-primary/20 mb-3 flex items-start gap-2 rounded-md border px-3 py-2">
            <Sparkles className="text-primary mt-0.5 size-3.5 shrink-0" />
            <div className="text-xs">
              <span className="font-medium">Recognized as </span>
              <Badge variant="secondary" className="text-[10px]">
                {resolvedMatch.lotTypeName}
                {resolvedMatch.variantName && ` > ${resolvedMatch.variantName}`}
              </Badge>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Code */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium">
              <Barcode className="text-muted-foreground size-3.5" />
              Code
            </label>
            {isSingle ? (
              <Input
                value={firstCode ?? ""}
                readOnly
                className="bg-muted/50 font-mono text-sm"
              />
            ) : (
              <div className="space-y-1">
                {unknownCodes.map((code) => (
                  <div
                    key={code}
                    className="bg-muted/50 rounded-md border px-2.5 py-1.5 font-mono text-xs"
                  >
                    {code}
                  </div>
                ))}
              </div>
            )}
            <p className="text-muted-foreground text-[11px]">
              {isSingle
                ? "This scanned code will be used as the lot code."
                : `${unknownCodes.length} lots will be created, one per code.`}
            </p>
          </div>

          {/* Lot Type */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium">
              <Tag className="text-muted-foreground size-3.5" />
              Lot Type <span className="text-destructive">*</span>
            </label>

            {creatingNewType ? (
              <NewLotTypeForm
                barcodeFormat={firstFormat}
                onCreated={(id) => {
                  setSelectedTypeId(id);
                  setCreatingNewType(false);
                }}
                onCancel={() => setCreatingNewType(false)}
              />
            ) : (
              <>
                {lotTypesQuery.isLoading || resolveQuery.isLoading ? (
                  <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
                    <Loader2 className="size-4 animate-spin" />
                    {resolveQuery.isLoading
                      ? "Detecting type..."
                      : "Loading types..."}
                  </div>
                ) : (
                  <>
                    <Select
                      value={selectedTypeId}
                      onValueChange={handleTypeChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select lot type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {lotTypesQuery.data?.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!resolvedMatch && (
                      <button
                        type="button"
                        onClick={() => setCreatingNewType(true)}
                        className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs font-medium"
                      >
                        <Plus className="size-3" />
                        Create new lot type
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Variant — read-only when auto-detected, dropdown when user needs to pick */}
          {selectedTypeId && !creatingNewType && variants.length > 0 && (
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <Hash className="text-muted-foreground size-3.5" />
                Variant
                {!autoFilled && !selectedVariantId && (
                  <span className="text-destructive">*</span>
                )}
              </label>
              {autoFilled && selectedVariantId ? (
                <div className="bg-muted/50 rounded-md border px-2.5 py-1.5 text-sm">
                  {variants.find((v) => v.id === selectedVariantId)?.name ??
                    selectedVariantId}
                </div>
              ) : (
                <Select
                  value={selectedVariantId}
                  onValueChange={setSelectedVariantId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select variant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Initial status (read-only) */}
          {selectedType && defaultStatus && !creatingNewType && (
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                Initial Status
              </label>
              <div className="bg-muted/50 rounded-md border px-2.5 py-1.5 text-sm">
                {defaultStatus.name}
              </div>
            </div>
          )}

          {/* Notes */}
          {!creatingNewType && (
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                Notes
              </label>
              <Textarea
                placeholder="Optional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {!creatingNewType && (
        <div className="border-t p-4">
          {error && (
            <div className="bg-destructive/10 text-destructive mb-3 rounded-md px-3 py-2 text-sm">
              {error}
            </div>
          )}
          <Button
            onClick={() => void handleCreate()}
            disabled={isPending || !selectedTypeId || !defaultStatus}
            className="w-full gap-2"
            size="lg"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Play className="size-4" />
                Create {isSingle ? "Lot" : `${unknownCodes.length} Lots`}
              </>
            )}
          </Button>
        </div>
      )}
    </>
  );
}

export const createLotWorkflow: ScanWorkflow = {
  id: "create-lot",
  match(ctx: ScanContext) {
    if (ctx.unknowns.length === 0) return null;
    return {
      label: "Create New Lot",
      description: `Create ${ctx.unknowns.length} lot(s) from unrecognized code(s)`,
      icon: PackagePlus,
      ready: true,
      priority: 30,
    };
  },
  Panel: CreateLotPanel,
};
