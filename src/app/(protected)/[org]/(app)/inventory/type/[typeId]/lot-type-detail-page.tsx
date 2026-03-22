"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Edit, Plus, Printer } from "lucide-react";

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
import { SidebarTrigger } from "~/components/ui/sidebar";
import { api } from "~/trpc/react";
import { Icon } from "~/app/_components/IconPicker";

import { AiDailySummary } from "./_components/AiDailySummary";
import { InsightCards } from "./_components/InsightCards";
import { QuickReport } from "./_components/QuickReport";
import { LotsTable } from "./_components/LotsTable";
import { BulkStatusDialog } from "./_components/BulkStatusDialog";
import { BulkDeleteDialog } from "./_components/BulkDeleteDialog";
import { BulkVariantDialog } from "./_components/BulkVariantDialog";
import { BulkAttributeDialog } from "./_components/BulkAttributeDialog";
import { CreateLotsDialog } from "./_components/CreateLotsDialog";

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
  const variants = typeData?.variants ?? [];
  const attrDefs = typeData?.attributeDefinitions ?? [];

  const statusMap = useMemo(() => {
    const m = new Map<
      string,
      {
        name: string;
        color: string | null;
        category: string;
      }
    >();
    for (const s of statuses) {
      m.set(s.id, {
        name: s.name,
        color: s.color,
        category: s.category,
      });
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
            Lot type not found
          </span>
        </header>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
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
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${params.org}/inventory/print?typeId=${typeId}`}>
              <Printer className="mr-1 size-3.5" /> Print Labels
            </Link>
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 size-3.5" /> Create lots
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-6">
          {it.description && (
            <p className="text-muted-foreground text-sm">{it.description}</p>
          )}

          <AiDailySummary lotTypeId={typeId} />

          <InsightCards totalLots={totalLots} statusInsights={statusInsights} />

          <QuickReport
            typeId={typeId}
            quantityName={it.quantityName}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            variantFilter={variantFilter}
            setVariantFilter={setVariantFilter}
            statuses={statuses}
            variants={variants}
            locations={locations}
            attrDefs={attrDefs}
          />

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
            quantityName={it.quantityName}
            quantityUnit={it.quantityDefaultUnit}
          />
        </div>
      </div>

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
      />
    </div>
  );
}
