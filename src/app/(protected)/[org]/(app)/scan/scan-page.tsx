"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowDownUp,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  MapPin,
  Package2,
  Play,
  ScanBarcode,
  X,
  Zap,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";

type ItemWithType = RouterOutputs["item"]["getByCode"];
type ScannedLocation = RouterOutputs["location"]["getByName"];

type SuggestedOperation = RouterOutputs["operation"]["suggest"][number];
type ExecuteResult = RouterOutputs["operation"]["execute"];

type BuiltInOperation = {
  id: string;
  name: string;
  description: string;
  ready: boolean;
};

const BUILTIN_MOVE_TO_LOCATION = "builtin:move-to-location";
const BUILTIN_SET_PARENT_LOCATION = "builtin:set-parent-location";

type NonNullLocation = NonNullable<ScannedLocation>;

export default function ScanPage() {
  const params = useParams<{ org: string }>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Scanned items stored with their item type info
  const [scannedItems, setScannedItems] = useState<ItemWithType[]>([]);
  const [scannedLocations, setScannedLocations] = useState<NonNullLocation[]>(
    [],
  );
  const [scanInput, setScanInput] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Operation state — can be a DB-sourced suggestion or a built-in ID
  const [chosenOp, setChosenOp] = useState<SuggestedOperation | null>(null);
  const [chosenBuiltIn, setChosenBuiltIn] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<ExecuteResult | null>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);

  // For "Set Parent Location" — which location is the parent (index into scannedLocations)
  const [parentLocationIdx, setParentLocationIdx] = useState(0);

  // Collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  const scannedItemIds = scannedItems.map((s) => s.item.id);

  const suggestQuery = api.operation.suggest.useQuery(
    { itemIds: scannedItemIds },
    { enabled: scannedItemIds.length > 0 },
  );

  const opTypeQuery = api.operationType.getById.useQuery(
    { id: chosenOp?.operationType.id ?? "" },
    { enabled: !!chosenOp },
  );

  const executeMutation = api.operation.execute.useMutation();
  const moveToLocationMutation = api.item.bulkSetLocation.useMutation();
  const setParentMutation = api.location.setParent.useMutation();
  const utils = api.useUtils();

  // Built-in operations derived from scan context
  const builtInOps: BuiltInOperation[] = [];
  if (scannedLocations.length >= 1 && scannedItems.length > 0) {
    builtInOps.push({
      id: BUILTIN_MOVE_TO_LOCATION,
      name: `Move to ${scannedLocations[0]!.name}`,
      description: `Set location of ${scannedItems.length} item(s) to ${scannedLocations[0]!.name}`,
      ready: true,
    });
  }
  if (scannedLocations.length === 2) {
    const parent = scannedLocations[parentLocationIdx] ?? scannedLocations[0]!;
    const child =
      scannedLocations[parentLocationIdx === 0 ? 1 : 0] ?? scannedLocations[1]!;
    builtInOps.push({
      id: BUILTIN_SET_PARENT_LOCATION,
      name: `Nest ${child.name} under ${parent.name}`,
      description: `Set "${parent.name}" as the parent of "${child.name}"`,
      ready: true,
    });
  }

  // Auto-select best operation when suggestions or built-ins change
  useEffect(() => {
    const dbSuggestions = suggestQuery.data ?? [];
    const hasBuiltIn = builtInOps.length > 0;
    const hasDbSuggestions = dbSuggestions.length > 0;

    // If user already has a selection, try to preserve it
    if (chosenBuiltIn) {
      if (builtInOps.some((b) => b.id === chosenBuiltIn)) return;
      setChosenBuiltIn(null);
    }
    if (chosenOp) {
      const stillExists = dbSuggestions.find(
        (s) => s.operationType.id === chosenOp.operationType.id,
      );
      if (stillExists) {
        setChosenOp(stillExists);
        return;
      }
    }

    // Auto-select: prefer ready built-in, then DB suggestions
    if (hasBuiltIn && builtInOps[0]!.ready) {
      setChosenBuiltIn(builtInOps[0]!.id);
      setChosenOp(null);
      setFieldValues({});
    } else if (hasDbSuggestions) {
      setChosenOp(dbSuggestions[0]!);
      setChosenBuiltIn(null);
      setFieldValues({});
    } else if (hasBuiltIn) {
      setChosenBuiltIn(builtInOps[0]!.id);
      setChosenOp(null);
      setFieldValues({});
    } else {
      setChosenOp(null);
      setChosenBuiltIn(null);
      setFieldValues({});
    }
  }, [suggestQuery.data, scannedLocations.length, scannedItems.length]);

  const handleScan = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;

      if (scannedItems.some((s) => s.item.code === trimmed)) {
        setScanError(`"${trimmed}" is already scanned`);
        setScanInput("");
        inputRef.current?.focus();
        return;
      }

      setIsLookingUp(true);
      setScanError(null);

      // Try item lookup first
      try {
        const data = await utils.item.getByCode.fetch({ code: trimmed });
        if (scannedItems.some((s) => s.item.id === data.item.id)) {
          setScanError(`"${trimmed}" is already scanned`);
        } else {
          setScannedItems((prev) => [...prev, data]);
          setResult(null);
          setExecuteError(null);
        }
        setScanInput("");
        setIsLookingUp(false);
        inputRef.current?.focus();
        return;
      } catch {
        // Not an item — try location
      }

      try {
        const loc = await utils.location.getByName.fetch({ name: trimmed });
        if (loc) {
          if (scannedLocations.some((l) => l.id === loc.id)) {
            setScanError(`"${loc.name}" is already scanned`);
          } else {
            setScannedLocations((prev) => [...prev, loc]);
            setResult(null);
            setExecuteError(null);
          }
        } else {
          setScanError(`No item or location found for "${trimmed}"`);
        }
      } catch {
        setScanError(`No item or location found for "${trimmed}"`);
      } finally {
        setScanInput("");
        setIsLookingUp(false);
        inputRef.current?.focus();
      }
    },
    [
      scannedItems,
      scannedLocations,
      utils.item.getByCode,
      utils.location.getByName,
    ],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleScan(scanInput);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted.includes("\n") || pasted.includes("\r")) {
      e.preventDefault();
      void handleScan(pasted);
    }
  };

  const removeItem = (itemId: string) => {
    setScannedItems((prev) => prev.filter((s) => s.item.id !== itemId));
    setResult(null);
    setExecuteError(null);
  };

  const selectOperation = (suggestion: SuggestedOperation) => {
    setChosenOp(suggestion);
    setChosenBuiltIn(null);
    setFieldValues({});
    setResult(null);
    setExecuteError(null);
  };

  const selectBuiltIn = (id: string) => {
    setChosenBuiltIn(id);
    setChosenOp(null);
    setFieldValues({});
    setResult(null);
    setExecuteError(null);
  };

  const toggleGroup = (typeId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(typeId)) next.delete(typeId);
      else next.add(typeId);
      return next;
    });
  };

  const handleExecute = async () => {
    setExecuteError(null);

    // Built-in: Move to Location
    if (
      chosenBuiltIn === BUILTIN_MOVE_TO_LOCATION &&
      scannedLocations.length > 0
    ) {
      try {
        const res = await moveToLocationMutation.mutateAsync({
          itemIds: scannedItemIds,
          locationId: scannedLocations[0]!.id,
        });
        setResult({
          operationId: "",
          steps: [
            {
              stepName: "Move to Location",
              action: "set_location",
              skipped: false,
              success: true,
            },
          ],
          itemsCreated: [],
          itemsUpdated: scannedItemIds.slice(0, res.updated),
          lineageCreated: 0,
        });
      } catch (e: unknown) {
        setExecuteError(
          e instanceof Error ? e.message : "Failed to move items",
        );
      }
      return;
    }

    // Built-in: Set Parent Location
    if (
      chosenBuiltIn === BUILTIN_SET_PARENT_LOCATION &&
      scannedLocations.length === 2
    ) {
      const parent =
        scannedLocations[parentLocationIdx] ?? scannedLocations[0]!;
      const child =
        scannedLocations[parentLocationIdx === 0 ? 1 : 0] ??
        scannedLocations[1]!;
      try {
        await setParentMutation.mutateAsync({
          childId: child.id,
          parentId: parent.id,
        });
        setResult({
          operationId: "",
          steps: [
            {
              stepName: `Set "${parent.name}" as parent of "${child.name}"`,
              action: "set_parent",
              skipped: false,
              success: true,
            },
          ],
          itemsCreated: [],
          itemsUpdated: [],
          lineageCreated: 0,
        });
      } catch (e: unknown) {
        setExecuteError(
          e instanceof Error ? e.message : "Failed to set parent location",
        );
      }
      return;
    }

    // DB-sourced operation
    if (!chosenOp) return;

    // Match scanned items to ports by itemTypeId rather than using the
    // suggestion engine's pre-filtered matchedItemIds (which excludes
    // items that don't meet status preconditions). The execute engine
    // does its own validation and gives clearer error messages.
    const itemsByType = new Map<string, string[]>();
    for (const s of scannedItems) {
      const arr = itemsByType.get(s.item.itemTypeId) ?? [];
      arr.push(s.item.id);
      itemsByType.set(s.item.itemTypeId, arr);
    }

    const inputs: Record<string, unknown> = { ...fieldValues };
    for (const port of chosenOp.ports) {
      const ids = itemsByType.get(port.itemTypeId) ?? [];
      if (ids.length > 0) {
        inputs[port.referenceKey] = ids;
      }
    }

    if (scannedLocations[0]?.id) {
      inputs._locationId = scannedLocations[0].id;
    }

    try {
      const res = await executeMutation.mutateAsync({
        operationTypeId: chosenOp.operationType.id,
        inputs,
      });
      setResult(res);
    } catch (e: unknown) {
      setExecuteError(e instanceof Error ? e.message : "Execution failed");
    }
  };

  const reset = () => {
    setScannedItems([]);
    setScannedLocations([]);
    setParentLocationIdx(0);
    setChosenOp(null);
    setChosenBuiltIn(null);
    setFieldValues({});
    setResult(null);
    setExecuteError(null);
    setScanInput("");
    setScanError(null);
    inputRef.current?.focus();
  };

  // Group scanned items by item type
  const groupedItems = scannedItems.reduce<
    Map<
      string,
      { typeName: string; typeIcon: string | null; items: ItemWithType[] }
    >
  >((map, entry) => {
    const typeId = entry.item.itemTypeId;
    const existing = map.get(typeId);
    if (existing) {
      existing.items.push(entry);
    } else {
      map.set(typeId, {
        typeName: entry.itemType?.name ?? "Unknown Type",
        typeIcon: entry.itemType?.icon ?? null,
        items: [entry],
      });
    }
    return map;
  }, new Map());

  if (result) {
    return (
      <div className="container mx-auto max-w-4xl px-6 py-8">
        <ResultsView result={result} onReset={reset} />
      </div>
    );
  }

  const hasItems = scannedItems.length > 0;
  const hasAnything = hasItems || scannedLocations.length > 0;
  const isExecuting =
    executeMutation.isPending ||
    moveToLocationMutation.isPending ||
    setParentMutation.isPending;
  const activeOpName = chosenBuiltIn
    ? (builtInOps.find((b) => b.id === chosenBuiltIn)?.name ?? "Operation")
    : (chosenOp?.operationType.name ?? "Operation");
  const isReady = chosenBuiltIn
    ? (builtInOps.find((b) => b.id === chosenBuiltIn)?.ready ?? false)
    : (chosenOp?.ready ?? false);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex size-9 items-center justify-center rounded-lg">
            <ScanBarcode className="text-primary size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Smart Scan</h1>
            <p className="text-muted-foreground text-sm">
              Scan items to auto-detect and execute operations.
            </p>
          </div>
        </div>
      </div>

      {/* Split layout */}
      <div className="flex min-h-0 flex-1">
        {/* Left panel — scanned items */}
        <div className="flex w-1/2 flex-col border-r">
          <div className="p-4">
            <div className="relative">
              <ScanBarcode className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
              <Input
                ref={inputRef}
                autoFocus
                placeholder="Scan or type item code..."
                value={scanInput}
                onChange={(e) => {
                  setScanInput(e.target.value);
                  setScanError(null);
                }}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                className="pl-9"
                disabled={isLookingUp}
              />
              {isLookingUp && (
                <Loader2 className="text-muted-foreground absolute top-2.5 right-2.5 size-4 animate-spin" />
              )}
            </div>
            {scanError && (
              <p className="mt-1.5 flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="size-3.5 shrink-0" />
                {scanError}
              </p>
            )}
          </div>

          {/* Item groups */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {!hasAnything && (
              <div className="text-muted-foreground flex flex-col items-center justify-center py-16 text-center">
                <ScanBarcode className="mb-3 size-10 opacity-20" />
                <p className="text-sm font-medium">No items scanned yet</p>
                <p className="mt-1 text-xs">
                  Scan a barcode or type a code above to get started.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {/* Scanned locations */}
              {scannedLocations.length > 0 && (
                <div className="border-border overflow-hidden rounded-lg border">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <MapPin className="text-primary size-4 shrink-0" />
                    <span className="flex-1 text-sm font-medium">
                      Locations
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {scannedLocations.length}
                    </Badge>
                  </div>
                  <div className="border-border divide-border divide-y border-t">
                    {scannedLocations.map((loc) => (
                      <div
                        key={loc.id}
                        className="hover:bg-muted/30 flex items-center gap-2 px-3 py-1.5 text-sm transition-colors"
                      >
                        <MapPin className="text-muted-foreground size-3.5 shrink-0" />
                        <span className="flex-1 text-xs font-medium">
                          {loc.name}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {loc.type}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => {
                            setScannedLocations((prev) =>
                              prev.filter((l) => l.id !== loc.id),
                            );
                            setParentLocationIdx(0);
                          }}
                          className="text-muted-foreground hover:text-foreground shrink-0 rounded p-0.5 transition-colors"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {[...groupedItems.entries()].map(
                ([typeId, { typeName, items: groupItems }]) => {
                  const isCollapsed = collapsedGroups.has(typeId);
                  return (
                    <div
                      key={typeId}
                      className="border-border overflow-hidden rounded-lg border"
                    >
                      <button
                        type="button"
                        onClick={() => toggleGroup(typeId)}
                        className="hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-2 text-left transition-colors"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                        ) : (
                          <ChevronDown className="text-muted-foreground size-4 shrink-0" />
                        )}
                        <Package2 className="text-muted-foreground size-4 shrink-0" />
                        <span className="flex-1 text-sm font-medium">
                          {typeName}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {groupItems.length}
                        </Badge>
                      </button>

                      {!isCollapsed && (
                        <div className="border-border divide-border divide-y border-t">
                          {groupItems.map((entry) => (
                            <ScannedItemRow
                              key={entry.item.id}
                              entry={entry}
                              onRemove={removeItem}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </div>

        {/* Right panel — operation & fields */}
        <div className="flex w-1/2 flex-col">
          {!hasAnything && (
            <div className="text-muted-foreground flex flex-1 items-center justify-center p-8 text-center">
              <p className="text-sm">Scan items to see suggested operations.</p>
            </div>
          )}

          {hasAnything && (
            <div className="flex flex-1 flex-col overflow-y-auto p-4">
              {/* Operation selector */}
              <div className="mb-4">
                <label className="text-muted-foreground mb-1.5 block text-xs font-medium tracking-wide uppercase">
                  Operation
                </label>

                {suggestQuery.isLoading && !builtInOps.length && (
                  <div className="text-muted-foreground flex items-center gap-2 py-3 text-sm">
                    <Loader2 className="size-4 animate-spin" />
                    Finding matching operations...
                  </div>
                )}

                <div className="space-y-2">
                  {/* Built-in operations */}
                  {builtInOps.map((op) => {
                    const isSelected = chosenBuiltIn === op.id;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => selectBuiltIn(op.id)}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                            : "border-border hover:border-foreground/20"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="text-muted-foreground size-4 shrink-0" />
                          <span className="flex-1 text-sm font-medium">
                            {op.name}
                          </span>
                          <Badge
                            variant="ghost"
                            className="bg-green-100 text-[10px] text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          >
                            <CheckCircle2 className="mr-0.5 size-3" />
                            Ready
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {op.description}
                        </p>
                      </button>
                    );
                  })}

                  {/* DB-sourced operation suggestions */}
                  {suggestQuery.data?.map((suggestion) => {
                    const isSelected =
                      !chosenBuiltIn &&
                      chosenOp?.operationType.id ===
                        suggestion.operationType.id;
                    return (
                      <button
                        key={suggestion.operationType.id}
                        type="button"
                        onClick={() => selectOperation(suggestion)}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                            : "border-border hover:border-foreground/20"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex-1 text-sm font-medium">
                            {suggestion.operationType.name}
                          </span>
                          {suggestion.ready ? (
                            <Badge
                              variant="ghost"
                              className="bg-green-100 text-[10px] text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            >
                              <CheckCircle2 className="mr-0.5 size-3" />
                              Ready
                            </Badge>
                          ) : (
                            <Badge
                              variant="ghost"
                              className="bg-yellow-100 text-[10px] text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            >
                              <AlertCircle className="mr-0.5 size-3" />
                              Needs items
                            </Badge>
                          )}
                        </div>
                        {suggestion.operationType.description && (
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {suggestion.operationType.description}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>

                {!suggestQuery.isLoading &&
                  builtInOps.length === 0 &&
                  (suggestQuery.data?.length ?? 0) === 0 &&
                  hasItems && (
                    <p className="text-muted-foreground py-3 text-sm">
                      No matching operations for these items.
                    </p>
                  )}
              </div>

              {/* Swap parent/child for Set Parent Location */}
              {chosenBuiltIn === BUILTIN_SET_PARENT_LOCATION &&
                scannedLocations.length === 2 && (
                  <div className="mb-4">
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
                            <span className="text-sm font-medium">
                              {scannedLocations[parentLocationIdx]?.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-[10px] font-medium uppercase">
                              Child
                            </span>
                            <span className="text-sm font-medium">
                              {
                                scannedLocations[
                                  parentLocationIdx === 0 ? 1 : 0
                                ]?.name
                              }
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() =>
                            setParentLocationIdx((prev) => (prev === 0 ? 1 : 0))
                          }
                        >
                          <ArrowDownUp className="size-3.5" />
                          Swap
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

              {/* Field inputs for DB operations */}
              {chosenOp && !chosenBuiltIn && (
                <div className="flex-1">
                  <label className="text-muted-foreground mb-1.5 block text-xs font-medium tracking-wide uppercase">
                    Details
                  </label>
                  <FieldInputs
                    opTypeData={opTypeQuery.data}
                    isLoading={opTypeQuery.isLoading}
                    fieldValues={fieldValues}
                    setFieldValues={setFieldValues}
                  />
                </div>
              )}
            </div>
          )}

          {/* Execute bar */}
          {hasAnything && (chosenOp || chosenBuiltIn) && (
            <div className="border-t p-4">
              {executeError && (
                <div className="bg-destructive/10 text-destructive mb-3 rounded-md px-3 py-2 text-sm">
                  {executeError}
                </div>
              )}
              <Button
                onClick={handleExecute}
                disabled={isExecuting || !isReady}
                className="w-full gap-2"
                size="lg"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <Play className="size-4" />
                    Execute {activeOpName}
                  </>
                )}
              </Button>
              {!isReady && (
                <p className="text-muted-foreground mt-2 text-center text-xs">
                  Not all required items are present. Scan more items or choose
                  a different operation.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScannedItemRow({
  entry,
  onRemove,
}: {
  entry: ItemWithType;
  onRemove: (id: string) => void;
}) {
  const { item, status, variant } = entry;
  const attrs = (item.attributes ?? {}) as Record<string, unknown>;
  const attrEntries = Object.entries(attrs).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );

  return (
    <div className="hover:bg-muted/30 px-3 py-2 transition-colors">
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate font-mono text-xs font-medium">
          {item.code}
        </span>
        {variant && (
          <Badge variant="secondary" className="text-[10px]">
            {variant.name}
          </Badge>
        )}
        {status && (
          <Badge
            variant="outline"
            className="text-[10px]"
            style={
              status.color
                ? {
                    borderColor: status.color,
                    color: status.color,
                  }
                : undefined
            }
          >
            {status.name}
          </Badge>
        )}
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="text-muted-foreground hover:text-foreground shrink-0 rounded p-0.5 transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>
      {attrEntries.length > 0 && (
        <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
          {attrEntries.map(([key, value]) => (
            <span key={key}>
              <span className="opacity-60">{key}:</span> {String(value)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldInputs({
  opTypeData,
  isLoading,
  fieldValues,
  setFieldValues,
}: {
  opTypeData: RouterOutputs["operationType"]["getById"] | undefined;
  isLoading: boolean;
  fieldValues: Record<string, unknown>;
  setFieldValues: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
}) {
  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-3 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading fields...
      </div>
    );
  }

  const allInputs = opTypeData?.inputs ?? [];
  const fields = allInputs.filter((inp) => inp.type !== "items");

  if (fields.length === 0) {
    return (
      <p className="text-muted-foreground py-2 text-sm">
        No input fields required.
      </p>
    );
  }

  const updateField = (key: string, value: unknown) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const enumOpts = (field: (typeof fields)[number]) =>
    (field.options as { enum?: string[] } | null)?.enum ?? null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <label className="text-sm font-medium">
            {field.label ?? field.referenceKey}
            {field.required && (
              <span className="text-destructive ml-0.5">*</span>
            )}
          </label>
          {field.description && (
            <p className="text-muted-foreground text-xs">{field.description}</p>
          )}

          {field.type === "select" && enumOpts(field) ? (
            <Select
              value={(fieldValues[field.referenceKey] as string) ?? ""}
              onValueChange={(v) => updateField(field.referenceKey, v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={`Select ${field.referenceKey}`} />
              </SelectTrigger>
              <SelectContent>
                {enumOpts(field)!.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : field.type === "boolean" ? (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!fieldValues[field.referenceKey]}
                onChange={(e) =>
                  updateField(field.referenceKey, e.target.checked)
                }
                className="size-4 rounded"
              />
              <span className="text-sm">Yes</span>
            </label>
          ) : field.type === "number" ||
            field.type === "weight" ||
            field.type === "temperature" ? (
            <Input
              type="number"
              step="any"
              placeholder={field.referenceKey}
              value={(fieldValues[field.referenceKey] as string) ?? ""}
              onChange={(e) =>
                updateField(
                  field.referenceKey,
                  e.target.value ? Number(e.target.value) : "",
                )
              }
            />
          ) : field.type === "date" || field.type === "datetime" ? (
            <Input
              type={field.type === "datetime" ? "datetime-local" : "date"}
              value={(fieldValues[field.referenceKey] as string) ?? ""}
              onChange={(e) => updateField(field.referenceKey, e.target.value)}
            />
          ) : (
            <Input
              placeholder={field.referenceKey}
              value={(fieldValues[field.referenceKey] as string) ?? ""}
              onChange={(e) => updateField(field.referenceKey, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ResultsView({
  result,
  onReset,
}: {
  result: ExecuteResult;
  onReset: () => void;
}) {
  const failedSteps = result.steps.filter((s) => !s.skipped && !s.success);
  const hasErrors = failedSteps.length > 0;
  const executedCount = result.steps.filter((s) => !s.skipped).length;
  const skippedCount = result.steps.filter((s) => s.skipped).length;
  const succeededCount = executedCount - failedSteps.length;

  return (
    <div className="space-y-6">
      <Card
        className={
          hasErrors
            ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
            : "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
        }
      >
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                hasErrors
                  ? "bg-red-100 dark:bg-red-900/40"
                  : "bg-green-100 dark:bg-green-900/40"
              }`}
            >
              {hasErrors ? (
                <AlertCircle className="size-5 text-red-600" />
              ) : (
                <CheckCircle2 className="size-5 text-green-600" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">
                {hasErrors ? "Completed with errors" : "Done!"}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {succeededCount} step(s) succeeded
                {failedSteps.length > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    , {failedSteps.length} failed
                  </span>
                )}
                {skippedCount > 0 && <>, {skippedCount} skipped</>}.
              </p>

              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                {result.itemsCreated.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Zap className="size-3.5 text-blue-500" />
                    <span>{result.itemsCreated.length} created</span>
                  </div>
                )}
                {result.itemsUpdated.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-green-500" />
                    <span>{result.itemsUpdated.length} updated</span>
                  </div>
                )}
                {result.lineageCreated > 0 && (
                  <div className="flex items-center gap-1.5">
                    <ChevronRight className="size-3.5 text-purple-500" />
                    <span>{result.lineageCreated} connection(s)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasErrors && (
        <Card>
          <CardHeader>
            <CardTitle>Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {failedSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-md bg-red-50 px-3 py-2 dark:bg-red-950/20"
                >
                  <div className="mt-0.5 shrink-0">
                    <div className="flex size-5 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40">
                      <X className="size-3" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">{step.stepName}</span>
                    {step.detail && (
                      <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                        {step.detail}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button onClick={onReset} variant="outline" className="gap-2">
          <ScanBarcode className="size-4" />
          Scan More
        </Button>
      </div>
    </div>
  );
}
