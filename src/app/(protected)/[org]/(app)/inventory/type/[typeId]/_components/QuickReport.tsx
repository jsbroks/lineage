"use client";

import { useCallback, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  Loader2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import type { AttrDef, LocationDef, StatusDef, VariantDef } from "./types";

function formatCentsCurrency(cents: number, currency: string | null): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency ?? "USD",
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency ?? "$"}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

const DATE_PRESETS = [
  { label: "All time", value: "all" },
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "This year", value: "ytd" },
  { label: "Custom range", value: "custom" },
] as const;

function datePresetToIso(preset: string): string | null {
  const now = new Date();
  switch (preset) {
    case "all":
      return null;
    case "today": {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return d.toISOString();
    }
    case "7d":
      return new Date(now.getTime() - 7 * 86_400_000).toISOString();
    case "30d":
      return new Date(now.getTime() - 30 * 86_400_000).toISOString();
    case "90d":
      return new Date(now.getTime() - 90 * 86_400_000).toISOString();
    case "ytd":
      return new Date(now.getFullYear(), 0, 1).toISOString();
    default:
      return null;
  }
}

interface QuickReportProps {
  typeId: string;
  quantityName: string | null;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  variantFilter: string;
  setVariantFilter: (value: string) => void;
  statuses: StatusDef[];
  variants: VariantDef[];
  locations: LocationDef[];
  attrDefs: AttrDef[];
}

export const QuickReport: React.FC<QuickReportProps> = ({
  typeId,
  quantityName,
  statusFilter,
  setStatusFilter,
  variantFilter,
  setVariantFilter,
  statuses,
  variants,
  locations,
  attrDefs,
}) => {
  const [reportOpen, setReportOpen] = useState(false);
  const [mode, setMode] = useState<"manual" | "ai">("manual");

  // AI mode state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTitle, setAiTitle] = useState<string | null>(null);
  const [aiParams, setAiParams] = useState<{
    groupBy: string[];
    metrics: { field: string; op: "count" | "sum" | "avg" | "min" | "max" }[];
    filters?: {
      status?: string;
      variantId?: string;
      locationId?: string;
      attrFilters?: { key: string; op: "eq" | "gte" | "lte"; value: string }[];
    };
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAiGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setAiParams(null);
    setAiTitle(null);

    try {
      const res = await fetch("/api/ai/report-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lotTypeId: typeId, prompt: aiPrompt.trim() }),
      });
      if (!res.ok) throw new Error("Failed to generate report");
      const data = await res.json();
      setAiParams({
        groupBy: data.groupBy,
        metrics: data.metrics,
        filters: data.filters,
      });
      setAiTitle(data.title ?? null);
    } catch {
      setAiError("Something went wrong. Try rephrasing your request.");
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, typeId]);

  // Manual mode state
  const [reportGroupBy, setReportGroupBy] = useState<string[]>([]);
  const [reportMetrics, setReportMetrics] = useState<
    { field: string; op: "count" | "sum" | "avg" | "min" | "max" }[]
  >([{ field: "quantity", op: "count" }]);
  const [reportLocationId, setReportLocationId] = useState<string>("all");
  const [reportAttrFilters, setReportAttrFilters] = useState<
    Record<string, string>
  >({});
  const [reportDatePresets, setReportDatePresets] = useState<
    Record<string, string>
  >({});
  const [reportDateCustomFrom, setReportDateCustomFrom] = useState<
    Record<string, string>
  >({});
  const [reportDateCustomTo, setReportDateCustomTo] = useState<
    Record<string, string>
  >({});
  const [activeFilterKeys, setActiveFilterKeys] = useState<Set<string>>(
    new Set(),
  );

  const computedAttrFilters = useMemo(() => {
    const filters: { key: string; op: "eq" | "gte" | "lte"; value: string }[] =
      [];
    for (const [key, value] of Object.entries(reportAttrFilters)) {
      if (value) filters.push({ key, op: "eq", value });
    }
    for (const [key, preset] of Object.entries(reportDatePresets)) {
      if (preset === "custom") {
        const from = reportDateCustomFrom[key];
        const to = reportDateCustomTo[key];
        if (from)
          filters.push({ key, op: "gte", value: new Date(from).toISOString() });
        if (to) {
          const endOfDay = new Date(to);
          endOfDay.setHours(23, 59, 59, 999);
          filters.push({ key, op: "lte", value: endOfDay.toISOString() });
        }
      } else {
        const iso = datePresetToIso(preset);
        if (iso) filters.push({ key, op: "gte", value: iso });
      }
    }
    return filters;
  }, [
    reportAttrFilters,
    reportDatePresets,
    reportDateCustomFrom,
    reportDateCustomTo,
  ]);

  const reportEnabled =
    reportOpen &&
    mode === "manual" &&
    reportGroupBy.length > 0 &&
    reportMetrics.length > 0;

  const { data: reportData, isLoading: reportLoading } =
    api.lot.aggregate.useQuery(
      {
        lotTypeId: typeId,
        groupBy: reportGroupBy,
        metrics: reportMetrics,
        filters: {
          status: statusFilter === "all" ? undefined : statusFilter,
          variantId: variantFilter === "all" ? undefined : variantFilter,
          locationId: reportLocationId === "all" ? undefined : reportLocationId,
          attrFilters:
            computedAttrFilters.length > 0 ? computedAttrFilters : undefined,
        },
      },
      { enabled: reportEnabled },
    );

  const aiReportEnabled =
    reportOpen &&
    mode === "ai" &&
    aiParams !== null &&
    aiParams.groupBy.length > 0;

  const { data: aiReportData, isLoading: aiReportLoading } =
    api.lot.aggregate.useQuery(
      {
        lotTypeId: typeId,
        groupBy: aiParams?.groupBy ?? [],
        metrics: (aiParams?.metrics ?? []) as {
          field: string;
          op: "count" | "sum" | "avg" | "min" | "max";
        }[],
        filters: {
          status: aiParams?.filters?.status,
          variantId: aiParams?.filters?.variantId,
          locationId: aiParams?.filters?.locationId,
          attrFilters: aiParams?.filters?.attrFilters,
        },
      },
      { enabled: aiReportEnabled },
    );

  const groupByOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: "status", label: "Status" },
      { value: "variant", label: "Variant" },
      { value: "location", label: "Location" },
    ];
    for (const d of attrDefs) {
      opts.push({ value: `attr:${d.attrKey}`, label: d.attrKey });
    }
    return opts;
  }, [attrDefs]);

  const metricFieldOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: "quantity", label: quantityName || "Quantity" },
      { value: "value", label: "Value" },
    ];
    for (const d of attrDefs) {
      opts.push({
        value: `attr:${d.attrKey}`,
        label: `${d.attrKey}${d.unit ? ` (${d.unit})` : ""}`,
      });
    }
    return opts;
  }, [attrDefs]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          type="button"
          className="flex w-full items-center justify-between"
          onClick={() => setReportOpen((prev) => !prev)}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="text-muted-foreground size-4" />
            <CardTitle className="text-sm font-medium">Quick Report</CardTitle>
          </div>
          <ChevronDown
            className={cn(
              "text-muted-foreground size-4 transition-transform",
              reportOpen && "rotate-180",
            )}
          />
        </button>
      </CardHeader>
      {reportOpen && (
        <CardContent className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-1 rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={cn(
                "flex-1 rounded-sm px-3 py-1 text-xs font-medium transition-colors",
                mode === "manual"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => setMode("ai")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-1 text-xs font-medium transition-colors",
                mode === "ai"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Sparkles className="size-3" />
              Describe
            </button>
          </div>

          {mode === "ai" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  What do you want to see?
                </Label>
                <Textarea
                  placeholder="e.g. Count of lots by status, or average spawn rate grouped by variant..."
                  className="min-h-[60px] text-xs"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleAiGenerate();
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  disabled={aiLoading || !aiPrompt.trim()}
                  onClick={() => void handleAiGenerate()}
                >
                  {aiLoading ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Sparkles className="size-3" />
                  )}
                  {aiLoading ? "Generating..." : "Generate Report"}
                </Button>
              </div>

              {aiError && <p className="text-destructive text-xs">{aiError}</p>}

              {aiTitle && !aiLoading && (
                <p className="text-foreground text-xs font-medium">{aiTitle}</p>
              )}

              {aiReportLoading && (
                <p className="text-muted-foreground text-xs">
                  Loading results...
                </p>
              )}

              {aiReportData && aiReportData.rows.length > 0 && (
                <div className="overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {aiReportData.columns.map((col) => (
                          <TableHead key={col.key} className="text-xs">
                            {quantityName
                              ? col.label.replace(
                                  "quantity",
                                  quantityName.toLowerCase(),
                                )
                              : col.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aiReportData.rows.map((row, i) => (
                        <TableRow key={i}>
                          {aiReportData.columns.map((col) => {
                            const raw = row[col.key];
                            let display: React.ReactNode = raw ?? "—";
                            if (
                              "isCurrency" in col &&
                              col.isCurrency &&
                              raw != null
                            ) {
                              display = formatCentsCurrency(
                                Number(raw),
                                aiReportData.valueCurrency ?? null,
                              );
                            }
                            return (
                              <TableCell
                                key={col.key}
                                className="text-xs tabular-nums"
                              >
                                {display}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {aiReportData &&
                aiReportData.rows.length === 0 &&
                !aiReportLoading && (
                  <p className="text-muted-foreground text-xs">
                    No data matches the generated query.
                  </p>
                )}
            </div>
          )}

          {mode === "manual" && (
            <>
              <div className="flex flex-wrap items-end gap-3">
                {/* Group by */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Group rows by</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {groupByOptions.map((opt) => {
                      const active = reportGroupBy.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            if (active) {
                              setReportGroupBy((prev) =>
                                prev.filter((v) => v !== opt.value),
                              );
                            } else if (reportGroupBy.length < 2) {
                              setReportGroupBy((prev) => [...prev, opt.value]);
                            }
                          }}
                          className={cn(
                            "rounded-md border px-2.5 py-1 text-xs transition-colors",
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "hover:bg-muted",
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Metrics */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Show me the</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={reportMetrics[0]?.op ?? "count"}
                      onValueChange={(val) => {
                        const op = val as
                          | "count"
                          | "sum"
                          | "avg"
                          | "min"
                          | "max";
                        setReportMetrics((prev) =>
                          prev.length > 0
                            ? [{ ...prev[0]!, op }]
                            : [{ field: "quantity", op }],
                        );
                      }}
                    >
                      <SelectTrigger className="h-8 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="sum">Sum</SelectItem>
                        <SelectItem value="avg">Average</SelectItem>
                        <SelectItem value="min">Min</SelectItem>
                        <SelectItem value="max">Max</SelectItem>
                      </SelectContent>
                    </Select>
                    {(reportMetrics[0]?.op ?? "count") !== "count" && (
                      <>
                        <span className="text-muted-foreground text-xs">
                          of
                        </span>
                        <Select
                          value={reportMetrics[0]?.field ?? "quantity"}
                          onValueChange={(val) => {
                            setReportMetrics((prev) =>
                              prev.length > 0
                                ? [{ ...prev[0]!, field: val }]
                                : [{ field: val, op: "count" }],
                            );
                          }}
                        >
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {metricFieldOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Filter to */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Filter to</Label>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px]">
                      Status
                    </span>
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger className="h-7 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {statuses.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {variants.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-[10px]">
                        Variant
                      </span>
                      <Select
                        value={variantFilter}
                        onValueChange={setVariantFilter}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {variants.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {locations.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-[10px]">
                        Location
                      </span>
                      <Select
                        value={reportLocationId}
                        onValueChange={setReportLocationId}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {locations.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {attrDefs
                    .filter((d) => activeFilterKeys.has(d.attrKey))
                    .map((d) => {
                      const removeFilter = () => {
                        setActiveFilterKeys((prev) => {
                          const next = new Set(prev);
                          next.delete(d.attrKey);
                          return next;
                        });
                        setReportAttrFilters((prev) => {
                          const { [d.attrKey]: _, ...rest } = prev;
                          return rest;
                        });
                        setReportDatePresets((prev) => {
                          const { [d.attrKey]: _, ...rest } = prev;
                          return rest;
                        });
                        setReportDateCustomFrom((prev) => {
                          const { [d.attrKey]: _, ...rest } = prev;
                          return rest;
                        });
                        setReportDateCustomTo((prev) => {
                          const { [d.attrKey]: _, ...rest } = prev;
                          return rest;
                        });
                      };

                      if (d.dataType === "number") return null;

                      const removeBtn = (
                        <button
                          type="button"
                          onClick={removeFilter}
                          className="text-muted-foreground hover:text-foreground rounded-sm p-0.5"
                        >
                          <X className="size-3" />
                        </button>
                      );

                      if (d.dataType === "date") {
                        const preset = reportDatePresets[d.attrKey] ?? "all";
                        return (
                          <div key={d.id} className="space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground text-[10px]">
                                {d.attrKey}
                              </span>
                              {removeBtn}
                            </div>
                            <Select
                              value={preset}
                              onValueChange={(val) =>
                                setReportDatePresets((prev) => ({
                                  ...prev,
                                  [d.attrKey]: val,
                                }))
                              }
                            >
                              <SelectTrigger className="h-7 w-32 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DATE_PRESETS.map((p) => (
                                  <SelectItem key={p.value} value={p.value}>
                                    {p.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {preset === "custom" && (
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="date"
                                  className="h-7 w-[120px] text-xs"
                                  value={reportDateCustomFrom[d.attrKey] ?? ""}
                                  onChange={(e) =>
                                    setReportDateCustomFrom((prev) => ({
                                      ...prev,
                                      [d.attrKey]: e.target.value,
                                    }))
                                  }
                                />
                                <span className="text-muted-foreground text-[10px]">
                                  to
                                </span>
                                <Input
                                  type="date"
                                  className="h-7 w-[120px] text-xs"
                                  value={reportDateCustomTo[d.attrKey] ?? ""}
                                  onChange={(e) =>
                                    setReportDateCustomTo((prev) => ({
                                      ...prev,
                                      [d.attrKey]: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                            )}
                          </div>
                        );
                      }

                      if (d.dataType === "select" && Array.isArray(d.options)) {
                        return (
                          <div key={d.id} className="space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground text-[10px]">
                                {d.attrKey}
                              </span>
                              {removeBtn}
                            </div>
                            <Select
                              value={reportAttrFilters[d.attrKey] ?? "all"}
                              onValueChange={(val) =>
                                setReportAttrFilters((prev) => ({
                                  ...prev,
                                  [d.attrKey]: val === "all" ? "" : val,
                                }))
                              }
                            >
                              <SelectTrigger className="h-7 w-32 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {(d.options as string[]).map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      }

                      if (d.dataType === "boolean") {
                        return (
                          <div key={d.id} className="space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground text-[10px]">
                                {d.attrKey}
                              </span>
                              {removeBtn}
                            </div>
                            <Select
                              value={reportAttrFilters[d.attrKey] ?? "all"}
                              onValueChange={(val) =>
                                setReportAttrFilters((prev) => ({
                                  ...prev,
                                  [d.attrKey]: val === "all" ? "" : val,
                                }))
                              }
                            >
                              <SelectTrigger className="h-7 w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="true">Yes</SelectItem>
                                <SelectItem value="false">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      }

                      return (
                        <div key={d.id} className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground text-[10px]">
                              {d.attrKey}
                            </span>
                            {removeBtn}
                          </div>
                          <Input
                            className="h-7 w-32 text-xs"
                            placeholder="Any"
                            value={reportAttrFilters[d.attrKey] ?? ""}
                            onChange={(e) =>
                              setReportAttrFilters((prev) => ({
                                ...prev,
                                [d.attrKey]: e.target.value,
                              }))
                            }
                          />
                        </div>
                      );
                    })}

                  {(() => {
                    const available = attrDefs.filter(
                      (d) =>
                        d.dataType !== "number" &&
                        !activeFilterKeys.has(d.attrKey),
                    );
                    if (available.length === 0) return null;
                    return (
                      <div className="space-y-1">
                        <span className="text-[10px]">&nbsp;</span>
                        <Select
                          key={[...activeFilterKeys].sort().join(",")}
                          onValueChange={(key) => {
                            setActiveFilterKeys((prev) =>
                              new Set(prev).add(key),
                            );
                          }}
                        >
                          <SelectTrigger className="h-7 w-auto gap-1 border-dashed text-xs">
                            <Plus className="size-3" />
                            <span>Add filter</span>
                          </SelectTrigger>
                          <SelectContent position="popper" className="max-h-60">
                            {available.map((d) => (
                              <SelectItem key={d.attrKey} value={d.attrKey}>
                                {d.attrKey}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Results table */}
              {reportGroupBy.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  Select at least one &ldquo;Group by&rdquo; field to generate a
                  report.
                </p>
              ) : reportLoading ? (
                <p className="text-muted-foreground text-xs">Loading...</p>
              ) : reportData && reportData.rows.length > 0 ? (
                <div className="overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {reportData.columns.map((col) => (
                          <TableHead key={col.key} className="text-xs">
                            {quantityName
                              ? col.label.replace(
                                  "quantity",
                                  quantityName.toLowerCase(),
                                )
                              : col.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.rows.map((row, i) => (
                        <TableRow key={i}>
                          {reportData.columns.map((col) => {
                            const raw = row[col.key];
                            let display: React.ReactNode = raw ?? "—";
                            if (
                              "isCurrency" in col &&
                              col.isCurrency &&
                              raw != null
                            ) {
                              display = formatCentsCurrency(
                                Number(raw),
                                reportData.valueCurrency ?? null,
                              );
                            }
                            return (
                              <TableCell
                                key={col.key}
                                className="text-xs tabular-nums"
                              >
                                {display}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : reportData ? (
                <p className="text-muted-foreground text-xs">
                  No data matches the current filters.
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
};
