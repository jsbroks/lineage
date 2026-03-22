"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, PackagePlus, Play, Sparkles } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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

const PRODUCT_FORMATS = new Set([
  "EAN_13",
  "EAN_8",
  "UPC_A",
  "UPC_E",
  "UPC_EAN_EXTENSION",
]);
function isProductFormat(fmt?: string) {
  return fmt != null && PRODUCT_FORMATS.has(fmt);
}

function CreateLotPanel({ ctx, onComplete }: WorkflowPanelProps) {
  const unknownCodes = ctx.unknowns.map((u) => u.rawCode);
  const firstCode = ctx.unknowns[0]?.rawCode;

  const resolveQuery = api.lotType.resolveByIdentifier.useQuery(
    { identifierValue: firstCode! },
    { enabled: !!firstCode },
  );

  const lotTypesQuery = api.lotType.listWithStatuses.useQuery();
  const createMutation = api.lot.create.useMutation();
  const addLotIdentifierMutation = api.lot.addIdentifier.useMutation();
  const addTypeIdentifierMutation = api.lotType.addIdentifier.useMutation();
  const utils = api.useUtils();

  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [autoFilled, setAutoFilled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAutoFilled = useRef(false);
  useEffect(() => {
    if (resolveQuery.data && !hasAutoFilled.current) {
      setSelectedTypeId(resolveQuery.data.lotTypeId);
      setAutoFilled(true);
      hasAutoFilled.current = true;
    }
  }, [resolveQuery.data]);

  const resolvedMatch = resolveQuery.data;

  const selectedType = lotTypesQuery.data?.find((t) => t.id === selectedTypeId);
  const defaultStatus = selectedType?.statuses.find((s) => s.ordinal === 0);

  const handleTypeChange = (typeId: string) => {
    setSelectedTypeId(typeId);
    if (typeId !== resolvedMatch?.lotTypeId) {
      setAutoFilled(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedTypeId || !defaultStatus) return;
    setError(null);

    try {
      const hostname = window.location.origin;
      const newItems: ScannedItem[] = [];

      for (const unknown of ctx.unknowns) {
        const lot = await createMutation.mutateAsync({
          hostname,
          lotTypeId: selectedTypeId,
          code: unknown.rawCode,
          status: defaultStatus.id,
        });

        if (!isProductFormat(unknown.formatName)) {
          await addLotIdentifierMutation.mutateAsync({
            lotId: lot.id,
            identifierType: unknown.formatName ?? "Barcode",
            identifierValue: unknown.rawCode,
          });
        }

        await addTypeIdentifierMutation.mutateAsync({
          lotTypeId: selectedTypeId,
          variantId: autoFilled ? resolvedMatch?.variantId : null,
          identifierType: unknown.formatName ?? "Barcode",
          identifierValue: unknown.rawCode,
        });

        const lotData = await utils.lot.getByCode.fetch({
          code: unknown.rawCode,
        });
        newItems.push({
          kind: "lot",
          lot: lotData,
          rawCode: unknown.rawCode,
          formatName: unknown.formatName,
        });
      }

      onComplete({
        message: `Created ${unknownCodes.length} lot(s).`,
        updatedItems: [
          ...ctx.items.filter((i) => i.kind !== "unknown"),
          ...newItems,
        ],
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create lot");
    }
  };

  const isPending =
    createMutation.isPending ||
    addLotIdentifierMutation.isPending ||
    addTypeIdentifierMutation.isPending;

  return (
    <>
      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        <label className="text-muted-foreground mb-1.5 block text-xs font-medium tracking-wide uppercase">
          Create New Lot
        </label>
        <p className="text-muted-foreground mb-3 text-xs">
          Create{" "}
          {unknownCodes.length === 1 ? "a lot" : `${unknownCodes.length} lots`}{" "}
          from unrecognized code{unknownCodes.length > 1 ? "s" : ""}.
        </p>

        <div className="mb-3 space-y-1">
          {unknownCodes.map((code) => (
            <div
              key={code}
              className="bg-muted/50 rounded px-2 py-1 font-mono text-xs"
            >
              {code}
            </div>
          ))}
        </div>

        {autoFilled && resolvedMatch && (
          <div className="bg-primary/5 border-primary/20 mb-3 flex items-start gap-2 rounded-md border px-3 py-2">
            <Sparkles className="text-primary mt-0.5 size-3.5 shrink-0" />
            <div className="text-xs">
              <span className="font-medium">Recognized as </span>
              <Badge variant="secondary" className="text-[10px]">
                {resolvedMatch.lotTypeName}
                {resolvedMatch.variantName && ` > ${resolvedMatch.variantName}`}
              </Badge>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Lot Type <span className="text-destructive">*</span>
            </label>
            {lotTypesQuery.isLoading || resolveQuery.isLoading ? (
              <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                {resolveQuery.isLoading
                  ? "Detecting type..."
                  : "Loading types..."}
              </div>
            ) : (
              <Select value={selectedTypeId} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select lot type..." />
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

          {selectedType && (
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs">
                Initial status: {defaultStatus?.name ?? "—"}
              </label>
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
          onClick={() => void handleCreate()}
          disabled={isPending || !selectedTypeId || !defaultStatus}
          className="w-full gap-2"
          size="lg"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Play className="size-4" />
              Create{" "}
              {unknownCodes.length === 1
                ? "Lot"
                : `${unknownCodes.length} Lots`}
            </>
          )}
        </Button>
      </div>
    </>
  );
}

export const createLotWorkflow: ScanWorkflow = {
  id: "create-lot",
  match(ctx: ScanContext) {
    if (ctx.unknowns.length === 0) return null;
    return {
      label: "Create New Lot",
      description: `Create ${ctx.unknowns.length} lot(s) from unrecognized code(s)`,
      icon: PackagePlus,
      ready: true,
      priority: 30,
    };
  },
  Panel: CreateLotPanel,
};
