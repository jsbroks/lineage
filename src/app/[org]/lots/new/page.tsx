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

type LotFormState = {
  itemTypeId: string;
  lotCode: string;
  useSequence: boolean;
  status: string;
  uom: string;
  locationId: string;
  notes: string;
  attributesText: string;
};

type SequenceFormState = {
  prefix: string;
  variantCode: string;
  nextNumber: string;
};

const EMPTY_FORM: LotFormState = {
  itemTypeId: "",
  lotCode: "",
  useSequence: true,
  status: "created",
  uom: "each",
  locationId: "",
  notes: "",
  attributesText: "{}",
};

const EMPTY_SEQUENCE_FORM: SequenceFormState = {
  prefix: "",
  variantCode: "_",
  nextNumber: "1",
};

export default function NewLotPage() {
  const utils = api.useUtils();
  const [form, setForm] = useState<LotFormState>(EMPTY_FORM);
  const [sequenceForm, setSequenceForm] =
    useState<SequenceFormState>(EMPTY_SEQUENCE_FORM);
  const [attributesError, setAttributesError] = useState<string | null>(null);
  const [sequenceError, setSequenceError] = useState<string | null>(null);

  const { data: itemTypes = [] } = api.itemType.list.useQuery();
  const { data: locations = [] } = api.location.list.useQuery();
  const { data: lots = [], isLoading: lotsLoading } = api.lot.list.useQuery();
  const { data: sequence, isLoading: sequenceLoading } =
    api.lot.getCodeSequence.useQuery(
      { itemTypeId: form.itemTypeId || "00000000-0000-0000-0000-000000000000" },
      { enabled: !!form.itemTypeId },
    );

  const createLot = api.lot.create.useMutation({
    onSuccess: async () => {
      await utils.lot.list.invalidate();
      if (form.itemTypeId) {
        await utils.lot.getCodeSequence.invalidate({
          itemTypeId: form.itemTypeId,
        });
      }
      setForm((prev) => ({
        ...EMPTY_FORM,
        itemTypeId: prev.itemTypeId,
        useSequence: prev.useSequence,
        locationId: prev.locationId,
      }));
      setAttributesError(null);
    },
  });

  const upsertSequence = api.lot.upsertCodeSequence.useMutation({
    onSuccess: async () => {
      if (!form.itemTypeId) return;
      await utils.lot.getCodeSequence.invalidate({
        itemTypeId: form.itemTypeId,
      });
      setSequenceError(null);
    },
  });

  useEffect(() => {
    if (!form.itemTypeId) return;
    if (!sequence) {
      setSequenceForm(EMPTY_SEQUENCE_FORM);
      return;
    }

    setSequenceForm({
      prefix: sequence.prefix,
      variantCode: sequence.variantCode,
      nextNumber: String(sequence.nextNumber),
    });
  }, [form.itemTypeId, sequence]);

  const previewLotCode = useMemo(() => {
    const nextNumber = Number(sequenceForm.nextNumber);
    if (!Number.isInteger(nextNumber) || nextNumber <= 0) return "";
    const paddedNumber = String(nextNumber).padStart(5, "0");
    if (sequenceForm.variantCode === "_") {
      return `${sequenceForm.prefix}-${paddedNumber}`;
    }
    return `${sequenceForm.prefix}-${sequenceForm.variantCode}-${paddedNumber}`;
  }, [sequenceForm.nextNumber, sequenceForm.prefix, sequenceForm.variantCode]);

  const url = window.location.origin;

  const handleCreateLot = async (event: React.FormEvent<HTMLFormElement>) => {
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

    await createLot.mutateAsync({
      hostname: url,
      itemTypeId: form.itemTypeId,
      lotCode: form.useSequence ? undefined : form.lotCode.trim(),
      useSequence: form.useSequence,
      status: form.status.trim() || "created",
      uom: form.uom.trim() || "each",
      locationId: form.locationId || null,
      notes: form.notes.trim() || null,
      attributes,
    });
  };

  const handleSaveSequence = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!form.itemTypeId) {
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
    if (!sequenceForm.variantCode.trim()) {
      setSequenceError("Variant code is required.");
      return;
    }

    await upsertSequence.mutateAsync({
      itemTypeId: form.itemTypeId,
      prefix: sequenceForm.prefix.trim(),
      variantCode: sequenceForm.variantCode.trim(),
      nextNumber,
    });
  };

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Create Lot</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manually create inventory lots and review recent lots.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent lots</CardTitle>
            <CardDescription>
              Open a lot to view events and lineage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lotsLoading ? (
              <p className="text-muted-foreground text-sm">Loading lots...</p>
            ) : lots.length === 0 ? (
              <p className="text-muted-foreground text-sm">No lots yet.</p>
            ) : (
              <div className="space-y-2">
                {lots.slice(0, 20).map((lot) => (
                  <Link
                    key={lot.id}
                    href={`${lot.id}`}
                    className="border-border hover:bg-muted block rounded-md border px-3 py-2"
                  >
                    <p className="font-medium">{lot.lotCode}</p>
                    <p className="text-muted-foreground text-xs">
                      Status: {lot.status}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lot code sequence</CardTitle>
            <CardDescription>
              Configure auto-generated lot codes for the selected item type.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSequence}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="seq-prefix">Name</FieldLabel>
                  <FieldContent>
                    <input
                      id="seq-prefix"
                      value={sequenceForm.prefix}
                      onChange={(e) =>
                        setSequenceForm((prev) => ({
                          ...prev,
                          prefix: e.target.value,
                        }))
                      }
                      className="border-input bg-background w-full rounded-md border px-3 py-2"
                      placeholder="mushroom"
                      disabled={!form.itemTypeId || sequenceLoading}
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="seq-variant">Variant code</FieldLabel>
                  <FieldContent>
                    <input
                      id="seq-variant"
                      value={sequenceForm.variantCode}
                      onChange={(e) =>
                        setSequenceForm((prev) => ({
                          ...prev,
                          variantCode: e.target.value,
                        }))
                      }
                      className="border-input bg-background w-full rounded-md border px-3 py-2"
                      placeholder="_"
                      disabled={!form.itemTypeId || sequenceLoading}
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="seq-next">Next number</FieldLabel>
                  <FieldContent>
                    <input
                      id="seq-next"
                      value={sequenceForm.nextNumber}
                      onChange={(e) =>
                        setSequenceForm((prev) => ({
                          ...prev,
                          nextNumber: e.target.value,
                        }))
                      }
                      className="border-input bg-background w-full rounded-md border px-3 py-2"
                      placeholder="1"
                      disabled={!form.itemTypeId || sequenceLoading}
                    />
                    <FieldDescription>
                      Preview: {previewLotCode || "Set name/var/next number"}
                    </FieldDescription>
                  </FieldContent>
                </Field>

                {sequenceError && (
                  <p className="text-destructive text-sm" role="alert">
                    {sequenceError}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={!form.itemTypeId || upsertSequence.isPending}
                >
                  {upsertSequence.isPending ? "Saving..." : "Save sequence"}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manual lot creation</CardTitle>
            <CardDescription>
              Create a lot without scanning an identifier.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateLot}>
              <FieldGroup>
                <Field>
                  <FieldLabel>Item type</FieldLabel>
                  <FieldContent>
                    <Select
                      value={form.itemTypeId}
                      onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, itemTypeId: value }))
                      }
                      disabled={itemTypes.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select item type" />
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
                  <FieldLabel htmlFor="lot-code">Lot code</FieldLabel>
                  <FieldContent>
                    <input
                      id="lot-code"
                      required={!form.useSequence}
                      value={form.useSequence ? previewLotCode : form.lotCode}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          lotCode: e.target.value,
                        }))
                      }
                      className="border-input bg-background w-full rounded-md border px-3 py-2"
                      placeholder={
                        form.useSequence
                          ? "Generated from sequence"
                          : "LOT-0001"
                      }
                      disabled={form.useSequence}
                    />
                    {form.useSequence && (
                      <FieldDescription>
                        Lot code is generated from the sequence and `nextNumber`
                        increments on create.
                      </FieldDescription>
                    )}
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="use-sequence">Use sequence</FieldLabel>
                  <FieldContent>
                    <input
                      id="use-sequence"
                      type="checkbox"
                      checked={form.useSequence}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          useSequence: e.target.checked,
                        }))
                      }
                      className="size-4"
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="lot-status">Status</FieldLabel>
                  <FieldContent>
                    <input
                      id="lot-status"
                      value={form.status}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, status: e.target.value }))
                      }
                      className="border-input bg-background w-full rounded-md border px-3 py-2"
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="lot-uom">UOM</FieldLabel>
                  <FieldContent>
                    <input
                      id="lot-uom"
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
                  <FieldLabel htmlFor="lot-notes">Notes</FieldLabel>
                  <FieldContent>
                    <textarea
                      id="lot-notes"
                      value={form.notes}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2"
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="lot-attributes">
                    Attributes (JSON)
                  </FieldLabel>
                  <FieldContent>
                    <textarea
                      id="lot-attributes"
                      value={form.attributesText}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          attributesText: e.target.value,
                        }))
                      }
                      className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 font-mono text-xs"
                    />
                    <FieldDescription>
                      Provide an object of additional properties for the lot.
                    </FieldDescription>
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
                    createLot.isPending ||
                    !form.itemTypeId ||
                    (form.useSequence && !previewLotCode)
                  }
                >
                  {createLot.isPending ? "Creating..." : "Create lot"}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
