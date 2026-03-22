"use client";

import { useState } from "react";
import { ArrowDownUp, GitMerge, Loader2, Play } from "lucide-react";

import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import type { ScanWorkflow, ScanContext, WorkflowPanelProps } from "./types";

function NestLocationsPanel({ ctx, onComplete }: WorkflowPanelProps) {
  const [parentIdx, setParentIdx] = useState(0);
  const mutation = api.location.setParent.useMutation();
  const [error, setError] = useState<string | null>(null);

  const parent = ctx.locations[parentIdx]!.location;
  const child = ctx.locations[parentIdx === 0 ? 1 : 0]!.location;

  const handleExecute = async () => {
    setError(null);
    try {
      await mutation.mutateAsync({ childId: child.id, parentId: parent.id });
      onComplete({
        message: `Set "${parent.name}" as parent of "${child.name}".`,
      });
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Failed to set parent location",
      );
    }
  };

  return (
    <>
      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        <label className="text-muted-foreground mb-1.5 block text-xs font-medium tracking-wide uppercase">
          Relationship
        </label>
        <div className="border-border rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-[10px] font-medium uppercase">
                  Parent
                </span>
                <span className="text-sm font-medium">{parent.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-[10px] font-medium uppercase">
                  Child
                </span>
                <span className="text-sm font-medium">{child.name}</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setParentIdx((prev) => (prev === 0 ? 1 : 0))}
            >
              <ArrowDownUp className="size-3.5" />
              Swap
            </Button>
          </div>
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
              Nesting...
            </>
          ) : (
            <>
              <Play className="size-4" />
              Nest {child.name} under {parent.name}
            </>
          )}
        </Button>
      </div>
    </>
  );
}

export const nestLocationsWorkflow: ScanWorkflow = {
  id: "nest-locations",
  match(ctx: ScanContext) {
    if (ctx.locations.length !== 2 || ctx.lots.length > 0) return null;
    const a = ctx.locations[0]!.location.name;
    const b = ctx.locations[1]!.location.name;
    return {
      label: `Nest ${b} under ${a}`,
      description: `Set "${a}" as the parent of "${b}"`,
      icon: GitMerge,
      ready: true,
      priority: 70,
    };
  },
  Panel: NestLocationsPanel,
};
