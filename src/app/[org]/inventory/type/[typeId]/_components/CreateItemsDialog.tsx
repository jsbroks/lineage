"use client";

import { useEffect, useState } from "react";
import { Circle } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { StatusDef, VariantDef } from "./Types";

interface CreateItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemTypeName: string;
  codePrefix: string | null;
  statuses: StatusDef[];
  variants: VariantDef[];
  onConfirm: (params: {
    count: number;
    variantId: string | null;
    status: string;
  }) => void;
  isPending: boolean;
  error?: string | null;
}

export const CreateItemsDialog: React.FC<CreateItemsDialogProps> = ({
  open,
  onOpenChange,
  itemTypeName,
  codePrefix,
  statuses,
  variants,
  onConfirm,
  isPending,
  error,
}) => {
  const [count, setCount] = useState("10");
  const [variant, setVariant] = useState("none");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (open) {
      setCount("10");
      setVariant("none");
      setStatus("");
    }
  }, [open]);

  const handleConfirm = () => {
    const cnt = parseInt(count, 10);
    if (!cnt || cnt < 1) return;
    const initialStatus = statuses.find((s) => s.isInitial);
    onConfirm({
      count: cnt,
      variantId: variant === "none" ? null : variant,
      status: status || initialStatus?.slug || "created",
    });
  };

  const parsedCount = parseInt(count, 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create items</DialogTitle>
          <DialogDescription>
            Batch-create new {itemTypeName} items using the auto-sequence
            {codePrefix ? ` (${codePrefix}-XXXXX)` : ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-count">How many?</Label>
            <Input
              id="create-count"
              type="number"
              min={1}
              max={1000}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              placeholder="10"
            />
            <p className="text-muted-foreground text-xs">
              Max 1,000 per batch.
            </p>
          </div>

          {variants.length > 0 && (
            <div className="space-y-2">
              <Label>Variant</Label>
              <Select value={variant} onValueChange={setVariant}>
                <SelectTrigger>
                  <SelectValue placeholder="No variant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {variants.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {statuses.length > 0 && (
            <div className="space-y-2">
              <Label>Initial status</Label>
              <Select
                value={status || statuses.find((s) => s.isInitial)?.slug || ""}
                onValueChange={setStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.slug} value={s.slug}>
                      <div className="flex items-center gap-2">
                        <Circle
                          className="size-2"
                          fill={s.color ?? "currentColor"}
                          stroke={s.color ?? "currentColor"}
                        />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!codePrefix && (
            <p className="text-destructive text-xs">
              This item type has no code prefix configured. Set one via
              &ldquo;Edit type&rdquo; before creating items with
              auto-sequencing.
            </p>
          )}

          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || !codePrefix || !count || parsedCount < 1}
          >
            {isPending ? "Creating..." : `Create ${parsedCount || 0} items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
