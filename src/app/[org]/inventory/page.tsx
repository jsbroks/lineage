"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Package2, Plus } from "lucide-react";

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
import { Icon } from "~/app/_components/IconPicker";
import { cn } from "~/lib/utils";
import { Colors, getColorClasses } from "~/app/_components/ColorSelector";

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
                <TableHead>Asset</TableHead>
                <TableCell className="text-center">Prepared</TableCell>
                <TableCell className="text-center">Active</TableCell>
                <TableCell className="text-center">Completed</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const key = `${row.itemTypeId}::${row.variantId ?? "_"}`;

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
                        <div
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded",
                            getColorClasses(row.itemTypeColor).bg,
                            getColorClasses(row.itemTypeColor).text,
                          )}
                          style={
                            row.itemTypeColor
                              ? { backgroundColor: row.itemTypeColor + "20" }
                              : undefined
                          }
                        >
                          <Icon icon={row.itemTypeIcon} className="size-4" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/${params.org}/inventory/type/${row.itemTypeId}`}
                            className="hover:text-primary font-medium underline-offset-4 hover:underline"
                          >
                            {row.itemTypeName}
                          </Link>
                          {row.variantName && (
                            <>
                              <ArrowRight className="text-muted-foreground size-2" />
                              <Badge
                                variant="secondary"
                                className="px-2 py-3 text-xs"
                              >
                                {row.variantName}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{row.prepared}</TableCell>
                    <TableCell className="text-center">{row.active}</TableCell>
                    <TableCell className="text-center">{row.completed}</TableCell>
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
