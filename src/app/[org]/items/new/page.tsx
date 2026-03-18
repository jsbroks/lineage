"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";

type ItemFormState = {
  itemTypeId: string;
  code: string;
  useSequence: boolean;
  status: string;
  uom: string;
  locationId: string;
  notes: string;
  attributesText: string;
};

type SequenceFormState = {
  prefix: string;
  nextNumber: string;
};

const EMPTY_FORM: ItemFormState = {
  itemTypeId: "",
  code: "",
  useSequence: true,
  status: "created",
  uom: "each",
  locationId: "",
  notes: "",
  attributesText: "{}",
};

const EMPTY_SEQUENCE_FORM: SequenceFormState = {
  prefix: "",
  nextNumber: "1",
};

export default function NewItemPage() {
  const utils = api.useUtils();
  const [form, setForm] = useState<ItemFormState>(EMPTY_FORM);
  const [sequenceForm, setSequenceForm] =
    useState<SequenceFormState>(EMPTY_SEQUENCE_FORM);
  const [attributesError, setAttributesError] = useState<string | null>(null);
  const [sequenceError, setSequenceError] = useState<string | null>(null);

  const { data: itemTypes = [] } = api.itemType.list.useQuery();
  const { data: locations = [] } = api.location.list.useQuery();
  const { data: items = [], isLoading: itemsLoading } =
    api.item.list.useQuery();

  const selectedItemType = useMemo(
    () => itemTypes.find((it) => it.id === form.itemTypeId) ?? null,
    [itemTypes, form.itemTypeId],
  );

  const createItem = api.item.create.useMutation({
    onSuccess: async () => {
      await utils.item.list.invalidate();
      await utils.itemType.list.invalidate();
      setForm((prev) => ({
        ...EMPTY_FORM,
        itemTypeId: prev.itemTypeId,
        useSequence: prev.useSequence,
        locationId: prev.locationId,
      }));
      setAttributesError(null);
    },
  });

  useEffect(() => {
    if (!form.itemTypeId || !selectedItemType) {
      setSequenceForm(EMPTY_SEQUENCE_FORM);
      return;
    }

    if (selectedItemType.codePrefix) {
      setSequenceForm({
        prefix: selectedItemType.codePrefix,
        nextNumber: String(selectedItemType.codeNextNumber),
      });
    } else {
      setSequenceForm(EMPTY_SEQUENCE_FORM);
    }
  }, [form.itemTypeId, selectedItemType]);

  const previewCode = useMemo(() => {
    const nextNumber = Number(sequenceForm.nextNumber);
    if (!sequenceForm.prefix || !Number.isInteger(nextNumber) || nextNumber <= 0) return "";
    const paddedNumber = String(nextNumber).padStart(5, "0");
    return `${sequenceForm.prefix}-${paddedNumber}`;
  }, [sequenceForm.nextNumber, sequenceForm.prefix]);

  const url = window.location.origin;

  const handleCreateItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let attributes: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(form.attributesText) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        attributes = parsed as Record<string, unknown>;
      } else {
        setAttributesError("Attributes must be a JSON object.");
        return;
      }
    } catch {
      setAttributesError("Attributes must be valid JSON.");
      return;
    }

    setAttributesError(null);

    await createItem.mutateAsync({
      hostname: url,
      itemTypeId: form.itemTypeId,
      code: form.useSequence ? undefined : form.code.trim(),
      useSequence: form.useSequence,
      status: form.status.trim() || "created",
      uom: form.uom.trim() || "each",
      locationId: form.locationId || null,
      notes: form.notes.trim() || null,
      attributes,
    });
  };

  const editItemType = api.itemType.edit.useMutation({
    onSuccess: async () => {
      await utils.itemType.list.invalidate();
      setSequenceError(null);
    },
  });

  const handleSaveSequence = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!form.itemTypeId || !selectedItemType) {
      setSequenceError("Select an item type before saving sequence settings.");
      return;
    }

    const nextNumber = Number(sequenceForm.nextNumber);
    if (!Number.isInteger(nextNumber) || nextNumber <= 0) {
      setSequenceError("Next number must be a positive integer.");
      return;
    }
    if (!sequenceForm.prefix.trim()) {
      setSequenceError("Prefix is required.");
      return;
    }

    await editItemType.mutateAsync({
      id: form.itemTypeId,
      slug: selectedItemType.slug,
      name: selectedItemType.name,
      category: selectedItemType.category,
      description: selectedItemType.description,
      defaultUom: selectedItemType.defaultUom,
      icon: selectedItemType.icon,
      color: selectedItemType.color,
      config: selectedItemType.config as Record<string, unknown>,
      codePrefix: sequenceForm.prefix.trim(),
      codeNextNumber: nextNumber,
    });
  };

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Add new items and review recent inventory.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent Items</CardTitle>
            <CardDescription>
              Open an item to view its history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itemsLoading ? (
              <p className="text-muted-foreground text-sm">Loading items...</p>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground text-sm">No items yet.</p>
            ) : (
              <div className="space-y-2">
                {items.slice(0, 20).map((item) => (
                  <Link
                    key={item.id}
                    href={`${item.id}`}
                    className="border-border hover:bg-muted block rounded-md border px-3 py-2"
                  >
                    <p className="font-medium">{item.code}</p>
                    <p className="text-muted-foreground text-xs">
                      Status: {item.status}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        

        <Card>
          <CardHeader>
            <CardTitle>Add New Item</CardTitle>
            <CardDescription>
              Create an item without scanning an identifier.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateItem}>
              <FieldGroup>
                <Field>
                  <FieldLabel>Category</FieldLabel>
                  <FieldContent>
                    <Select
                      value={form.itemTypeId}
                      onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, itemTypeId: value }))
                      }
                      disabled={itemTypes.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {itemTypes.map((itemType) => (
                          <SelectItem key={itemType.id} value={itemType.id}>
                            {itemType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="item-code">Tracking #</FieldLabel>
                  <FieldContent>
                    <input
                      id="item-code"
                      required={!form.useSequence}
                      value={form.useSequence ? previewCode : form.code}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          code: e.target.value,
                        }))
                      }
                      className="border-input bg-background w-full rounded-md border px-3 py-2"
                      placeholder={
                        form.useSequence
                          ? "Auto-generated"
                          : "ITEM-0001"
                      }
                      disabled={form.useSequence}
                    />
                    {form.useSequence && (
                      <FieldDescription>
                        Tracking number is auto-generated.
                      </FieldDescription>
                    )}
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="item-status">Status</FieldLabel>
                  <FieldContent>
                    <input
                      id="item-status"
                      value={form.status}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, status: e.target.value }))
                      }
                      className="border-input bg-background w-full rounded-md border px-3 py-2"
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="item-uom">Unit</FieldLabel>
                  <FieldContent>
                    <input
                      id="item-uom"
                      value={form.uom}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, uom: e.target.value }))
                      }
                      className="border-input bg-background w-full rounded-md border px-3 py-2"
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel>Location</FieldLabel>
                  <FieldContent>
                    <Select
                      value={form.locationId}
                      onValueChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          locationId: value === "none" ? "" : value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Optional location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="item-notes">Notes</FieldLabel>
                  <FieldContent>
                    <textarea
                      id="item-notes"
                      value={form.notes}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2"
                    />
                  </FieldContent>
                </Field>

                

                {attributesError && (
                  <p className="text-destructive text-sm" role="alert">
                    {attributesError}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={
                    createItem.isPending ||
                    !form.itemTypeId ||
                    (form.useSequence && !previewCode)
                  }
                >
                  {createItem.isPending ? "Creating..." : "Create item"}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
