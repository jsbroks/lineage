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
import type { InputItemRow } from "./OperationTypeForm";

type SimpleInputItemsCardProps = {
  inputItems: InputItemRow[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, patch: Partial<InputItemRow>) => void;
};

export function SimpleInputItemsCard({
  inputItems,
  onAdd,
  onRemove,
  onUpdate,
}: SimpleInputItemsCardProps) {
  const { data: itemTypesWithStatuses = [] } =
    api.itemType.listWithStatuses.useQuery();

  const handleItemTypeChange = (idx: number, itemTypeId: string) => {
    const match = itemTypesWithStatuses.find((t) => t.id === itemTypeId);
    onUpdate(idx, {
      itemTypeId,
      referenceKey: match?.name ?? "",
      preconditionsStatuses: [],
    });
  };

  const toggleStatus = (idx: number, item: InputItemRow, statusName: string) => {
    const current = item.preconditionsStatuses;
    const next = current.includes(statusName)
      ? current.filter((s) => s !== statusName)
      : [...current, statusName];
    onUpdate(idx, { preconditionsStatuses: next });
  };

  const handleAdd = () => {
    onAdd();
    // The parent adds a blank row; we rely on the user picking an item type
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>When scanning...</CardTitle>
            <CardDescription>
              Which item types does this task operate on?
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
          >
            <Plus className="mr-1 size-3.5" /> Add item type
          </Button>
        </div>
      </CardHeader>
      {inputItems.length > 0 && (
        <CardContent className="space-y-4">
          {inputItems.map((item, idx) => {
            const selectedType = itemTypesWithStatuses.find(
              (t) => t.id === item.itemTypeId,
            );
            const availableStatuses = selectedType?.statuses ?? [];

            return (
              <div key={idx} className="space-y-3 rounded-md border p-3">
                <div className="flex items-start gap-3">
                  <div className="flex flex-1 flex-wrap items-center gap-3">
                    <div className="min-w-[180px] flex-1 space-y-1">
                      <Label className="text-xs">Item Type</Label>
                      <Select
                        value={item.itemTypeId || undefined}
                        onValueChange={(val) =>
                          handleItemTypeChange(idx, val)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item type..." />
                        </SelectTrigger>
                        <SelectContent>
                          {itemTypesWithStatuses.map((it) => (
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
                    <Label className="text-xs">
                      Must be in status
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {availableStatuses.map((s) => {
                        const selected =
                          item.preconditionsStatuses.includes(s.name);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleStatus(idx, item, s.name)}
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
                    {item.preconditionsStatuses.length === 0 && (
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
                      value={item.qtyMin}
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
                      value={item.qtyMax}
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
