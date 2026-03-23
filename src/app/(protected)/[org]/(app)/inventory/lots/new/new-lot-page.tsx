"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
  lotTypeId: string;
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

const EMPTY_FORM: LotFormState = {
  lotTypeId: "",
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

export default function NewLotPage() {
  const params = useParams<{ org: string }>();
  const org = params.org;
  const utils = api.useUtils();
  const [form, setForm] = useState<LotFormState>(EMPTY_FORM);
  const [sequenceForm, setSequenceForm] =
    useState<SequenceFormState>(EMPTY_SEQUENCE_FORM);
  const [attributesError, setAttributesError] = useState<string | null>(null);
  const [sequenceError, setSequenceError] = useState<string | null>(null);

  const { data: lotTypesWithStatuses = [] } =
    api.lotType.listWithStatuses.useQuery();
  const lotTypes = lotTypesWithStatuses;
  const { data: locations = [] } = api.location.list.useQuery();
  const { data: lots = [], isLoading: lotsLoading } = api.lot.list.useQuery();

  const selectedLotType = useMemo(
    () => lotTypesWithStatuses.find((it) => it.id === form.lotTypeId) ?? null,
    [lotTypesWithStatuses, form.lotTypeId],
  );

  const statuses = selectedLotType?.statuses ?? [];

  const statusNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const lt of lotTypesWithStatuses) {
      for (const s of lt.statuses) {
        map.set(s.id, s.name);
      }
    }
    return map;
  }, [lotTypesWithStatuses]);

  useEffect(() => {
    if (!selectedLotType) return;
    const firstUnstarted = selectedLotType.statuses.find(
      (s) => s.category === "unstarted",
    );
    const defaultStatus = firstUnstarted ?? selectedLotType.statuses[0];
    if (defaultStatus) {
      setForm((prev) => ({ ...prev, status: defaultStatus.id }));
    }
  }, [selectedLotType]);

  const createLot = api.lot.create.useMutation({
    onSuccess: async () => {
      await utils.lot.list.invalidate();
      await utils.lotType.list.invalidate();
      setForm((prev) => ({
        ...EMPTY_FORM,
        lotTypeId: prev.lotTypeId,
        useSequence: prev.useSequence,
        locationId: prev.locationId,
      }));
      setAttributesError(null);
    },
  });

  useEffect(() => {
    if (!form.lotTypeId || !selectedLotType) {
      setSequenceForm(EMPTY_SEQUENCE_FORM);
      return;
    }

    if (selectedLotType.codePrefix) {
      setSequenceForm({
        prefix: selectedLotType.codePrefix,
        nextNumber: String(selectedLotType.codeNextNumber),
      });
    } else {
      setSequenceForm(EMPTY_SEQUENCE_FORM);
    }
  }, [form.lotTypeId, selectedLotType]);

  const previewCode = useMemo(() => {
    const nextNumber = Number(sequenceForm.nextNumber);
    if (
      !sequenceForm.prefix ||
      !Number.isInteger(nextNumber) ||
      nextNumber <= 0
    )
      return "";
    const paddedNumber = String(nextNumber).padStart(5, "0");
    return `${sequenceForm.prefix}-${paddedNumber}`;
  }, [sequenceForm.nextNumber, sequenceForm.prefix]);

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
      lotTypeId: form.lotTypeId,
      code: form.useSequence ? undefined : form.code.trim(),
      useSequence: form.useSequence,
      status: form.status.trim() || "created",
      uom: form.uom.trim() || "each",
      locationId: form.locationId || null,
      notes: form.notes.trim() || null,
      attributes,
    });
  };

  const editLotType = api.lotType.edit.useMutation({
    onSuccess: async () => {
      await utils.lotType.list.invalidate();
      setSequenceError(null);
    },
  });

  const handleSaveSequence = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!form.lotTypeId || !selectedLotType) {
      setSequenceError("Select a lot type before saving sequence settings.");
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

    await editLotType.mutateAsync({
      id: form.lotTypeId,
      name: selectedLotType.name,
      category: selectedLotType.category,
      description: selectedLotType.description,
      quantityDefaultUnit: selectedLotType.qtyUom,
      icon: selectedLotType.icon,
      color: selectedLotType.color,
      codePrefix: sequenceForm.prefix.trim(),
      codeNextNumber: nextNumber,
    });
  };

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Add new lots and review recent inventory.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent Lots</CardTitle>
            <CardDescription>Open a lot to view its history.</CardDescription>
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
                    href={`/${org}/inventory/lots/${lot.id}`}
                    className="border-border hover:bg-muted block rounded-md border px-3 py-2"
                  >
                    <p className="font-medium">{lot.code}</p>
                    <p className="text-muted-foreground text-xs">
                      Status: {statusNameMap.get(lot.statusId) ?? lot.statusId}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add New Lot</CardTitle>
            <CardDescription>
              Create a lot without scanning an identifier.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateLot}>
              <FieldGroup>
                <Field>
                  <FieldLabel>Category</FieldLabel>
                  <FieldContent>
                    <Select
                      value={form.lotTypeId}
                      onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, lotTypeId: value }))
                      }
                      disabled={lotTypes.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {lotTypes.map((lotType) => (
                          <SelectItem key={lotType.id} value={lotType.id}>
                            {lotType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="lot-code">Tracking #</FieldLabel>
                  <FieldContent>
                    <input
                      id="lot-code"
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
                        form.useSequence ? "Auto-generated" : "LOT-0001"
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
                  <FieldLabel>Status</FieldLabel>
                  <FieldContent>
                    <Select
                      value={form.status}
                      onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, status: value }))
                      }
                      disabled={statuses.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="lot-uom">Unit</FieldLabel>
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

                {attributesError && (
                  <p className="text-destructive text-sm" role="alert">
                    {attributesError}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={
                    createLot.isPending ||
                    !form.lotTypeId ||
                    (form.useSequence && !previewCode)
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
