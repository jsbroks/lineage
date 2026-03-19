"use client";

import Link from "next/link";
import { Circle, Search, Trash2 } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { ItemRow, StatusDef, VariantDef } from "./types";

interface ItemsTableProps {
  items: ItemRow[];
  itemsLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  variantFilter: string;
  onVariantFilterChange: (value: string) => void;
  statuses: StatusDef[];
  variants: VariantDef[];
  statusMap: Map<
    string,
    {
      name: string;
      color: string | null;
      isInitial: boolean;
      isTerminal: boolean;
    }
  >;
  selected: Set<string>;
  onSelectedChange: (selected: Set<string>) => void;
  onBulkStatusOpen: () => void;
  onBulkVariantOpen: () => void;
  onBulkDeleteOpen: () => void;
  org: string;
}

export const ItemsTable: React.FC<ItemsTableProps> = ({
  items,
  itemsLoading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  variantFilter,
  onVariantFilterChange,
  statuses,
  variants,
  statusMap,
  selected,
  onSelectedChange,
  onBulkStatusOpen,
  onBulkVariantOpen,
  onBulkDeleteOpen,
  org,
}) => {
  const allIds = items.map((i) => i.id);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id));

  const toggleAll = () => {
    onSelectedChange(allSelected ? new Set() : new Set(allIds));
  };

  const toggleRow = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-medium">Items</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <Input
                placeholder="Search by code..."
                className="h-8 w-48 pl-8 text-sm"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            {variants.length > 0 && (
              <Select
                value={variantFilter}
                onValueChange={onVariantFilterChange}
              >
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="All variants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All variants</SelectItem>
                  {variants.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="bg-muted/50 flex items-center gap-2 rounded-lg border px-3 py-2">
            <span className="text-sm font-medium">
              {selected.size} selected
            </span>
            <div className="border-border mx-1 h-4 border-l" />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={onBulkStatusOpen}
            >
              Change status
            </Button>
            {variants.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={onBulkVariantOpen}
              >
                Set variant
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 h-7 text-xs"
              onClick={onBulkDeleteOpen}
            >
              <Trash2 className="mr-1 size-3" />
              Delete
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onSelectedChange(new Set())}
            >
              Clear
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {itemsLoading ? (
          <div className="text-muted-foreground px-6 py-8 text-center text-sm">
            Loading items...
          </div>
        ) : items.length === 0 ? (
          <div className="text-muted-foreground px-6 py-8 text-center text-sm">
            No items found
            {statusFilter !== "all" || variantFilter !== "all" || search
              ? " matching your filters."
              : " for this item type yet."}
          </div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-4">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  {variants.length > 0 && <TableHead>Variant</TableHead>}
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => {
                  const sd = statusMap.get(row.status);
                  return (
                    <TableRow
                      key={row.id}
                      data-state={selected.has(row.id) ? "selected" : undefined}
                    >
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={selected.has(row.id)}
                          onCheckedChange={() => toggleRow(row.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">
                        <Link
                          href={`/${org}/inventory/item/${encodeURIComponent(row.code)}`}
                          className="hover:text-primary underline-offset-4 hover:underline"
                        >
                          {row.code}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Circle
                            className="size-2"
                            fill={sd?.color ?? "currentColor"}
                            stroke={sd?.color ?? "currentColor"}
                          />
                          <span className="text-sm">
                            {sd?.name ?? row.status}
                          </span>
                        </div>
                      </TableCell>
                      {variants.length > 0 && (
                        <TableCell>
                          {row.variantName ? (
                            <Badge variant="secondary" className="text-xs">
                              {row.variantName}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              —
                            </span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-sm">
                        {row.locationName ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {row.quantity} {row.quantityUom}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
