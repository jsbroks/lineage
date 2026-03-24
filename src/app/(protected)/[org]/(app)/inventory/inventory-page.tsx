"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, Printer } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { LotTypeDialog } from "./product/[typeId]/_components/LotTypeDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/react";
import { Icon } from "~/app/_components/IconPicker";
import { cn } from "~/lib/utils";
import { getColorClasses } from "~/app/_components/ColorSelector";

export default function InventoryPage() {
  const params = useParams<{ org: string }>();
  const { data: rows = [], isLoading } =
    api.lotType.inventoryOverview.useQuery();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<{
    id: string;
    name: string;
  } | null>(null);

  return (
    <>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">Inventory</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${params.org}/inventory/print`}>
              <Printer className="mr-1 size-3.5" /> Print Labels
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/${params.org}/inventory/product/new`}>
              <Plus className="mr-1 size-3.5" /> New type
            </Link>
          </Button>
        </div>
      </header>

      <div>
        {isLoading ? (
          <div className="text-muted-foreground px-6 py-12 text-center text-sm">
            Loading inventory...
          </div>
        ) : rows.length === 0 ? (
          <div className="text-muted-foreground px-6 py-12 text-center text-sm">
            No item types configured yet. Add categories in Settings to get
            started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead className="text-center">Prepared</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const key = `${row.lotTypeId}::${row.variantId ?? "_"}`;
                const isVariantRow = !!row.variantName;
                const isUnassigned = row.variantId === "_unassigned";

                return (
                  <TableRow
                    key={key}
                    className={isVariantRow ? "text-muted-foreground" : ""}
                  >
                    <TableCell>
                      <div
                        className={cn(
                          "flex items-center gap-2.5",
                          isVariantRow && "pl-10",
                        )}
                      >
                        {!isVariantRow && (
                          <div
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded",
                              getColorClasses(row.lotTypeColor).bg,
                              getColorClasses(row.lotTypeColor).text,
                            )}
                            style={
                              row.lotTypeColor
                                ? {
                                    backgroundColor: row.lotTypeColor + "20",
                                  }
                                : undefined
                            }
                          >
                            <Icon icon={row.lotTypeIcon} className="size-4" />
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {isVariantRow ? (
                            <Badge
                              variant={isUnassigned ? "outline" : "secondary"}
                              className={cn(
                                "px-2 py-0.5 text-xs",
                                isUnassigned && "italic",
                              )}
                            >
                              {row.variantName}
                            </Badge>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedType({
                                  id: row.lotTypeId,
                                  name: row.lotTypeName,
                                });
                                setDialogOpen(true);
                              }}
                              className="hover:text-primary font-medium underline-offset-4 hover:underline"
                            >
                              {row.lotTypeName}
                            </button>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {row.prepared || "–"}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.active || "–"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.totalQuantity
                        ? `${Number(row.totalQuantity).toLocaleString()} ${row.quantityUnit ?? ""}`.trim()
                        : "–"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.totalCost
                        ? `$${(row.totalCost / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : "–"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <LotTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        name={selectedType?.name}
      />
    </>
  );
}
