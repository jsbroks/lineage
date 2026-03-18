"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Package2, Plus } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { SidebarTrigger } from "~/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/react";

export default function InventoryPage() {
  const params = useParams<{ org: string }>();
  const { data: rows = [], isLoading } =
    api.itemType.inventoryOverview.useQuery();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allKeys = rows.map((r) => `${r.itemTypeId}::${r.variantId ?? "_"}`);
  const allSelected =
    allKeys.length > 0 && allKeys.every((k) => selected.has(k));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allKeys));
    }
  };

  const toggleRow = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  let prevItemTypeId: string | null = null;

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">Inventory</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Export
          </Button>
          <Button variant="outline" size="sm">
            Import
          </Button>
          <Button size="sm" asChild>
            <Link href={`/${params.org}/inventory/type/new`}>
              <Plus className="mr-1 size-3.5" /> New type
            </Link>
          </Button>
        </div>
      </header>

      <div className="border-b px-6">
        <div className="flex items-center gap-2 py-2">
          <Button variant="secondary" size="sm" className="h-7 text-xs">
            All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-7 text-xs"
          >
            +
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
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
                <TableHead className="w-10 pl-4">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>
                  Product
                  <span className="text-muted-foreground ml-0.5 inline-block align-middle text-[10px]">
                    &#x25B4;&#x25BE;
                  </span>
                </TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-center">Unavailable</TableHead>
                <TableHead className="text-center">Committed</TableHead>
                <TableHead className="w-28">Available</TableHead>
                <TableHead className="w-28">On hand</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const key = `${row.itemTypeId}::${row.variantId ?? "_"}`;
                const showName = row.itemTypeId !== prevItemTypeId;
                prevItemTypeId = row.itemTypeId;

                return (
                  <TableRow
                    key={key}
                    data-state={selected.has(key) ? "selected" : undefined}
                  >
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={selected.has(key)}
                        onCheckedChange={() => toggleRow(key)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        {showName ? (
                          <div
                            className="bg-muted flex size-8 shrink-0 items-center justify-center rounded"
                            style={
                              row.itemTypeColor
                                ? { backgroundColor: row.itemTypeColor + "20" }
                                : undefined
                            }
                          >
                            <Package2
                              className="text-muted-foreground size-4"
                              style={
                                row.itemTypeColor
                                  ? { color: row.itemTypeColor }
                                  : undefined
                              }
                            />
                          </div>
                        ) : (
                          <div className="size-8 shrink-0" />
                        )}
                        <div className="flex items-center gap-2">
                          {showName && (
                            <Link
                              href={`/${params.org}/inventory/type/${row.itemTypeId}`}
                              className="hover:text-primary font-medium underline-offset-4 hover:underline"
                            >
                              {row.itemTypeName}
                            </Link>
                          )}
                          {row.variantName && (
                            <Badge variant="secondary" className="text-[11px]">
                              {row.variantName}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.sku ?? "No SKU"}
                    </TableCell>
                    <TableCell className="text-center">0</TableCell>
                    <TableCell className="text-center">0</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.onHand}
                        readOnly
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.onHand}
                        readOnly
                        className="h-8 w-20"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
