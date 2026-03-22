"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import type { StatusRow } from "./LotTypeForm";

type StatusesCardProps = {
  statuses: StatusRow[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, patch: Partial<StatusRow>) => void;
};

export function StatusesCard({
  statuses,
  onAdd,
  onRemove,
  onUpdate,
}: StatusesCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Statuses</CardTitle>
            <CardDescription>
              Define the lifecycle states for this lot type.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <Plus className="mr-1 size-3.5" /> Add status
          </Button>
        </div>
      </CardHeader>
      {statuses.length > 0 && (
        <CardContent className="space-y-3">
          {statuses.map((s, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-md border p-3"
            >
              <GripVertical className="text-muted-foreground mt-2.5 size-4 shrink-0" />
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <Input
                  value={s.name}
                  onChange={(e) => onUpdate(idx, { name: e.target.value })}
                  placeholder="Status name"
                  className="min-w-[140px] flex-1"
                />
                <Input
                  value={s.color}
                  onChange={(e) => onUpdate(idx, { color: e.target.value })}
                  placeholder="#color"
                  className="w-24"
                />
                <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                  <Checkbox
                    checked={s.isInitial}
                    onCheckedChange={(val) =>
                      onUpdate(idx, { isInitial: val === true })
                    }
                  />
                  Initial
                </label>
                <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                  <Checkbox
                    checked={s.isTerminal}
                    onCheckedChange={(val) =>
                      onUpdate(idx, { isTerminal: val === true })
                    }
                  />
                  Terminal
                </label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive mt-0.5 size-8 shrink-0 p-0"
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
