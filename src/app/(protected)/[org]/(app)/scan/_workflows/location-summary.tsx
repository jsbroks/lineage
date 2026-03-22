"use client";

import { Info, MapPin } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import type { ScanWorkflow, ScanContext, WorkflowPanelProps } from "./types";

function LocationSummaryPanel({ ctx }: WorkflowPanelProps) {
  const loc = ctx.locations[0]!.location;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4">
      <div className="mb-4 flex items-center gap-2">
        <MapPin className="text-primary size-5" />
        <h2 className="text-lg font-semibold">{loc.name}</h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs uppercase">Type</span>
          <Badge variant="secondary" className="text-xs">
            {loc.type}
          </Badge>
        </div>
        {loc.description && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs uppercase">
              Description
            </span>
            <span className="text-sm">{loc.description}</span>
          </div>
        )}
        {loc.parentId && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs uppercase">
              Parent ID
            </span>
            <span className="font-mono text-xs">{loc.parentId}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export const locationSummaryWorkflow: ScanWorkflow = {
  id: "location-summary",
  match(ctx: ScanContext) {
    if (
      ctx.locations.length !== 1 ||
      ctx.lots.length > 0 ||
      ctx.unknowns.length > 0
    )
      return null;
    return {
      label: "Location Details",
      description: `View details for ${ctx.locations[0]!.location.name}`,
      icon: Info,
      ready: true,
      priority: 40,
    };
  },
  Panel: LocationSummaryPanel,
};
