"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { StatusRow, TransitionRow } from "./LotTypeForm";

type TransitionsCardProps = {
  statuses: StatusRow[];
  transitions: TransitionRow[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, patch: Partial<TransitionRow>) => void;
};

export function TransitionsCard({
  statuses,
  transitions,
  onAdd,
  onRemove,
  onUpdate,
}: TransitionsCardProps) {
  if (statuses.length < 2) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transitions</CardTitle>
            <CardDescription>Which status changes are allowed.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <Plus className="mr-1 size-3.5" /> Add transition
          </Button>
        </div>
      </CardHeader>
      {transitions.length > 0 && (
        <CardContent className="space-y-3">
          {transitions.map((t, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <Select
                value={t.fromSlug || undefined}
                onValueChange={(val) => onUpdate(idx, { fromSlug: val })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="From..." />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.name} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground text-sm">→</span>
              <Select
                value={t.toSlug || undefined}
                onValueChange={(val) => onUpdate(idx, { toSlug: val })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="To..." />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.name} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive size-8 p-0"
                onClick={() => onRemove(idx)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
