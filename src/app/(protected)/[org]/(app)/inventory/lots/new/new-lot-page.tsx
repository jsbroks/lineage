"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Check, Minus, Package, Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { api } from "~/trpc/react";
import { Icon } from "~/app/_components/IconPicker";
import { cn } from "~/lib/utils";
import { getColorClasses } from "~/app/_components/ColorSelector";

type AttrValues = Record<string, string>;

function NewLotPageInner() {
  const params = useParams<{ org: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const org = params.org;
  const utils = api.useUtils();

  const preselectedTypeId = searchParams.get("typeId") ?? "";

  const [lotTypeId, setLotTypeId] = useState(preselectedTypeId);
  const [variantId, setVariantId] = useState<string>("");
  const [locationId, setLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [count, setCount] = useState(1);
  const [attrValues, setAttrValues] = useState<AttrValues>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    count: number;
    typeName: string;
  } | null>(null);

  const { data: lotTypesWithStatuses = [] } =
    api.lotType.listWithStatuses.useQuery();
  const { data: locations = [] } = api.location.list.useQuery();

  const { data: typeDetail } = api.lotType.getById.useQuery(
    { id: lotTypeId },
    { enabled: !!lotTypeId },
  );

  const selectedType = useMemo(
    () => lotTypesWithStatuses.find((t) => t.id === lotTypeId) ?? null,
    [lotTypesWithStatuses, lotTypeId],
  );

  const variants = typeDetail?.variants?.filter((v) => v.isActive) ?? [];
  const attributeDefs = typeDetail?.attributeDefinitions ?? [];

  useEffect(() => {
    setVariantId("");
    setAttrValues({});
  }, [lotTypeId]);

  useEffect(() => {
    if (variants.length > 0 && !variantId) {
      const defaultVariant = variants.find((v) => v.isDefault);
      if (defaultVariant) setVariantId(defaultVariant.id);
    }
  }, [variants, variantId]);

  useEffect(() => {
    if (attributeDefs.length === 0) return;
    setAttrValues((prev) => {
      const next = { ...prev };
      for (const def of attributeDefs) {
        if (!(def.attrKey in next)) {
          next[def.attrKey] = def.defaultValue ?? "";
        }
      }
      return next;
    });
  }, [attributeDefs]);

  const batchCreate = api.lot.batchCreate.useMutation({
    onSuccess: async (data) => {
      await utils.lot.list.invalidate();
      await utils.lotType.inventoryOverview.invalidate();
      setSuccess({
        count: data.created,
        typeName: selectedType?.name ?? "lots",
      });
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!lotTypeId) {
      setError("Select a product type.");
      return;
    }

    const attributes: Record<string, unknown> = {};
    for (const def of attributeDefs) {
      const val = attrValues[def.attrKey];
      if (def.isRequired && (!val || val.trim() === "")) {
        setError(`"${def.attrKey}" is required.`);
        return;
      }
      if (val && val.trim() !== "") {
        if (def.dataType === "number") {
          const num = Number(val);
          if (isNaN(num)) {
            setError(`"${def.attrKey}" must be a number.`);
            return;
          }
          attributes[def.attrKey] = num;
        } else if (def.dataType === "boolean") {
          attributes[def.attrKey] = val === "true";
        } else {
          attributes[def.attrKey] = val;
        }
      }
    }

    batchCreate.mutate({
      lotTypeId,
      variantId: variantId || null,
      useSequence: true,
      count,
      status: "created",
      locationId: locationId || null,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    });
  };

  const handleCreateMore = () => {
    setSuccess(null);
    setCount(1);
    setNotes("");
    setAttrValues({});
  };

  if (success) {
    return (
      <div className="flex min-h-full flex-col">
        <header className="flex items-center gap-2 border-b px-4 py-2">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">New Lots</h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="bg-primary/10 flex size-14 items-center justify-center rounded-full">
              <Check className="text-primary size-7" />
            </div>
            <div>
              <p className="text-lg font-semibold">
                Created {success.count} {success.count === 1 ? "lot" : "lots"}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {success.typeName} added to inventory.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleCreateMore}>
                Create more
              </Button>
              <Button onClick={() => router.push(`/${org}/inventory`)}>
                View inventory
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center gap-2 border-b px-4 py-2">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold">New Lots</h1>
      </header>

      <div className="mx-auto w-full max-w-lg px-6 py-8">
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {/* Product Type */}
            <Field>
              <FieldLabel>Product</FieldLabel>
              <FieldContent>
                <Select value={lotTypeId} onValueChange={setLotTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product type" />
                  </SelectTrigger>
                  <SelectContent>
                    {lotTypesWithStatuses.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded",
                              getColorClasses(t.color).bg,
                              getColorClasses(t.color).text,
                            )}
                            style={
                              t.color
                                ? { backgroundColor: t.color + "20" }
                                : undefined
                            }
                          >
                            <Icon icon={t.icon} className="size-3" />
                          </div>
                          {t.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>

            {/* Variant */}
            {variants.length > 0 && (
              <Field>
                <FieldLabel>Variant</FieldLabel>
                <FieldContent>
                  <Select value={variantId} onValueChange={setVariantId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select variant" />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
            )}

            {/* Quantity */}
            <Field>
              <FieldLabel>How many?</FieldLabel>
              <FieldContent>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={() => setCount((c) => Math.max(1, c - 1))}
                    disabled={count <= 1}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={count}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v >= 1) setCount(Math.min(v, 500));
                    }}
                    className="text-center tabular-nums"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={() => setCount((c) => Math.min(500, c + 1))}
                    disabled={count >= 500}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                <FieldDescription>
                  Tracking codes are assigned automatically.
                </FieldDescription>
              </FieldContent>
            </Field>

            {/* Location */}
            {locations.length > 0 && (
              <Field>
                <FieldLabel>Location</FieldLabel>
                <FieldContent>
                  <Select
                    value={locationId || "none"}
                    onValueChange={(v) => setLocationId(v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
            )}

            {/* Custom Attributes */}
            {attributeDefs.length > 0 && (
              <div className="space-y-4">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Properties
                </p>
                {attributeDefs.map((def) => (
                  <AttributeField
                    key={def.id}
                    def={def}
                    value={attrValues[def.attrKey] ?? ""}
                    onChange={(val) =>
                      setAttrValues((prev) => ({ ...prev, [def.attrKey]: val }))
                    }
                  />
                ))}
              </div>
            )}

            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={batchCreate.isPending || !lotTypeId}
            >
              {batchCreate.isPending ? (
                "Creating..."
              ) : (
                <>
                  <Package className="mr-2 size-4" />
                  Create {count} {count === 1 ? "lot" : "lots"}
                </>
              )}
            </Button>
          </FieldGroup>
        </form>
      </div>
    </div>
  );
}

type AttributeDef = {
  id: string;
  attrKey: string;
  dataType: string;
  isRequired: boolean;
  unit: string | null;
  options: unknown;
  defaultValue: string | null;
};

function AttributeField({
  def,
  value,
  onChange,
}: {
  def: AttributeDef;
  value: string;
  onChange: (val: string) => void;
}) {
  const label = formatAttrLabel(def.attrKey);
  const suffix = def.unit ? ` (${def.unit})` : "";

  if (def.dataType === "boolean") {
    return (
      <Field orientation="horizontal">
        <FieldLabel className="flex-1">
          {label}
          {def.isRequired && <span className="text-destructive">*</span>}
        </FieldLabel>
        <Checkbox
          checked={value === "true"}
          onCheckedChange={(checked: boolean) =>
            onChange(checked ? "true" : "false")
          }
        />
      </Field>
    );
  }

  if (def.dataType === "select" && Array.isArray(def.options)) {
    return (
      <Field>
        <FieldLabel>
          {label}
          {suffix}
          {def.isRequired && <span className="text-destructive ml-0.5">*</span>}
        </FieldLabel>
        <FieldContent>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {(def.options as string[]).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldContent>
      </Field>
    );
  }

  return (
    <Field>
      <FieldLabel>
        {label}
        {suffix}
        {def.isRequired && <span className="text-destructive ml-0.5">*</span>}
      </FieldLabel>
      <FieldContent>
        <Input
          type={
            def.dataType === "number"
              ? "number"
              : def.dataType === "date"
                ? "date"
                : "text"
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.defaultValue ?? undefined}
          required={def.isRequired}
          step={def.dataType === "number" ? "any" : undefined}
        />
      </FieldContent>
    </Field>
  );
}

function formatAttrLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (s) => s.toUpperCase());
}

export default function NewLotPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full flex-col">
          <header className="flex items-center gap-2 border-b px-4 py-2">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">New Lots</h1>
          </header>
          <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
            Loading...
          </div>
        </div>
      }
    >
      <NewLotPageInner />
    </Suspense>
  );
}
