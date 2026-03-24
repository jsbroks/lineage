"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Pencil, Plus, Star, Trash2 } from "lucide-react";

import { Badge } from "~/components/ui/badge";
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
import { Checkbox } from "~/components/ui/checkbox";
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

// ---------------------------------------------------------------------------
// Price List Form Dialog
// ---------------------------------------------------------------------------

type PriceListFormState = {
  name: string;
  description: string;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
};

const EMPTY_FORM: PriceListFormState = {
  name: "",
  description: "",
  currency: "CAD",
  isDefault: false,
  isActive: true,
};

type PriceListRow = {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
};

function PriceListDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: PriceListRow | null;
}) {
  const utils = api.useUtils();
  const [form, setForm] = useState<PriceListFormState>(EMPTY_FORM);
  const isEditing = !!editing;

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
    } else if (editing) {
      setForm({
        name: editing.name,
        description: editing.description ?? "",
        currency: editing.currency,
        isDefault: editing.isDefault,
        isActive: editing.isActive,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, editing]);

  const createMutation = api.priceList.create.useMutation({
    onSuccess: async () => {
      await utils.priceList.list.invalidate();
      onOpenChange(false);
    },
  });

  const updateMutation = api.priceList.update.useMutation({
    onSuccess: async () => {
      await utils.priceList.list.invalidate();
      onOpenChange(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      currency: form.currency.trim() || "CAD",
      isDefault: form.isDefault,
      isActive: form.isActive,
    };
    if (isEditing && editing) {
      updateMutation.mutate({ id: editing.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Price List" : "New Price List"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this price list's details."
              : "Create a new pricing channel for your products."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pl-name">Name</Label>
            <Input
              id="pl-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              placeholder='e.g. "Wholesale", "Farmers Market"'
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pl-desc">Description</Label>
            <Input
              id="pl-desc"
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Optional description"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pl-currency">Currency</Label>
            <Input
              id="pl-currency"
              value={form.currency}
              onChange={(e) =>
                setForm((p) => ({ ...p, currency: e.target.value }))
              }
              placeholder="CAD"
              className="w-24"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="pl-default"
                checked={form.isDefault}
                onCheckedChange={(checked) =>
                  setForm((p) => ({ ...p, isDefault: !!checked }))
                }
              />
              <Label htmlFor="pl-default" className="text-sm">
                Default price list
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="pl-active"
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((p) => ({ ...p, isActive: !!checked }))
                }
              />
              <Label htmlFor="pl-active" className="text-sm">
                Active
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !form.name.trim()}>
              {isSaving ? "Saving..." : isEditing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Entry Editor — lot types × variants with inline unit prices
// ---------------------------------------------------------------------------

type EntryDraft = {
  lotTypeId: string;
  variantId: string | null;
  unitPrice: string;
};

function EntryEditor({ priceListId }: { priceListId: string }) {
  const utils = api.useUtils();
  const { data, isLoading } = api.priceList.getById.useQuery({
    id: priceListId,
  });
  const { data: lotTypes = [] } = api.lotType.listWithStatuses.useQuery();

  const setEntriesMutation = api.priceList.setEntries.useMutation({
    onSuccess: async () => {
      await utils.priceList.getById.invalidate({ id: priceListId });
    },
  });

  const [drafts, setDrafts] = useState<EntryDraft[]>([]);
  const [initialized, setInitialized] = useState(false);

  const { data: allVariants = [] } = api.lotType.inventoryOverview.useQuery();

  const variantsByType = useMemo(() => {
    const map = new Map<string, { id: string; name: string }[]>();
    for (const row of allVariants) {
      if (row.variantId && row.variantId !== "_unassigned" && row.variantName) {
        const list = map.get(row.lotTypeId) ?? [];
        if (!list.some((v) => v.id === row.variantId)) {
          list.push({ id: row.variantId, name: row.variantName });
        }
        map.set(row.lotTypeId, list);
      }
    }
    return map;
  }, [allVariants]);

  useEffect(() => {
    if (!data || initialized) return;
    const entryDrafts: EntryDraft[] = [];
    for (const lt of lotTypes) {
      const vars = variantsByType.get(lt.id) ?? [];
      if (vars.length === 0) {
        const existing = data.entries.find(
          (e) => e.lotTypeId === lt.id && !e.variantId,
        );
        entryDrafts.push({
          lotTypeId: lt.id,
          variantId: null,
          unitPrice: existing ? String(existing.unitPrice) : "",
        });
      } else {
        const baseEntry = data.entries.find(
          (e) => e.lotTypeId === lt.id && !e.variantId,
        );
        entryDrafts.push({
          lotTypeId: lt.id,
          variantId: null,
          unitPrice: baseEntry ? String(baseEntry.unitPrice) : "",
        });
        for (const v of vars) {
          const existing = data.entries.find(
            (e) => e.lotTypeId === lt.id && e.variantId === v.id,
          );
          entryDrafts.push({
            lotTypeId: lt.id,
            variantId: v.id,
            unitPrice: existing ? String(existing.unitPrice) : "",
          });
        }
      }
    }
    setDrafts(entryDrafts);
    setInitialized(true);
  }, [data, lotTypes, variantsByType, initialized]);

  const handleSave = () => {
    const entries = drafts
      .filter((d) => d.unitPrice.trim() !== "")
      .map((d) => ({
        lotTypeId: d.lotTypeId,
        variantId: d.variantId,
        unitPrice: parseInt(d.unitPrice, 10) || 0,
      }));
    setEntriesMutation.mutate({ priceListId, entries });
  };

  const updateDraft = (idx: number, unitPrice: string) => {
    setDrafts((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, unitPrice } : d)),
    );
  };

  if (isLoading || !data) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        Loading entries...
      </p>
    );
  }

  const lotTypeMap = new Map(lotTypes.map((lt) => [lt.id, lt]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Set unit prices (in cents) for each product.{" "}
          {data.priceList.currency && (
            <span className="font-medium">{data.priceList.currency}</span>
          )}
        </p>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={setEntriesMutation.isPending}
        >
          <Check className="mr-1 size-3.5" />
          {setEntriesMutation.isPending ? "Saving..." : "Save Prices"}
        </Button>
      </div>

      {lotTypes.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No products yet. Create some in Inventory first.
        </p>
      ) : (
        <div className="overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Variety</TableHead>
                <TableHead className="w-40">Unit Price (cents)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drafts.map((draft, idx) => {
                const lt = lotTypeMap.get(draft.lotTypeId);
                const vars = variantsByType.get(draft.lotTypeId) ?? [];
                const variant = draft.variantId
                  ? vars.find((v) => v.id === draft.variantId)
                  : null;
                const isVariantRow = !!draft.variantId;

                return (
                  <TableRow
                    key={`${draft.lotTypeId}-${draft.variantId ?? "base"}`}
                  >
                    <TableCell
                      className={
                        isVariantRow
                          ? "text-muted-foreground pl-8"
                          : "font-medium"
                      }
                    >
                      {isVariantRow ? "" : (lt?.name ?? draft.lotTypeId)}
                    </TableCell>
                    <TableCell>
                      {variant ? (
                        <Badge variant="secondary" className="text-xs">
                          {variant.name}
                        </Badge>
                      ) : isVariantRow ? (
                        ""
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          Base
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8 w-32 text-sm tabular-nums"
                        placeholder="0"
                        value={draft.unitPrice}
                        onChange={(e) => updateDraft(idx, e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function PricingSettingsPage() {
  const { data: priceLists = [], isLoading } = api.priceList.list.useQuery();
  const utils = api.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PriceListRow | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const deleteMutation = api.priceList.delete.useMutation({
    onSuccess: async () => {
      await utils.priceList.list.invalidate();
      if (selectedId) setSelectedId(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (pl: PriceListRow) => {
    setEditing(pl);
    setDialogOpen(true);
  };

  if (selectedId) {
    const pl = priceLists.find((p) => p.id === selectedId);
    return (
      <div className="flex min-h-full flex-col">
        <header className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedId(null)}
            >
              <ArrowLeft className="mr-1 size-3.5" />
              Back
            </Button>
            <h1 className="text-lg font-semibold">
              {pl?.name ?? "Price List"}
            </h1>
            {pl?.isDefault && (
              <Badge variant="secondary" className="gap-1">
                <Star className="size-3" />
                Default
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {pl && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(pl)}
                >
                  <Pencil className="mr-1 size-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    deleteMutation.mutate({ id: pl.id });
                  }}
                >
                  <Trash2 className="mr-1 size-3.5" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-4xl">
            <EntryEditor priceListId={selectedId} />
          </div>
        </div>

        <PriceListDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editing={editing}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">Pricing</h1>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 size-3.5" /> New Price List
        </Button>
      </header>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="text-muted-foreground px-6 py-12 text-center text-sm">
            Loading price lists...
          </div>
        ) : priceLists.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div>
              <p className="text-sm font-medium">No price lists yet</p>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                Price lists let you define different pricing channels — e.g.
                Wholesale, Farmers Market, Retail — each with its own unit
                prices per product.
              </p>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1 size-3.5" /> Create your first price list
            </Button>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceLists.map((pl) => (
                  <TableRow key={pl.id}>
                    <TableCell>
                      <button
                        type="button"
                        className="hover:text-primary flex items-center gap-2 font-medium underline-offset-4 hover:underline"
                        onClick={() => setSelectedId(pl.id)}
                      >
                        {pl.name}
                        {pl.isDefault && (
                          <Star className="size-3.5 fill-amber-500 text-amber-500" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {pl.currency}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={pl.isActive ? "secondary" : "outline"}>
                        {pl.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground rounded p-1"
                          onClick={() => openEdit(pl)}
                          title="Edit"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive rounded p-1"
                          onClick={() => deleteMutation.mutate({ id: pl.id })}
                          disabled={deleteMutation.isPending}
                          title="Delete"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <PriceListDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />
    </div>
  );
}
