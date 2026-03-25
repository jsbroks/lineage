"use client";

import type { FC } from "react";
import { MoreHorizontal, Settings2 } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Label } from "~/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";

export type VariantRow = {
  id?: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  defaultUnitCost: string;
  defaultQuantity: string;
  defaultQuantityUnit: string;
};

type GeneratedVariantsProps = {
  variants: VariantRow[];
  expandedVariant: string | null;
  onExpandVariant: (name: string | null) => void;
  onUpdateVariant: (idx: number, patch: Partial<VariantRow>) => void;
};

export const GeneratedVariants: FC<GeneratedVariantsProps> = ({
  variants,
  onUpdateVariant,
}) => {
  if (variants.length === 0) return null;

  return (
    <div className="space-y-2">
      <div>
        <Label>Variants</Label>
        <p className="text-muted-foreground text-xs">
          These are all the possible variant items based on the options and
          values listed above.
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Item</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Unit Cost</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Qty Unit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((v, idx) => (
              <TableRow key={v.name}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Settings2 className="text-muted-foreground/60 size-4 shrink-0" />
                    <span className="font-medium">{v.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground">SKU</span>
                </TableCell>
                <TableCell>
                  <input
                    type="number"
                    value={v.defaultUnitCost}
                    onChange={(e) =>
                      onUpdateVariant(idx, {
                        defaultUnitCost: e.target.value,
                      })
                    }
                    placeholder="0"
                    className="text-muted-foreground focus:text-foreground w-20 bg-transparent text-sm outline-none placeholder:text-current"
                  />
                </TableCell>
                <TableCell>
                  <input
                    type="number"
                    value={v.defaultQuantity}
                    onChange={(e) =>
                      onUpdateVariant(idx, {
                        defaultQuantity: e.target.value,
                      })
                    }
                    placeholder="0"
                    className="text-muted-foreground focus:text-foreground w-20 bg-transparent text-sm outline-none placeholder:text-current"
                  />
                </TableCell>
                <TableCell>
                  <input
                    value={v.defaultQuantityUnit}
                    onChange={(e) =>
                      onUpdateVariant(idx, {
                        defaultQuantityUnit: e.target.value,
                      })
                    }
                    placeholder="—"
                    className="text-muted-foreground focus:text-foreground w-20 bg-transparent text-sm outline-none placeholder:text-current"
                  />
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(
                      v.isActive
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {v.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          onUpdateVariant(idx, { isDefault: true })
                        }
                        disabled={v.isDefault}
                      >
                        Set as default
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          onUpdateVariant(idx, { isActive: !v.isActive })
                        }
                      >
                        {v.isActive ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
