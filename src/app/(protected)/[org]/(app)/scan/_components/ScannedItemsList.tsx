import React, { useState } from "react";

import {
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ScanBarcode,
  X,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";

import type { ScanContext } from "../_workflows/types";
import type {
  CodeInput,
  LotItem,
  LotTypeItem,
  UnknownItem,
} from "~/server/api/routers/scan";
import _ from "lodash";
import { Icon } from "~/app/_components/IconPicker";

interface ScannedItemsListProps {
  items: CodeInput[];
  ctx: ScanContext;
  onRemove: (code: string) => void;
}

const LotTypeRow: React.FC<LotTypeItem & { onRemove: () => void }> = ({
  lotType,
  onRemove,
}) => {
  return (
    <div className="border-border flex items-center gap-2 overflow-hidden rounded-lg border px-3 py-2">
      <Icon
        icon={lotType.icon}
        className="text-muted-foreground size-4 shrink-0"
      />
      <span className="flex-1 text-sm font-medium">{lotType.name}</span>
      <Badge variant="secondary" className="text-[10px]">
        Type
      </Badge>
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground shrink-0 rounded p-0.5 transition-colors"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
};

const LotRow: React.FC<LotItem & { onRemove?: () => void }> = ({
  lot,
  lotStatus,
  lotVariant,
  onRemove,
}) => {
  const attrs = (lot.attributes ?? {}) as Record<string, unknown>;
  const attrEntries = Object.entries(attrs).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  return (
    <div className="hover:bg-muted/30 px-3 py-2 transition-colors">
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate font-mono text-xs font-medium">
          {lot.code}
        </span>
        {lotVariant && (
          <Badge variant="secondary" className="text-[10px]">
            {lotVariant.name}
          </Badge>
        )}
        {lotStatus && (
          <Badge variant="outline" className="text-[10px]">
            {lotStatus.name}
          </Badge>
        )}
        <button
          type="button"
          onClick={onRemove}
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
};

const UnknownRow: React.FC<UnknownItem & { onRemove: () => void }> = ({
  code,
  onRemove,
}) => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-sm">
      <span className="flex-1 truncate font-mono text-xs">{code}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground shrink-0 rounded p-0.5 transition-colors"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
};

export function ScannedItemsList(props: ScannedItemsListProps) {
  const { items, ctx, onRemove } = props;

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );
  const toggleGroup = (typeId: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev);
      newSet.has(typeId) ? newSet.delete(typeId) : newSet.add(typeId);
      return newSet;
    });
  };

  const { lotTypes, unknowns } = ctx;
  const groupLots = _.chain(ctx.lots)
    .groupBy((l) => l.lot.lotTypeId)
    .entries()
    .value();
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
        {lotTypes.map((lotType) => (
          <LotTypeRow
            key={lotType.lotType.id}
            {...lotType}
            onRemove={() => onRemove(lotType.code)}
          />
        ))}

        {/* Unrecognized codes */}
        {ctx.unknowns.length > 0 && (
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
                <UnknownRow
                  key={u.code}
                  {...u}
                  onRemove={() => onRemove(u.code)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Locations */}
        {/* {locations.length > 0 && (
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
        )} */}

        {groupLots.map(([typeId, lots]) => {
          const lotType = lots[0]?.lotType;
          if (!lotType) return null;
          const isCollapsed = collapsedGroups.has(typeId);
          return (
            <div
              key={typeId}
              className="border-border overflow-hidden rounded-lg border"
            >
              <button
                className="hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-2 text-left transition-colors"
                onClick={() => toggleGroup(typeId)}
              >
                {isCollapsed ? (
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                ) : (
                  <ChevronDown className="text-muted-foreground size-4 shrink-0" />
                )}
                <Icon
                  icon={lotType.icon}
                  className="text-muted-foreground size-4 shrink-0"
                />

                <span className="flex-1 text-sm font-medium">
                  {lotType.name}
                </span>

                <Badge variant="secondary" className="text-xs">
                  {lots.length}
                </Badge>
              </button>

              {!isCollapsed && (
                <div className="border-border divide-border divide-y border-t">
                  {lots.map((lot) => (
                    <LotRow
                      key={lot.code}
                      {...lot}
                      onRemove={() => onRemove(lot.code)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Lot groups */}
        {/* {[...groupLots.entries()].map(([typeId, { typeName, entries }]) => {
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
        })} */}
      </div>
    </div>
  );
}
