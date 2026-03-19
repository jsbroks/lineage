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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { StatusDef } from "./types";

interface BulkStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  statuses: StatusDef[];
  onConfirm: (status: string) => void;
  isPending: boolean;
}

export const BulkStatusDialog: React.FC<BulkStatusDialogProps> = ({
  open,
  onOpenChange,
  selectedCount,
  statuses,
  onConfirm,
  isPending,
}) => {
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    if (open) setNewStatus("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change status</DialogTitle>
          <DialogDescription>
            Update the status of {selectedCount} selected item
            {selectedCount > 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>
        <Select value={newStatus} onValueChange={setNewStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Select new status" />
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(newStatus)}
            disabled={!newStatus || isPending}
          >
            {isPending ? "Updating..." : "Update status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
