"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Circle, PackagePlus, Printer, Search } from "lucide-react";

import { Button } from "~/components/ui/button";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Separator } from "~/components/ui/separator";
import { api } from "~/trpc/react";

import {
  LABEL_TEMPLATES,
  type LabelContent,
  type LabelTemplate,
} from "../_lib/templates";

type SourceMode = "existing" | "create";

interface ConfigPanelProps {
  selectedTemplate: LabelTemplate;
  onTemplateChange: (template: LabelTemplate) => void;
  content: LabelContent;
  onContentChange: (content: LabelContent) => void;
  selectedLotIds: Set<string>;
  onSelectedLotIdsChange: (ids: Set<string>) => void;
  onPrint: () => void;
  initialTypeId?: string;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  selectedTemplate,
  onTemplateChange,
  content,
  onContentChange,
  selectedLotIds,
  onSelectedLotIdsChange,
  onPrint,
  initialTypeId,
}) => {
  const [typeId, setTypeId] = useState<string>(initialTypeId ?? "");
  const [sourceMode, setSourceMode] = useState<SourceMode>("create");
  const [search, setSearch] = useState("");

  const [batchCount, setBatchCount] = useState("10");
  const [batchVariant, setBatchVariant] = useState("none");
  const [batchStatus, setBatchStatus] = useState("");
  const [batchError, setBatchError] = useState<string | null>(null);
  const [attrValues, setAttrValues] = useState<Record<string, unknown>>({});

  const utils = api.useUtils();

  const { data: types = [] } = api.lotType.list.useQuery();

  const { data: typeData } = api.lotType.getById.useQuery(
    { id: typeId },
    { enabled: !!typeId },
  );
  const statuses = typeData?.statuses ?? [];
  const variants = typeData?.variants ?? [];
  const attrDefs = typeData?.attributeDefinitions ?? [];

  useEffect(() => {
    if (!attrDefs.length) return;
    const defaults: Record<string, unknown> = {};
    for (const d of attrDefs) {
      if (d.defaultValue != null && d.defaultValue !== "") {
        if (d.dataType === "number")
          defaults[d.attrKey] = Number(d.defaultValue);
        else if (d.dataType === "boolean")
          defaults[d.attrKey] = d.defaultValue === "true";
        else defaults[d.attrKey] = d.defaultValue;
      }
    }
    setAttrValues(defaults);
  }, [attrDefs]);

  const { data: lots = [], isLoading: lotsLoading } =
    api.lot.listByType.useQuery(
      { lotTypeId: typeId, search: search.trim() || undefined },
      { enabled: !!typeId && sourceMode === "existing" },
    );

  const batchCreate = api.lot.batchCreate.useMutation({
    onSuccess: (data) => {
      const newIds = new Set(data.lots.map((i) => i.id));
      onSelectedLotIdsChange(newIds);
      void utils.lot.listByType.invalidate();
      void utils.lotType.getById.invalidate({ id: typeId });
      setBatchError(null);
      setSourceMode("existing");
    },
    onError: (err) => {
      setBatchError(err.message);
    },
  });

  const thermalTemplates = useMemo(
    () => LABEL_TEMPLATES.filter((t) => t.category === "thermal"),
    [],
  );
  const sheetTemplates = useMemo(
    () => LABEL_TEMPLATES.filter((t) => t.category === "sheet"),
    [],
  );

  const allLotIds = lots.map((i) => i.id);
  const allSelected =
    allLotIds.length > 0 && allLotIds.every((id) => selectedLotIds.has(id));

  function toggleAll() {
    if (allSelected) {
      onSelectedLotIdsChange(new Set());
    } else {
      onSelectedLotIdsChange(new Set(allLotIds));
    }
  }

  function toggleLot(id: string) {
    const next = new Set(selectedLotIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedLotIdsChange(next);
  }

  function toggleContent(key: keyof Omit<LabelContent, "customText">) {
    onContentChange({ ...content, [key]: !content[key] });
  }

  function handleBatchCreate() {
    const cnt = parseInt(batchCount, 10);
    if (!cnt || cnt < 1 || !typeId) return;
    const initialStatus = statuses.find((s) => s.category === "unstarted");
    const attributes: Record<string, unknown> = {};
    for (const d of attrDefs) {
      const v = attrValues[d.attrKey];
      if (v !== undefined && v !== null && v !== "") {
        attributes[d.attrKey] = v;
      }
    }
    batchCreate.mutate({
      lotTypeId: typeId,
      useSequence: true,
      count: cnt,
      variantId: batchVariant === "none" ? null : batchVariant,
      status: batchStatus || initialStatus?.id || "created",
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    });
  }

  const parsedBatchCount = parseInt(batchCount, 10);
  const codePrefix = typeData?.lotType?.codePrefix ?? null;

  return (
    <div className="flex h-full w-80 shrink-0 flex-col overflow-hidden border-r">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        {/* Lot Type */}
        <div className="m-4 space-y-1.5">
          <Label className="text-xs">Lot Type</Label>
          <Select
            value={typeId}
            onValueChange={(v) => {
              setTypeId(v);
              onSelectedLotIdsChange(new Set());
              setBatchError(null);
              setBatchStatus("");
              setBatchVariant("none");
              setAttrValues({});
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select a type..." />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Source mode toggle */}
        {typeId && (
          <div className="m-4 flex gap-1 rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => setSourceMode("existing")}
              className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                sourceMode === "existing"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Existing Lots
            </button>
            <button
              type="button"
              onClick={() => setSourceMode("create")}
              className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                sourceMode === "create"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create Batch
            </button>
          </div>
        )}

        {/* Existing lot selection */}
        {typeId && sourceMode === "existing" && (
          <div className="m-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Lots</Label>
              {lots.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-primary text-xs hover:underline"
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
              <Input
                placeholder="Search by code..."
                className="h-7 pl-7 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="max-h-48 space-y-0.5 overflow-y-auto rounded border p-1">
              {lotsLoading ? (
                <p className="text-muted-foreground px-2 py-3 text-center text-xs">
                  Loading...
                </p>
              ) : lots.length === 0 ? (
                <p className="text-muted-foreground px-2 py-3 text-center text-xs">
                  No lots found
                </p>
              ) : (
                lots.map((it) => (
                  <label
                    key={it.id}
                    className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-2 py-1"
                  >
                    <Checkbox
                      checked={selectedLotIds.has(it.id)}
                      onCheckedChange={() => toggleLot(it.id)}
                    />
                    <span className="truncate font-mono text-xs">
                      {it.code}
                    </span>
                    {it.variantName && (
                      <span className="text-muted-foreground truncate text-xs">
                        {it.variantName}
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>

            {selectedLotIds.size > 0 && (
              <p className="text-muted-foreground text-xs">
                {selectedLotIds.size} lot
                {selectedLotIds.size !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>
        )}

        {/* Batch creation form */}
        {typeId && sourceMode === "create" && (
          <div className="m-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">How many?</Label>
              <Input
                type="number"
                min={1}
                max={1000}
                className="h-8 text-xs"
                value={batchCount}
                onChange={(e) => setBatchCount(e.target.value)}
                placeholder="10"
              />
              <p className="text-muted-foreground text-xs">
                Max 1,000 per batch
                {codePrefix ? ` \u00B7 ${codePrefix}-XXXXX` : ""}
              </p>
            </div>

            {variants.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Variant</Label>
                <Select value={batchVariant} onValueChange={setBatchVariant}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Unassigned" />
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

            {attrDefs.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2.5">
                  <Label className="text-muted-foreground text-xs tracking-wide uppercase">
                    Attributes
                  </Label>
                  {attrDefs.map((d) => (
                    <div key={d.id} className="space-y-1">
                      <Label className="text-xs font-medium">
                        {d.attrKey}
                        {d.isRequired && (
                          <span className="text-destructive ml-0.5">*</span>
                        )}
                        {d.unit && (
                          <span className="text-muted-foreground ml-1 font-normal">
                            ({d.unit})
                          </span>
                        )}
                      </Label>
                      <AttrInput
                        def={d}
                        value={attrValues[d.attrKey]}
                        onChange={(v) =>
                          setAttrValues((prev) => ({
                            ...prev,
                            [d.attrKey]: v,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {!codePrefix && (
              <p className="text-destructive text-xs">
                No code prefix configured. Edit this type to set one before
                creating lots.
              </p>
            )}

            {batchError && (
              <p className="text-destructive text-xs">{batchError}</p>
            )}

            <Button
              size="sm"
              className="w-full"
              disabled={
                batchCreate.isPending ||
                !codePrefix ||
                !batchCount ||
                parsedBatchCount < 1
              }
              onClick={handleBatchCreate}
            >
              <PackagePlus className="mr-1.5 size-3.5" />
              {batchCreate.isPending
                ? "Creating..."
                : `Create ${parsedBatchCount || 0} & add to print`}
            </Button>
          </div>
        )}

        <Accordion type="multiple">
          <AccordionItem value="template" className="border-t border-b">
            <AccordionTrigger className="px-4 py-2 text-xs">
              Label Template
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1.5 px-4">
                <Select
                  value={selectedTemplate.id}
                  onValueChange={(id) => {
                    const t = LABEL_TEMPLATES.find((t) => t.id === id);
                    if (t) onTemplateChange(t);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem disabled value="_thermal_header">
                      <span className="text-muted-foreground text-xs font-semibold uppercase">
                        Thermal
                      </span>
                    </SelectItem>
                    {thermalTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                    <SelectItem disabled value="_sheet_header">
                      <span className="text-muted-foreground text-xs font-semibold uppercase">
                        Sheet
                      </span>
                    </SelectItem>
                    {sheetTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  {selectedTemplate.labelWidth}&quot; &times;{" "}
                  {selectedTemplate.labelHeight}&quot;
                  {selectedTemplate.category === "sheet" &&
                    ` \u00B7 ${selectedTemplate.columns * selectedTemplate.rows}/sheet`}
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="content" className="border-b-0">
            <AccordionTrigger className="px-4 py-2 text-xs">
              Label Content
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 px-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={content.showQrCode}
                    onCheckedChange={() => toggleContent("showQrCode")}
                  />
                  <span className="text-xs">QR Code</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={content.showBarcode}
                    onCheckedChange={() => toggleContent("showBarcode")}
                  />
                  <span className="text-xs">Barcode</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={content.showLotCode}
                    onCheckedChange={() => toggleContent("showLotCode")}
                  />
                  <span className="text-xs">Lot Code</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={content.showTypeName}
                    onCheckedChange={() => toggleContent("showTypeName")}
                  />
                  <span className="text-xs">Type Name</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={content.showVariantName}
                    onCheckedChange={() => toggleContent("showVariantName")}
                  />
                  <span className="text-xs">Variant Name</span>
                </label>

                <div className="space-y-1">
                  <Label className="text-xs">Custom Text</Label>
                  <Input
                    className="h-7 text-xs"
                    placeholder="Optional text on every label"
                    value={content.customText}
                    onChange={(e) =>
                      onContentChange({
                        ...content,
                        customText: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="shrink-0 border-t px-4 py-3">
        <Button
          className="w-full"
          size="sm"
          disabled={selectedLotIds.size === 0}
          onClick={onPrint}
        >
          <Printer className="mr-1.5 size-3.5" />
          Print{" "}
          {selectedLotIds.size > 0 ? `${selectedLotIds.size} labels` : "labels"}
        </Button>
      </div>
    </div>
  );
};

interface AttrDef {
  attrKey: string;
  dataType: string;
  isRequired: boolean;
  unit: string | null;
  options: unknown;
  defaultValue: string | null;
}

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
          <SelectTrigger className="h-8 text-xs">
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
          <SelectTrigger className="h-8 text-xs">
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
          className="h-8 text-xs"
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
          className="h-8 text-xs"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );

    default:
      return (
        <Input
          className="h-8 text-xs"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="Enter value..."
        />
      );
  }
};
