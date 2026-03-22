import { useState } from "react";

import {
  ChevronDown,
  ChevronRight,
  CircleHelp,
  MapPin,
  Package2,
  ScanBarcode,
  X,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { ScannedLotRow } from "./ScannedLotRow";
import type { ScannedItem, LotWithType } from "../_workflows/types";

interface ScannedItemsListProps {
  items: ScannedItem[];
  onRemove: (index: number) => void;
}

export function ScannedItemsList({ items, onRemove }: ScannedItemsListProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const lots: Array<{ item: LotWithType; rawCode: string; index: number }> = [];
  const locations: Array<{
    item: ScannedItem & { kind: "location" };
    index: number;
  }> = [];
  const unknowns: Array<{ rawCode: string; index: number }> = [];

  items.forEach((item, idx) => {
    switch (item.kind) {
      case "lot":
        lots.push({ item: item.lot, rawCode: item.rawCode, index: idx });
        break;
      case "location":
        locations.push({ item, index: idx });
        break;
      case "unknown":
        unknowns.push({ rawCode: item.rawCode, index: idx });
        break;
    }
  });

  const groupedLots = lots.reduce<
    Map<
      string,
      {
        typeName: string;
        entries: Array<{ item: LotWithType; index: number }>;
      }
    >
  >((map, entry) => {
    const typeId = entry.item.lot.lotTypeId;
    const existing = map.get(typeId);
    if (existing) {
      existing.entries.push({ item: entry.item, index: entry.index });
    } else {
      map.set(typeId, {
        typeName: entry.item.lotType?.name ?? "Unknown Type",
        entries: [{ item: entry.item, index: entry.index }],
      });
    }
    return map;
  }, new Map());

  const hasAnything = items.length > 0;

  return (
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
        {/* Unrecognized codes */}
        {unknowns.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-amber-300 dark:border-amber-700">
            <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
              <CircleHelp className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="flex-1 text-sm font-medium text-amber-800 dark:text-amber-300">
                Unrecognized
              </span>
              <Badge
                variant="secondary"
                className="bg-amber-100 text-xs text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
              >
                {unknowns.length}
              </Badge>
            </div>
            <div className="divide-y divide-amber-200 border-t border-amber-200 dark:divide-amber-800 dark:border-amber-800">
              {unknowns.map((u) => (
                <div
                  key={u.index}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm"
                >
                  <span className="flex-1 truncate font-mono text-xs">
                    {u.rawCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(u.index)}
                    className="text-muted-foreground hover:text-foreground shrink-0 rounded p-0.5 transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locations */}
        {locations.length > 0 && (
          <div className="border-border overflow-hidden rounded-lg border">
            <div className="flex items-center gap-2 px-3 py-2">
              <MapPin className="text-primary size-4 shrink-0" />
              <span className="flex-1 text-sm font-medium">Locations</span>
              <Badge variant="secondary" className="text-xs">
                {locations.length}
              </Badge>
            </div>
            <div className="border-border divide-border divide-y border-t">
              {locations.map((loc) => (
                <div
                  key={loc.index}
                  className="hover:bg-muted/30 flex items-center gap-2 px-3 py-1.5 text-sm transition-colors"
                >
                  <MapPin className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="flex-1 text-xs font-medium">
                    {loc.item.location.name}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {loc.item.location.type}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => onRemove(loc.index)}
                    className="text-muted-foreground hover:text-foreground shrink-0 rounded p-0.5 transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lot groups */}
        {[...groupedLots.entries()].map(([typeId, { typeName, entries }]) => {
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
                <span className="flex-1 text-sm font-medium">{typeName}</span>
                <Badge variant="secondary" className="text-xs">
                  {entries.length}
                </Badge>
              </button>

              {!isCollapsed && (
                <div className="border-border divide-border divide-y border-t">
                  {entries.map((entry) => (
                    <ScannedLotRow
                      key={entry.item.lot.id}
                      entry={entry.item}
                      onRemove={() => onRemove(entry.index)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
