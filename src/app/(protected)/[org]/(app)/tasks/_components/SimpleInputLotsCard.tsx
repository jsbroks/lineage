"use client";

import { Plus, Trash2, X } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import type { InputRow } from "./OperationTypeForm";

type SimpleInputLotsCardProps = {
  inputLots: InputRow[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, patch: Partial<InputRow>) => void;
};

export function SimpleInputLotsCard({
  inputLots,
  onAdd,
  onRemove,
  onUpdate,
}: SimpleInputLotsCardProps) {
  const { data: lotTypesWithStatuses = [] } =
    api.lotType.listWithStatuses.useQuery();

  const handleLotTypeChange = (idx: number, lotTypeId: string) => {
    const match = lotTypesWithStatuses.find((t) => t.id === lotTypeId);
    onUpdate(idx, {
      lotTypeId,
      referenceKey: match?.name ?? "",
      preconditionsStatuses: [],
    });
  };

  const toggleStatus = (idx: number, row: InputRow, statusName: string) => {
    const current = row.preconditionsStatuses ?? [];
    const next = current.includes(statusName)
      ? current.filter((s) => s !== statusName)
      : [...current, statusName];
    onUpdate(idx, { preconditionsStatuses: next });
  };

  const handleAdd = () => {
    onAdd();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>When scanning...</CardTitle>
            <CardDescription>
              Which products does this activity operate on?
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
            <Plus className="mr-1 size-3.5" /> Add product
          </Button>
        </div>
      </CardHeader>
      {inputLots.length > 0 && (
        <CardContent className="space-y-4">
          {inputLots.map((row, idx) => {
            const selectedType = lotTypesWithStatuses.find(
              (t) => t.id === row.lotTypeId,
            );
            const availableStatuses = selectedType?.statuses ?? [];

            return (
              <div key={idx} className="space-y-3 rounded-md border p-3">
                <div className="flex items-start gap-3">
                  <div className="flex flex-1 flex-wrap items-center gap-3">
                    <div className="min-w-[180px] flex-1 space-y-1">
                      <Label className="text-xs">Product</Label>
                      <Select
                        value={row.lotTypeId ?? undefined}
                        onValueChange={(val) => handleLotTypeChange(idx, val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product..." />
                        </SelectTrigger>
                        <SelectContent>
                          {lotTypesWithStatuses.map((it) => (
                            <SelectItem key={it.id} value={it.id}>
                              {it.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive mt-5 size-8 shrink-0 p-0"
                    onClick={() => onRemove(idx)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                {availableStatuses.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Must be in status</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {availableStatuses.map((s) => {
                        const selected = (
                          row.preconditionsStatuses ?? []
                        ).includes(s.name);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleStatus(idx, row, s.name)}
                            className="focus-visible:ring-ring/50 rounded-md focus-visible:ring-2 focus-visible:outline-none"
                          >
                            <Badge
                              variant={selected ? "default" : "outline"}
                              className="cursor-pointer select-none"
                            >
                              {s.name}
                              {selected && <X className="ml-0.5 size-2.5" />}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                    {(row.preconditionsStatuses ?? []).length === 0 && (
                      <p className="text-muted-foreground text-xs">
                        Any status accepted
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-20 space-y-1">
                    <Label className="text-xs">Min Qty</Label>
                    <Input
                      value={row.qtyMin ?? "1"}
                      onChange={(e) =>
                        onUpdate(idx, { qtyMin: e.target.value })
                      }
                      placeholder="1"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="w-20 space-y-1">
                    <Label className="text-xs">Max Qty</Label>
                    <Input
                      value={row.qtyMax ?? ""}
                      onChange={(e) =>
                        onUpdate(idx, { qtyMax: e.target.value })
                      }
                      placeholder="∞"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
