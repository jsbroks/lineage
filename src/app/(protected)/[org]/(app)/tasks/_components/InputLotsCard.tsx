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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import type { InputRow } from "./OperationTypeForm";

type InputLotsCardProps = {
  inputLots: InputRow[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, patch: Partial<InputRow>) => void;
};

export function InputLotsCard({
  inputLots,
  onAdd,
  onRemove,
  onUpdate,
}: InputLotsCardProps) {
  const { data: lotTypes = [] } = api.lotType.list.useQuery();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Input Products</CardTitle>
            <CardDescription>
              Which products are scanned/selected when running this activity.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <Plus className="mr-1 size-3.5" /> Add lot
          </Button>
        </div>
      </CardHeader>
      {inputLots.length > 0 && (
        <CardContent className="space-y-4">
          {inputLots.map((row, idx) => (
            <div key={idx} className="space-y-3 rounded-md border p-3">
              <div className="flex items-start gap-3">
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <div className="min-w-[140px] flex-1 space-y-1">
                    <Label className="text-xs">Key</Label>
                    <Input
                      value={row.referenceKey}
                      onChange={(e) =>
                        onUpdate(idx, { referenceKey: e.target.value })
                      }
                      placeholder="mushroomBoxes"
                    />
                  </div>
                  <div className="min-w-[160px] flex-1 space-y-1">
                    <Label className="text-xs">Product</Label>
                    <Select
                      value={row.lotTypeId || undefined}
                      onValueChange={(val) => onUpdate(idx, { lotTypeId: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product..." />
                      </SelectTrigger>
                      <SelectContent>
                        {lotTypes.map((it) => (
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

              <div className="flex flex-wrap items-center gap-3">
                <div className="w-20 space-y-1">
                  <Label className="text-xs">Min Qty</Label>
                  <Input
                    value={row.qtyMin}
                    onChange={(e) => onUpdate(idx, { qtyMin: e.target.value })}
                    placeholder="0"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="w-20 space-y-1">
                  <Label className="text-xs">Max Qty</Label>
                  <Input
                    value={row.qtyMax}
                    onChange={(e) => onUpdate(idx, { qtyMax: e.target.value })}
                    placeholder="∞"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="min-w-[160px] flex-1 space-y-1">
                  <Label className="text-xs">Required Status</Label>
                  <Input
                    value={row.preconditionsStatuses.join(", ")}
                    onChange={(e) =>
                      onUpdate(idx, {
                        preconditionsStatuses: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Created, Approved"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
