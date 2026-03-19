"use client";

import React, { useMemo, useState } from "react";
import { Printer, Search } from "lucide-react";

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
import { Separator } from "~/components/ui/separator";
import { api } from "~/trpc/react";

import {
  LABEL_TEMPLATES,
  type LabelContent,
  type LabelTemplate,
} from "../_lib/templates";

interface ConfigPanelProps {
  selectedTemplate: LabelTemplate;
  onTemplateChange: (template: LabelTemplate) => void;
  content: LabelContent;
  onContentChange: (content: LabelContent) => void;
  selectedItemIds: Set<string>;
  onSelectedItemIdsChange: (ids: Set<string>) => void;
  onPrint: () => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  selectedTemplate,
  onTemplateChange,
  content,
  onContentChange,
  selectedItemIds,
  onSelectedItemIdsChange,
  onPrint,
}) => {
  const [typeId, setTypeId] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: types = [] } = api.itemType.list.useQuery();

  const { data: items = [], isLoading: itemsLoading } =
    api.item.listByType.useQuery(
      { itemTypeId: typeId, search: search.trim() || undefined },
      { enabled: !!typeId },
    );

  const thermalTemplates = useMemo(
    () => LABEL_TEMPLATES.filter((t) => t.category === "thermal"),
    [],
  );
  const sheetTemplates = useMemo(
    () => LABEL_TEMPLATES.filter((t) => t.category === "sheet"),
    [],
  );

  const allItemIds = items.map((i) => i.id);
  const allSelected =
    allItemIds.length > 0 && allItemIds.every((id) => selectedItemIds.has(id));

  function toggleAll() {
    if (allSelected) {
      onSelectedItemIdsChange(new Set());
    } else {
      onSelectedItemIdsChange(new Set(allItemIds));
    }
  }

  function toggleItem(id: string) {
    const next = new Set(selectedItemIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedItemIdsChange(next);
  }

  function toggleContent(key: keyof Omit<LabelContent, "customText">) {
    onContentChange({ ...content, [key]: !content[key] });
  }

  return (
    <div className="flex h-full w-80 shrink-0 flex-col overflow-hidden border-r">
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
        <Printer className="text-muted-foreground size-4" />
        <h2 className="text-sm font-semibold">Print Labels</h2>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {/* Item Type */}
        <div className="space-y-1.5">
          <Label className="text-xs">Item Type</Label>
          <Select
            value={typeId}
            onValueChange={(v) => {
              setTypeId(v);
              onSelectedItemIdsChange(new Set());
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

        {/* Item Selection */}
        {typeId && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Items</Label>
              {items.length > 0 && (
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
              {itemsLoading ? (
                <p className="text-muted-foreground px-2 py-3 text-center text-xs">
                  Loading...
                </p>
              ) : items.length === 0 ? (
                <p className="text-muted-foreground px-2 py-3 text-center text-xs">
                  No items found
                </p>
              ) : (
                items.map((it) => (
                  <label
                    key={it.id}
                    className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-2 py-1"
                  >
                    <Checkbox
                      checked={selectedItemIds.has(it.id)}
                      onCheckedChange={() => toggleItem(it.id)}
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

            {selectedItemIds.size > 0 && (
              <p className="text-muted-foreground text-xs">
                {selectedItemIds.size} item
                {selectedItemIds.size !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>
        )}

        <Separator />

        {/* Template Selection */}
        <div className="space-y-1.5">
          <Label className="text-xs">Label Template</Label>
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

        <Separator />

        {/* Label Content */}
        <div className="space-y-2">
          <Label className="text-xs">Label Content</Label>

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
              checked={content.showItemCode}
              onCheckedChange={() => toggleContent("showItemCode")}
            />
            <span className="text-xs">Item Code</span>
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
                onContentChange({ ...content, customText: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t px-4 py-3">
        <Button
          className="w-full"
          size="sm"
          disabled={selectedItemIds.size === 0}
          onClick={onPrint}
        >
          <Printer className="mr-1.5 size-3.5" />
          Print{" "}
          {selectedItemIds.size > 0
            ? `${selectedItemIds.size} labels`
            : "labels"}
        </Button>
      </div>
    </div>
  );
};
