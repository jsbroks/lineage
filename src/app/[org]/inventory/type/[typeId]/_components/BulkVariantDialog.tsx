"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { VariantDef } from "./Types";

interface BulkVariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  variants: VariantDef[];
  onConfirm: (variantId: string | null) => void;
  isPending: boolean;
}

export const BulkVariantDialog: React.FC<BulkVariantDialogProps> = ({
  open,
  onOpenChange,
  selectedCount,
  variants,
  onConfirm,
  isPending,
}) => {
  const [newVariant, setNewVariant] = useState("");

  useEffect(() => {
    if (open) setNewVariant("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set variant</DialogTitle>
          <DialogDescription>
            Assign a variant to {selectedCount} selected item
            {selectedCount > 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>
        <Select value={newVariant} onValueChange={setNewVariant}>
          <SelectTrigger>
            <SelectValue placeholder="Select variant" />
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(newVariant === "none" ? null : newVariant)}
            disabled={!newVariant || isPending}
          >
            {isPending ? "Updating..." : "Set variant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
