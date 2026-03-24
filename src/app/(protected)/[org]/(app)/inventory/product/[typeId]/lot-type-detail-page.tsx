"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Edit, MoreHorizontal, Plus, Printer } from "lucide-react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { api } from "~/trpc/react";
import { Icon } from "~/app/_components/IconPicker";

import { AiDailySummary } from "./_components/AiDailySummary";
import { StatusFlowDiagram } from "./_components/StatusFlowDiagram";
import { QuickReport } from "./_components/QuickReport";
import { LotsTable } from "./_components/LotsTable";
import { BulkStatusDialog } from "./_components/BulkStatusDialog";
import { BulkDeleteDialog } from "./_components/BulkDeleteDialog";
import { BulkVariantDialog } from "./_components/BulkVariantDialog";
import { BulkAttributeDialog } from "./_components/BulkAttributeDialog";
import { CreateLotsDialog } from "./_components/CreateLotsDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";

export default function LotTypeDetailPage() {
  const params = useParams<{ org: string; typeId: string }>();
  const typeId = params.typeId;

  const { data: typeData, isLoading: typeLoading } =
    api.lotType.getById.useQuery({ id: typeId });

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [variantFilter, setVariantFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkVariantOpen, setBulkVariantOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkAttributeOpen, setBulkAttributeOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const utils = api.useUtils();

  const { data: locations = [] } = api.location.list.useQuery();

  const { data: lots = [], isLoading: lotsLoading } =
    api.lot.listByType.useQuery({
      lotTypeId: typeId,
      status: statusFilter === "all" ? undefined : statusFilter,
      variantId: variantFilter === "all" ? undefined : variantFilter,
      search: search.trim() || undefined,
    });

  const { data: statusData } = api.lot.statusCountsByType.useQuery({
    lotTypeId: typeId,
  });

  const bulkUpdateStatus = api.lot.bulkUpdateStatus.useMutation({
    onSuccess: () => {
      void utils.lot.listByType.invalidate();
      void utils.lot.statusCountsByType.invalidate();
      setSelected(new Set());
      setBulkStatusOpen(false);
    },
  });

  const bulkSetVariant = api.lot.bulkSetVariant.useMutation({
    onSuccess: () => {
      void utils.lot.listByType.invalidate();
      void utils.lot.statusCountsByType.invalidate();
      void utils.lotType.inventoryOverview.invalidate();
      setSelected(new Set());
      setBulkVariantOpen(false);
    },
  });

  const bulkSetAttributes = api.lot.bulkSetAttributes.useMutation({
    onSuccess: () => {
      void utils.lot.listByType.invalidate();
      setSelected(new Set());
      setBulkAttributeOpen(false);
    },
  });

  const bulkDelete = api.lot.bulkDelete.useMutation({
    onSuccess: () => {
      void utils.lot.listByType.invalidate();
      void utils.lot.statusCountsByType.invalidate();
      setSelected(new Set());
      setBulkDeleteOpen(false);
    },
  });

  const batchCreate = api.lot.batchCreate.useMutation({
    onSuccess: () => {
      void utils.lot.listByType.invalidate();
      void utils.lot.statusCountsByType.invalidate();
      void utils.lotType.getById.invalidate({ id: typeId });
      setCreateOpen(false);
    },
  });

  const it = typeData?.lotType;
  const statuses = typeData?.statuses ?? [];
  const transitions = typeData?.transitions ?? [];
  const variants = typeData?.variants ?? [];
  const attrDefs = typeData?.attributeDefinitions ?? [];

  const statusMap = useMemo(() => {
    const m = new Map<
      string,
      { name: string; color: string | null; category: string }
    >();
    for (const s of statuses) {
      m.set(s.id, { name: s.name, color: s.color, category: s.category });
    }
    return m;
  }, [statuses]);

  const totalLots = useMemo(
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
      const cat = def?.category;
      if (cat === "unstarted") initial += row.total;
      else if (cat === "done" || cat === "canceled") terminal += row.total;
      else active += row.total;
    }
    return { initial, active, terminal };
  }, [statusData, statusMap]);

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
            Product not found
          </span>
        </header>
      </div>
    );
  }

  const inProgress = statusInsights.initial + statusInsights.active;

  return (
    <>
      {/* ── Header ── */}
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
          {it.categoryId && (
            <Badge variant="secondary" className="text-xs">
              {it.categoryId}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 size-3.5" /> Create lots
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="size-8 p-0">
                <span className="sr-only">More actions</span>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild>
                <Link href={`/${params.org}/inventory/product/${typeId}/edit`}>
                  <Edit className="mr-2 size-3.5" />
                  Edit product
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/${params.org}/inventory/print?typeId=${typeId}`}>
                  <Printer className="mr-2 size-3.5" />
                  Print labels
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Tabs className="p-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="purchasing">Purchasing</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── Tab content ── */}
      <div>
        <div className="mx-auto w-full max-w-xl space-y-8 px-6 py-8">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="it-name">Name</Label>
                <Input id="it-name" required placeholder="Fruiting Block" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="it-description">Description</Label>
              <Textarea
                id="it-description"
                placeholder="Optional description"
              />
            </div>
          </div>
          <Card>
            <CardHeader>General</CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <label>Category</label>
                <input
                  className="max-w-16 text-right outline-none"
                  required
                  placeholder="0.00"
                />
              </div>
              <Separator />
              <div className="flex justify-between">
                <label>Status</label>
                <input
                  className="max-w-16 text-right outline-none"
                  required
                  placeholder="0.00"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>Inventory</CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <label>Default stock Unit of Measurement (UOM)</label>
                <select className="max-w-48 text-right outline-none" required>
                  <option value="" disabled>
                    Set UoM
                  </option>
                  <option value="bags">Bags (bags)</option>
                  <option value="bbls">Barrels (bbls)</option>
                  <option value="cs">Cases (cs)</option>
                  <option value="cm">Centimeters (cm)</option>
                  <option value="ea">Each (ea)</option>
                  <option value="ft">Feet (ft)</option>
                  <option value="fl oz">Fluid Ounces (fl oz)</option>
                  <option value="gal">Gallons (gal)</option>
                  <option value="g">Grams (g)</option>
                  <option value="gross">Gross (gross)</option>
                  <option value="h">Hundred Count (h)</option>
                  <option value="in">Inches (in)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="L">Liters (L)</option>
                  <option value="m">Meters (m)</option>
                  <option value="µg">Micrograms (µg)</option>
                  <option value="µL">Microliters (µL)</option>
                  <option value="µM">Micromolar (µM)</option>
                  <option value="µmol">Micromoles (µmol)</option>
                  <option value="mg">Milligrams (mg)</option>
                  <option value="mL">Milliliters (mL)</option>
                  <option value="mm">Millimeters (mm)</option>
                  <option value="mM">Millimolar (mM)</option>
                  <option value="mmol">Millimoles (mmol)</option>
                  <option value="ng">Nanograms (ng)</option>
                  <option value="nL">Nanoliters (nL)</option>
                  <option value="nM">Nanomolar (nM)</option>
                  <option value="nmol">Nanomoles (nmol)</option>
                  <option value="oz">Ounces (oz)</option>
                  <option value="pairs">Pairs (pairs)</option>
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="lb">Pounds (lb)</option>
                  <option value="sets">Sets (sets)</option>
                  <option value="cm²">Square Centimeters (cm²)</option>
                  <option value="ft²">Square Feet (ft²)</option>
                  <option value="in²">Square Inches (in²)</option>
                  <option value="m²">Square Meters (m²)</option>
                  <option value="k">Thousand Count (k)</option>
                  <option value="ozt">Troy Ounces (ozt)</option>
                  <option value="yd">Yards (yd)</option>
                </select>
              </div>
              <Separator />
              <div className="flex justify-between">
                <label>Default location</label>
                <input
                  className="max-w-16 text-right outline-none"
                  required
                  placeholder="0.00"
                />
              </div>
              <Separator />
              <div className="flex justify-between">
                <label>Default Unit Price</label>
                <input
                  className="max-w-16 text-right outline-none"
                  required
                  placeholder="0.00"
                />
              </div>

              <Separator />
              <div className="flex justify-between">
                <label>Default Purchase Price</label>
                <input
                  className="max-w-16 text-right outline-none"
                  required
                  placeholder="0.00"
                />
              </div>

              <Separator />
              <div className="flex justify-between">
                <label>Minimum stock level</label>
                <input
                  className="max-w-16 text-right outline-none"
                  required
                  placeholder="0"
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <header className="text-muted-foreground text-sm uppercase">
              General
            </header>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="it-category">Category</Label>
                <Input id="it-category" placeholder="Select a category" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="it-qty-name">Quantity Name</Label>
                <Input id="it-qty-name" placeholder="Weight" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="it-uom">Default Unit</Label>
                <Input id="it-uom" required placeholder="each" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <header className="text-muted-foreground text-sm uppercase">
              Inventory
            </header>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="it-category">Category</Label>
                <Input id="it-category" placeholder="Select a category" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="it-qty-name">Quantity Name</Label>
                <Input id="it-qty-name" placeholder="Weight" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="it-uom">Default Unit</Label>
                <Input id="it-uom" required placeholder="each" />
              </div>
            </div>
          </div>
        </div>
        {/* Lots tab */}
        {/* <TabsContent value="lots" className="m-0">
          <div className="mx-auto w-full max-w-6xl space-y-4 px-6 py-6">
            {(it.description || totalLots > 0) && (
              <div className="flex flex-wrap items-start justify-between gap-4">
                {it.description && (
                  <p className="text-muted-foreground max-w-prose text-sm">
                    {it.description}
                  </p>
                )}
                {totalLots > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">
                      <span className="text-foreground font-semibold tabular-nums">
                        {inProgress}
                      </span>{" "}
                      in progress
                    </span>
                    <span className="bg-border h-4 w-px" />
                    <span className="text-muted-foreground">
                      <span className="text-foreground font-semibold tabular-nums">
                        {statusInsights.initial}
                      </span>{" "}
                      prepared
                    </span>
                    <span className="bg-border h-4 w-px" />
                    <span className="text-muted-foreground">
                      <span className="text-foreground font-semibold tabular-nums">
                        {statusInsights.active}
                      </span>{" "}
                      active
                    </span>
                  </div>
                )}
              </div>
            )}

            <LotsTable
              lots={lots}
              lotsLoading={lotsLoading}
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              variantFilter={variantFilter}
              onVariantFilterChange={setVariantFilter}
              statuses={statuses}
              variants={variants}
              attrDefs={attrDefs}
              statusMap={statusMap}
              selected={selected}
              onSelectedChange={setSelected}
              onBulkStatusOpen={() => setBulkStatusOpen(true)}
              onBulkVariantOpen={() => setBulkVariantOpen(true)}
              onBulkDeleteOpen={() => setBulkDeleteOpen(true)}
              onBulkAttributeOpen={() => setBulkAttributeOpen(true)}
              org={params.org}
              quantityName={it.qtyName}
              quantityUnit={it.qtyUom}
            />
          </div>
        </TabsContent> */}
        {/* AI Summary tab */}
        {/* <TabsContent value="summary" className="m-0">
          <div className="mx-auto w-full max-w-4xl px-6 py-6">
            <AiDailySummary lotTypeId={typeId} />
          </div>
        </TabsContent> */}
        {/* Status Flow tab */}
        {/* <TabsContent value="flow" className="m-0">
            <div className="mx-auto w-full max-w-6xl px-6 py-6">
              <StatusFlowDiagram
                statuses={statuses}
                transitions={transitions}
              />
            </div>
          </TabsContent>
      */}
        {/* Quick Report tab */}
        {/* <TabsContent value="report" className="m-0">
          <div className="mx-auto w-full max-w-6xl px-6 py-6">
            <QuickReport
              typeId={typeId}
              quantityName={it.qtyName}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              variantFilter={variantFilter}
              setVariantFilter={setVariantFilter}
              statuses={statuses}
              variants={variants}
              locations={locations}
              attrDefs={attrDefs}
            />
          </div>
        </TabsContent> */}
        {/* ── Dialogs ── */}
        <BulkStatusDialog
          open={bulkStatusOpen}
          onOpenChange={setBulkStatusOpen}
          selectedCount={selected.size}
          statuses={statuses}
          onConfirm={(status) =>
            bulkUpdateStatus.mutate({
              lotIds: Array.from(selected),
              status,
            })
          }
          isPending={bulkUpdateStatus.isPending}
        />
        <BulkDeleteDialog
          open={bulkDeleteOpen}
          onOpenChange={setBulkDeleteOpen}
          selectedCount={selected.size}
          onConfirm={() => bulkDelete.mutate({ lotIds: Array.from(selected) })}
          isPending={bulkDelete.isPending}
        />
        <BulkVariantDialog
          open={bulkVariantOpen}
          onOpenChange={setBulkVariantOpen}
          selectedCount={selected.size}
          variants={variants}
          onConfirm={(variantId) =>
            bulkSetVariant.mutate({
              lotIds: Array.from(selected),
              variantId,
            })
          }
          isPending={bulkSetVariant.isPending}
        />
        <BulkAttributeDialog
          open={bulkAttributeOpen}
          onOpenChange={setBulkAttributeOpen}
          selectedCount={selected.size}
          attrDefs={attrDefs}
          onConfirm={(attributes) =>
            bulkSetAttributes.mutate({
              lotIds: Array.from(selected),
              attributes,
            })
          }
          isPending={bulkSetAttributes.isPending}
        />
        <CreateLotsDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          lotTypeName={it.name}
          codePrefix={it.codePrefix}
          statuses={statuses}
          variants={variants}
          attrDefs={attrDefs}
          onConfirm={({ count, variantId, status, attributes }) =>
            batchCreate.mutate({
              lotTypeId: typeId,
              useSequence: true,
              count,
              variantId,
              status,
              attributes:
                Object.keys(attributes).length > 0 ? attributes : undefined,
            })
          }
          isPending={batchCreate.isPending}
          error={batchCreate.error?.message}
        />{" "}
      </div>
    </>
  );
}
