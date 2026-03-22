import { X } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import type { LotWithType } from "../_workflows/types";

interface ScannedLotRowProps {
  entry: LotWithType;
  onRemove: () => void;
}

export function ScannedLotRow({ entry, onRemove }: ScannedLotRowProps) {
  const { lot, status, variant } = entry;
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
}
