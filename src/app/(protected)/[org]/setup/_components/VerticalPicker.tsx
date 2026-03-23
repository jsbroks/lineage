"use client";

import {
  Sprout,
  Wheat,
  Factory,
  Beaker,
  Box,
  type LucideIcon,
} from "lucide-react";
import type { VerticalDefinition } from "~/verticals/types";

const ICON_MAP: Record<string, LucideIcon> = {
  sprout: Sprout,
  wheat: Wheat,
  factory: Factory,
  beaker: Beaker,
  box: Box,
};

const VerticalCard: React.FC<{
  vertical: VerticalDefinition;
  onSelect: (key: string) => void;
}> = ({ vertical, onSelect }) => {
  const Icon = ICON_MAP[vertical.icon] ?? Sprout;
  return (
    <button
      type="button"
      onClick={() => onSelect(vertical.key)}
      className="border-border hover:border-primary hover:bg-primary/5 flex items-start gap-4 rounded-lg border p-5 text-left transition-all"
    >
      <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-sm font-medium">{vertical.name}</div>
        <div className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {vertical.description}
        </div>
      </div>
    </button>
  );
};

export function VerticalPicker({
  verticals,
  onSelect,
}: {
  verticals: VerticalDefinition[];
  onSelect: (key: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">
          What kind of operation do you run?
        </h2>
        <p className="text-muted-foreground text-sm">
          Choose a template to pre-populate your lot types, activities, and
          locations. You can customize everything afterwards.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {verticals.map((v) => (
          <VerticalCard key={v.key} vertical={v} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
