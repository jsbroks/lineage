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
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { StatusRow } from "./LotTypeForm";

const CATEGORY_LABELS: Record<StatusRow["category"], string> = {
  unstarted: "Unstarted",
  in_progress: "In Progress",
  done: "Done",
  canceled: "Canceled",
};

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
              Define the stages for this product.
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
                <Select
                  value={s.category}
                  onValueChange={(val) =>
                    onUpdate(idx, {
                      category: val as StatusRow["category"],
                    })
                  }
                >
                  <SelectTrigger className="w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(CATEGORY_LABELS) as [
                        StatusRow["category"],
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
