"use client";

import { useState } from "react";
import { Loader2, MapPin, Play } from "lucide-react";

import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import type { ScanWorkflow, ScanContext, WorkflowPanelProps } from "./types";

function MoveToLocationPanel({ ctx, onComplete }: WorkflowPanelProps) {
  const loc = ctx.locations[0]!.location;
  const lotIds = ctx.lots.map((l) => l.lot.lot.id);
  const mutation = api.lot.bulkSetLocation.useMutation();
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async () => {
    setError(null);
    try {
      await mutation.mutateAsync({ lotIds, locationId: loc.id });
      onComplete({
        message: `Moved ${lotIds.length} lot(s) to ${loc.name}.`,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to move lots");
    }
  };

  return (
    <>
      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        <label className="text-muted-foreground mb-1.5 block text-xs font-medium tracking-wide uppercase">
          Move to Location
        </label>
        <div className="border-border rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <MapPin className="text-primary size-4 shrink-0" />
            <span className="text-sm font-medium">{loc.name}</span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Set location of {lotIds.length} lot(s) to {loc.name}.
          </p>
        </div>
      </div>

      <div className="border-t p-4">
        {error && (
          <div className="bg-destructive/10 text-destructive mb-3 rounded-md px-3 py-2 text-sm">
            {error}
          </div>
        )}
        <Button
          onClick={() => void handleExecute()}
          disabled={mutation.isPending}
          className="w-full gap-2"
          size="lg"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Moving...
            </>
          ) : (
            <>
              <Play className="size-4" />
              Move to {loc.name}
            </>
          )}
        </Button>
      </div>
    </>
  );
}

export const moveToLocationWorkflow: ScanWorkflow = {
  id: "move-to-location",
  match(ctx: ScanContext) {
    if (ctx.lots.length === 0 || ctx.locations.length === 0) return null;
    const loc = ctx.locations[0]!.location;
    return {
      label: `Move to ${loc.name}`,
      description: `Set location of ${ctx.lots.length} lot(s) to ${loc.name}`,
      icon: MapPin,
      ready: true,
      priority: 60,
    };
  },
  Panel: MoveToLocationPanel,
};
