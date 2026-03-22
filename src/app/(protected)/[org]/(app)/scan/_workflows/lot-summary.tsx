"use client";

import { Info, Loader2, MapPin, Package2 } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";
import type { ScanWorkflow, ScanContext, WorkflowPanelProps } from "./types";

function LotSummaryPanel({ ctx }: WorkflowPanelProps) {
  const scannedLot = ctx.lots[0]!.lot;
  const detailQuery = api.lot.getById.useQuery(
    { lotId: scannedLot.lot.id },
    { enabled: true },
  );

  if (detailQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  const detail = detailQuery.data;
  if (!detail) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-8 text-sm">
        Could not load lot details.
      </div>
    );
  }

  const attrs = (detail.lot.attributes ?? {}) as Record<string, unknown>;
  const attrEntries = Object.entries(attrs).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4">
      <div className="mb-4 flex items-center gap-2">
        <Package2 className="text-primary size-5" />
        <h2 className="text-lg font-semibold">{detail.lot.code}</h2>
      </div>

      <div className="space-y-3">
        {detail.lotType && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs uppercase">
              Type
            </span>
            <span className="text-sm font-medium">{detail.lotType.name}</span>
          </div>
        )}
        {detail.variant && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs uppercase">
              Variant
            </span>
            <Badge variant="secondary" className="text-xs">
              {detail.variant.name}
            </Badge>
          </div>
        )}
        {detail.location && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs uppercase">
              Location
            </span>
            <div className="flex items-center gap-1 text-sm">
              <MapPin className="size-3.5" />
              {detail.location.name}
            </div>
          </div>
        )}
        {detail.lot.quantity && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs uppercase">
              Quantity
            </span>
            <span className="text-sm">
              {detail.lot.quantity} {detail.lot.quantityUnit ?? ""}
            </span>
          </div>
        )}

        {attrEntries.length > 0 && (
          <>
            <div className="border-border my-2 border-t" />
            <div className="space-y-2">
              {attrEntries.map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">{key}</span>
                  <span className="text-sm">{String(value)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {detail.parentLineage.length > 0 && (
          <>
            <div className="border-border my-2 border-t" />
            <label className="text-muted-foreground text-xs uppercase">
              Parents
            </label>
            <div className="space-y-1">
              {detail.parentLineage.map((p) => (
                <div key={p.link.id} className="text-sm">
                  {p.lot?.code ?? "Unknown"}
                </div>
              ))}
            </div>
          </>
        )}

        {detail.childLineage.length > 0 && (
          <>
            <div className="border-border my-2 border-t" />
            <label className="text-muted-foreground text-xs uppercase">
              Children
            </label>
            <div className="space-y-1">
              {detail.childLineage.map((c) => (
                <div key={c.link.id} className="text-sm">
                  {c.lot?.code ?? "Unknown"}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export const lotSummaryWorkflow: ScanWorkflow = {
  id: "lot-summary",
  match(ctx: ScanContext) {
    if (ctx.lots.length !== 1 || ctx.unknowns.length > 0) return null;
    if (ctx.locations.length > 0) return null;
    return {
      label: "Lot Summary",
      description: `View details for ${ctx.lots[0]!.lot.lot.code}`,
      icon: Info,
      ready: true,
      priority: 40,
    };
  },
  Panel: LotSummaryPanel,
};
