"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Edit,
  Package,
  Plus,
  Search,
  Trash2,
  X,
  Zap,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { SidebarTrigger } from "~/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/react";
import { Icon } from "~/app/_components/IconPicker";
import { cn } from "~/lib/utils";

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

export default function ItemTypeDetailPage() {
  const params = useParams<{ org: string; typeId: string }>();
  const typeId = params.typeId;

  const { data: typeData, isLoading: typeLoading } =
    api.itemType.getById.useQuery({ id: typeId });

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [variantFilter, setVariantFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkVariantOpen, setBulkVariantOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState("");
  const [bulkNewVariant, setBulkNewVariant] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createCount, setCreateCount] = useState("10");
  const [createVariant, setCreateVariant] = useState<string>("none");
  const [createStatus, setCreateStatus] = useState<string>("");

  const [reportOpen, setReportOpen] = useState(false);
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

  const utils = api.useUtils();

  const { data: locations = [] } = api.location.list.useQuery();

  const { data: items = [], isLoading: itemsLoading } =
    api.item.listByType.useQuery({
      itemTypeId: typeId,
      status: statusFilter === "all" ? undefined : statusFilter,
      variantId: variantFilter === "all" ? undefined : variantFilter,
      search: search.trim() || undefined,
    });

  const { data: statusData } = api.item.statusCountsByType.useQuery({
    itemTypeId: typeId,
  });

  const bulkUpdateStatus = api.item.bulkUpdateStatus.useMutation({
    onSuccess: () => {
      void utils.item.listByType.invalidate();
      void utils.item.statusCountsByType.invalidate();
      setSelected(new Set());
      setBulkStatusOpen(false);
      setBulkNewStatus("");
    },
  });

  const bulkSetVariant = api.item.bulkSetVariant.useMutation({
    onSuccess: () => {
      void utils.item.listByType.invalidate();
      void utils.item.statusCountsByType.invalidate();
      void utils.itemType.inventoryOverview.invalidate();
      setSelected(new Set());
      setBulkVariantOpen(false);
      setBulkNewVariant("");
    },
  });

  const bulkDelete = api.item.bulkDelete.useMutation({
    onSuccess: () => {
      void utils.item.listByType.invalidate();
      void utils.item.statusCountsByType.invalidate();
      setSelected(new Set());
      setBulkDeleteOpen(false);
    },
  });

  const batchCreate = api.item.batchCreate.useMutation({
    onSuccess: () => {
      void utils.item.listByType.invalidate();
      void utils.item.statusCountsByType.invalidate();
      void utils.itemType.getById.invalidate({ id: typeId });
      setCreateOpen(false);
      setCreateCount("10");
      setCreateVariant("none");
      setCreateStatus("");
    },
  });

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
    reportOpen && reportGroupBy.length > 0 && reportMetrics.length > 0;
  const { data: reportData, isLoading: reportLoading } =
    api.item.aggregate.useQuery(
      {
        itemTypeId: typeId,
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

  const it = typeData?.itemType;
  const statuses = typeData?.statuses ?? [];
  const variants = typeData?.variants ?? [];
  const attrDefs = typeData?.attributeDefinitions ?? [];

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
      { value: "quantity", label: "Quantity" },
    ];
    for (const d of attrDefs) {
      opts.push({
        value: `attr:${d.attrKey}`,
        label: `${d.attrKey}${d.unit ? ` (${d.unit})` : ""}`,
      });
    }
    return opts;
  }, [attrDefs]);

  const statusMap = useMemo(() => {
    const m = new Map<
      string,
      {
        name: string;
        color: string | null;
        isInitial: boolean;
        isTerminal: boolean;
      }
    >();
    for (const s of statuses) {
      m.set(s.slug, {
        name: s.name,
        color: s.color,
        isInitial: s.isInitial,
        isTerminal: s.isTerminal,
      });
    }
    return m;
  }, [statuses]);

  const totalItems = useMemo(
    () => (statusData?.counts ?? []).reduce((sum, r) => sum + r.total, 0),
    [statusData],
  );

  const statusInsights = useMemo(() => {
    if (!statusData) return { initial: 0, active: 0, terminal: 0 };
    let initial = 0;
    let active = 0;
    let terminal = 0;
    for (const row of statusData.counts) {
      const def = statusMap.get(row.status);
      if (def?.isInitial) initial += row.total;
      else if (def?.isTerminal) terminal += row.total;
      else active += row.total;
    }
    return { initial, active, terminal };
  }, [statusData, statusMap]);

  const allIds = items.map((i) => i.id);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id));

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(allIds));
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkStatusChange = () => {
    if (!bulkNewStatus || selected.size === 0) return;
    bulkUpdateStatus.mutate({
      itemIds: Array.from(selected),
      status: bulkNewStatus,
    });
  };

  const handleBulkSetVariant = () => {
    if (selected.size === 0 || !bulkNewVariant) return;
    bulkSetVariant.mutate({
      itemIds: Array.from(selected),
      variantId: bulkNewVariant === "none" ? null : bulkNewVariant,
    });
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    bulkDelete.mutate({ itemIds: Array.from(selected) });
  };

  const handleBatchCreate = () => {
    const cnt = parseInt(createCount, 10);
    if (!cnt || cnt < 1) return;

    const initialStatus = statuses.find((s) => s.isInitial);

    batchCreate.mutate({
      itemTypeId: typeId,
      useSequence: true,
      count: cnt,
      variantId: createVariant === "none" ? null : createVariant,
      status: createStatus || initialStatus?.slug || "created",
    });
  };

  if (typeLoading) {
    return (
      <div className="flex min-h-full flex-col">
        <header className="flex items-center gap-2 border-b px-4 py-2">
          <SidebarTrigger />
          <div className="bg-muted h-5 w-32 animate-pulse rounded" />
        </header>
        <div className="text-muted-foreground px-6 py-12 text-center text-sm">
          Loading...
        </div>
      </div>
    );
  }

  if (!it) {
    return (
      <div className="flex min-h-full flex-col">
        <header className="flex items-center gap-2 border-b px-4 py-2">
          <SidebarTrigger />
          <span className="text-muted-foreground text-sm">
            Item type not found
          </span>
        </header>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/${params.org}/inventory`}>Inventory</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-2">
                  <Icon icon={it.icon} className="size-3.5" />
                  {it.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {it.category && (
            <Badge variant="secondary" className="text-xs">
              {it.category}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${params.org}/inventory/type/${typeId}/edit`}>
              <Edit className="mr-1 size-3.5" /> Edit type
            </Link>
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 size-3.5" /> Create items
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-6">
          {/* Description */}
          {it.description && (
            <p className="text-muted-foreground text-sm">{it.description}</p>
          )}

          {/* Insight cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Total Items
                </CardTitle>
                <Package className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalItems}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Prepared
                </CardTitle>
                <Clock className="size-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statusInsights.initial}
                </div>
                <p className="text-muted-foreground text-xs">
                  {totalItems > 0
                    ? `${Math.round((statusInsights.initial / totalItems) * 100)}% of total`
                    : "No items yet"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Active
                </CardTitle>
                <Zap className="size-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statusInsights.active}
                </div>
                <p className="text-muted-foreground text-xs">
                  {totalItems > 0
                    ? `${Math.round((statusInsights.active / totalItems) * 100)}% of total`
                    : "No items yet"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Completed
                </CardTitle>
                <CheckCircle2 className="size-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statusInsights.terminal}
                </div>
                <p className="text-muted-foreground text-xs">
                  {totalItems > 0
                    ? `${Math.round((statusInsights.terminal / totalItems) * 100)}% of total`
                    : "No items yet"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Report */}
          <Card>
            <CardHeader className="pb-3">
              <button
                type="button"
                className="flex w-full items-center justify-between"
                onClick={() => setReportOpen((prev) => !prev)}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="text-muted-foreground size-4" />
                  <CardTitle className="text-sm font-medium">
                    Quick Report
                  </CardTitle>
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
                                setReportGroupBy((prev) => [
                                  ...prev,
                                  opt.value,
                                ]);
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
                      <span className="text-muted-foreground text-xs">of</span>
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
                    </div>
                  </div>
                </div>

                {/* Filter to... */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Filter to</Label>
                  <div className="flex flex-wrap items-start gap-3">
                    {/* Status */}
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
                            <SelectItem key={s.slug} value={s.slug}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Variant */}
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

                    {/* Location */}
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

                    {/* Active attribute filters */}
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
                          const preset =
                            reportDatePresets[d.attrKey] ?? "all";
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
                                    <SelectItem
                                      key={p.value}
                                      value={p.value}
                                    >
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
                                    value={
                                      reportDateCustomFrom[d.attrKey] ?? ""
                                    }
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
                                    value={
                                      reportDateCustomTo[d.attrKey] ?? ""
                                    }
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

                        if (
                          d.dataType === "select" &&
                          Array.isArray(d.options)
                        ) {
                          return (
                            <div key={d.id} className="space-y-1">
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground text-[10px]">
                                  {d.attrKey}
                                </span>
                                {removeBtn}
                              </div>
                              <Select
                                value={
                                  reportAttrFilters[d.attrKey] ?? "all"
                                }
                                onValueChange={(val) =>
                                  setReportAttrFilters((prev) => ({
                                    ...prev,
                                    [d.attrKey]:
                                      val === "all" ? "" : val,
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
                                value={
                                  reportAttrFilters[d.attrKey] ?? "all"
                                }
                                onValueChange={(val) =>
                                  setReportAttrFilters((prev) => ({
                                    ...prev,
                                    [d.attrKey]:
                                      val === "all" ? "" : val,
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

                    {/* + Add filter */}
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
                              setActiveFilterKeys(
                                (prev) => new Set(prev).add(key),
                              );
                            }}
                          >
                            <SelectTrigger className="h-7 w-auto gap-1 border-dashed text-xs">
                              <Plus className="size-3" />
                              <span>Add filter</span>
                            </SelectTrigger>
                            <SelectContent position="popper" className="max-h-60">
                              {available.map((d) => (
                                <SelectItem
                                  key={d.attrKey}
                                  value={d.attrKey}
                                >
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
                    Select at least one &ldquo;Group by&rdquo; field to generate
                    a report.
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
                              {col.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.rows.map((row, i) => (
                          <TableRow key={i}>
                            {reportData.columns.map((col) => (
                              <TableCell
                                key={col.key}
                                className="text-xs tabular-nums"
                              >
                                {row[col.key] ?? "—"}
                              </TableCell>
                            ))}
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
              </CardContent>
            )}
          </Card>

          {/* Items table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-sm font-medium">Items</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                    <Input
                      placeholder="Search by code..."
                      className="h-8 w-48 pl-8 text-sm"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  {variants.length > 0 && (
                    <Select
                      value={variantFilter}
                      onValueChange={setVariantFilter}
                    >
                      <SelectTrigger className="h-8 w-36 text-xs">
                        <SelectValue placeholder="All variants" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All variants</SelectItem>
                        {variants.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {statuses.map((s) => (
                        <SelectItem key={s.slug} value={s.slug}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bulk actions bar */}
              {selected.size > 0 && (
                <div className="bg-muted/50 flex items-center gap-2 rounded-lg border px-3 py-2">
                  <span className="text-sm font-medium">
                    {selected.size} selected
                  </span>
                  <div className="border-border mx-1 h-4 border-l" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setBulkStatusOpen(true)}
                  >
                    Change status
                  </Button>
                  {variants.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setBulkVariantOpen(true)}
                    >
                      Set variant
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 h-7 text-xs"
                    onClick={() => setBulkDeleteOpen(true)}
                  >
                    <Trash2 className="mr-1 size-3" />
                    Delete
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelected(new Set())}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {itemsLoading ? (
                <div className="text-muted-foreground px-6 py-8 text-center text-sm">
                  Loading items...
                </div>
              ) : items.length === 0 ? (
                <div className="text-muted-foreground px-6 py-8 text-center text-sm">
                  No items found
                  {statusFilter !== "all" || variantFilter !== "all" || search
                    ? " matching your filters."
                    : " for this item type yet."}
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 pl-4">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={toggleAll}
                          />
                        </TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Status</TableHead>
                        {variants.length > 0 && <TableHead>Variant</TableHead>}
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((row) => {
                        const sd = statusMap.get(row.status);
                        return (
                          <TableRow
                            key={row.id}
                            data-state={
                              selected.has(row.id) ? "selected" : undefined
                            }
                          >
                            <TableCell className="pl-4">
                              <Checkbox
                                checked={selected.has(row.id)}
                                onCheckedChange={() => toggleRow(row.id)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-sm font-medium">
                              <Link
                                href={`/${params.org}/inventory/item/${encodeURIComponent(row.code)}`}
                                className="hover:text-primary underline-offset-4 hover:underline"
                              >
                                {row.code}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Circle
                                  className="size-2"
                                  fill={sd?.color ?? "currentColor"}
                                  stroke={sd?.color ?? "currentColor"}
                                />
                                <span className="text-sm">
                                  {sd?.name ?? row.status}
                                </span>
                              </div>
                            </TableCell>
                            {variants.length > 0 && (
                              <TableCell>
                                {row.variantName ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {row.variantName}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    —
                                  </span>
                                )}
                              </TableCell>
                            )}
                            <TableCell className="text-sm">
                              {row.locationName ?? (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {row.quantity} {row.quantityUom}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {new Date(row.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bulk status change dialog */}
      <Dialog open={bulkStatusOpen} onOpenChange={setBulkStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change status</DialogTitle>
            <DialogDescription>
              Update the status of {selected.size} selected item
              {selected.size > 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <Select value={bulkNewStatus} onValueChange={setBulkNewStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select new status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s.slug} value={s.slug}>
                  <div className="flex items-center gap-2">
                    <Circle
                      className="size-2"
                      fill={s.color ?? "currentColor"}
                      stroke={s.color ?? "currentColor"}
                    />
                    {s.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkStatusChange}
              disabled={!bulkNewStatus || bulkUpdateStatus.isPending}
            >
              {bulkUpdateStatus.isPending ? "Updating..." : "Update status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirmation dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete items</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selected.size} item
              {selected.size > 1 ? "s" : ""}? This action cannot be undone. All
              related events, identifiers, and lineage links will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDelete.isPending}
            >
              {bulkDelete.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk set variant dialog */}
      <Dialog open={bulkVariantOpen} onOpenChange={setBulkVariantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set variant</DialogTitle>
            <DialogDescription>
              Assign a variant to {selected.size} selected item
              {selected.size > 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <Select value={bulkNewVariant} onValueChange={setBulkNewVariant}>
            <SelectTrigger>
              <SelectValue placeholder="Select variant" />
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkVariantOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkSetVariant}
              disabled={!bulkNewVariant || bulkSetVariant.isPending}
            >
              {bulkSetVariant.isPending ? "Updating..." : "Set variant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create items dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create items</DialogTitle>
            <DialogDescription>
              Batch-create new {it.name} items using the auto-sequence
              {it.codePrefix ? ` (${it.codePrefix}-XXXXX)` : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-count">How many?</Label>
              <Input
                id="create-count"
                type="number"
                min={1}
                max={1000}
                value={createCount}
                onChange={(e) => setCreateCount(e.target.value)}
                placeholder="10"
              />
              <p className="text-muted-foreground text-xs">
                Max 1,000 per batch.
              </p>
            </div>

            {variants.length > 0 && (
              <div className="space-y-2">
                <Label>Variant</Label>
                <Select value={createVariant} onValueChange={setCreateVariant}>
                  <SelectTrigger>
                    <SelectValue placeholder="No variant" />
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

            {statuses.length > 0 && (
              <div className="space-y-2">
                <Label>Initial status</Label>
                <Select
                  value={
                    createStatus ||
                    statuses.find((s) => s.isInitial)?.slug ||
                    ""
                  }
                  onValueChange={setCreateStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.slug} value={s.slug}>
                        <div className="flex items-center gap-2">
                          <Circle
                            className="size-2"
                            fill={s.color ?? "currentColor"}
                            stroke={s.color ?? "currentColor"}
                          />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!it.codePrefix && (
              <p className="text-destructive text-xs">
                This item type has no code prefix configured. Set one via
                &ldquo;Edit type&rdquo; before creating items with
                auto-sequencing.
              </p>
            )}

            {batchCreate.error && (
              <p className="text-destructive text-xs">
                {batchCreate.error.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBatchCreate}
              disabled={
                batchCreate.isPending ||
                !it.codePrefix ||
                !createCount ||
                parseInt(createCount, 10) < 1
              }
            >
              {batchCreate.isPending
                ? "Creating..."
                : `Create ${parseInt(createCount, 10) || 0} items`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
