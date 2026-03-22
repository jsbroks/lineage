"use client";

import { useState } from "react";
import { Link2, Loader2, Play, Search } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import type {
  ScanWorkflow,
  ScanContext,
  WorkflowPanelProps,
  ScannedItem,
} from "./types";

function LinkCodePanel({ ctx, onComplete }: WorkflowPanelProps) {
  const unknownItem = ctx.unknowns[0]!;
  const unknownCode = unknownItem.rawCode;
  const lotTypesQuery = api.lotType.list.useQuery();
  const addIdentifierMutation = api.lot.addIdentifier.useMutation();
  const utils = api.useUtils();

  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lotsQuery = api.lot.listByType.useQuery(
    { lotTypeId: selectedTypeId, search: searchTerm || undefined },
    { enabled: !!selectedTypeId },
  );

  const handleLink = async () => {
    if (!selectedLotId) return;
    setError(null);

    try {
      await addIdentifierMutation.mutateAsync({
        lotId: selectedLotId,
        identifierType: unknownItem.formatName ?? "Barcode",
        identifierValue: unknownCode,
      });

      const linkedLot = lotsQuery.data?.find((l) => l.id === selectedLotId);
      const lotData = await utils.lot.getByCode.fetch({
        code: linkedLot?.code ?? "",
      });

      const updatedItems: ScannedItem[] = ctx.items.map((item) =>
        item.kind === "unknown" && item.rawCode === unknownCode
          ? { kind: "lot", lot: lotData, rawCode: unknownCode }
          : item,
      );

      onComplete({
        message: `Linked "${unknownCode}" to ${linkedLot?.code ?? "lot"}.`,
        updatedItems,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to link code");
    }
  };

  return (
    <>
      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        <label className="text-muted-foreground mb-1.5 block text-xs font-medium tracking-wide uppercase">
          Link to Existing Lot
        </label>
        <p className="text-muted-foreground mb-3 text-xs">
          Link <span className="font-mono">{unknownCode}</span> to an existing
          lot as an identifier.
        </p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Lot Type</label>
            {lotTypesQuery.isLoading ? (
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
            ) : (
              <Select
                value={selectedTypeId}
                onValueChange={(v) => {
                  setSelectedTypeId(v);
                  setSelectedLotId(null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by type..." />
                </SelectTrigger>
                <SelectContent>
                  {lotTypesQuery.data?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedTypeId && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Search Lots</label>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
                <Input
                  placeholder="Search by code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          )}

          {selectedTypeId && (
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {lotsQuery.isLoading && (
                <div className="text-muted-foreground flex items-center gap-2 py-2 text-xs">
                  <Loader2 className="size-3 animate-spin" />
                  Loading...
                </div>
              )}
              {lotsQuery.data?.slice(0, 50).map((lot) => (
                <button
                  key={lot.id}
                  type="button"
                  onClick={() => setSelectedLotId(lot.id)}
                  className={`w-full rounded-md border px-2.5 py-1.5 text-left transition-all ${
                    selectedLotId === lot.id
                      ? "border-primary bg-primary/5 ring-primary/20 ring-1"
                      : "border-border hover:border-foreground/20"
                  }`}
                >
                  <span className="font-mono text-xs font-medium">
                    {lot.code}
                  </span>
                  {lot.variantName && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      {lot.variantName}
                    </Badge>
                  )}
                </button>
              ))}
              {lotsQuery.data && lotsQuery.data.length === 0 && (
                <p className="text-muted-foreground py-2 text-xs">
                  No lots found.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t p-4">
        {error && (
          <div className="bg-destructive/10 text-destructive mb-3 rounded-md px-3 py-2 text-sm">
            {error}
          </div>
        )}
        <Button
          onClick={() => void handleLink()}
          disabled={addIdentifierMutation.isPending || !selectedLotId}
          className="w-full gap-2"
          size="lg"
        >
          {addIdentifierMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Linking...
            </>
          ) : (
            <>
              <Play className="size-4" />
              Link Code
            </>
          )}
        </Button>
      </div>
    </>
  );
}

export const linkCodeWorkflow: ScanWorkflow = {
  id: "link-code",
  match(ctx: ScanContext) {
    if (ctx.unknowns.length === 0) return null;
    return {
      label: "Link to Existing Lot",
      description: `Link unrecognized code to an existing lot`,
      icon: Link2,
      ready: true,
      priority: 20,
    };
  },
  Panel: LinkCodePanel,
};
