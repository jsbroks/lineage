"use client";

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

type OperationTypeFormState = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  configText: string;
};

type OperationTypePortFormState = {
  operationTypeId: string;
  direction: "input" | "output";
  itemTypeId: string;
  portRole: string;
  qtyMin: string;
  qtyMax: string;
  uom: string;
  isConsumed: boolean;
  isRequired: boolean;
  configText: string;
};

const EMPTY_OPERATION_TYPE_FORM: OperationTypeFormState = {
  name: "",
  slug: "",
  description: "",
  icon: "",
  configText: "{}",
};

const EMPTY_PORT_FORM: OperationTypePortFormState = {
  operationTypeId: "",
  direction: "input",
  itemTypeId: "",
  portRole: "",
  qtyMin: "",
  qtyMax: "",
  uom: "each",
  isConsumed: true,
  isRequired: true,
  configText: "{}",
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function OperationsSettingsPage() {
  const utils = api.useUtils();
  const { data: operationTypes = [], isLoading: operationTypesLoading } =
    api.operationType.list.useQuery();
  const { data: operationTypePorts = [] } =
    api.operationType.listPorts.useQuery();
  const { data: itemTypes = [], isLoading: itemTypesLoading } =
    api.itemType.list.useQuery();

  const [operationTypeForm, setOperationTypeForm] =
    useState<OperationTypeFormState>(EMPTY_OPERATION_TYPE_FORM);
  const [portForm, setPortForm] =
    useState<OperationTypePortFormState>(EMPTY_PORT_FORM);
  const [operationConfigError, setOperationConfigError] = useState<
    string | null
  >(null);
  const [portConfigError, setPortConfigError] = useState<string | null>(null);

  useEffect(() => {
    if (portForm.operationTypeId || operationTypes.length === 0) return;
    setPortForm((prev) => ({
      ...prev,
      operationTypeId: operationTypes[0]!.id,
    }));
  }, [operationTypes, portForm.operationTypeId]);

  useEffect(() => {
    if (portForm.itemTypeId || itemTypes.length === 0) return;
    setPortForm((prev) => ({ ...prev, itemTypeId: itemTypes[0]!.id }));
  }, [itemTypes, portForm.itemTypeId]);

  const portsByOperationType = useMemo(() => {
    const grouped = new Map<string, typeof operationTypePorts>();
    for (const port of operationTypePorts) {
      const current = grouped.get(port.operationTypeId) ?? [];
      grouped.set(port.operationTypeId, [...current, port]);
    }
    return grouped;
  }, [operationTypePorts]);

  const createOperationTypeMutation = api.operationType.create.useMutation({
    onSuccess: async () => {
      await utils.operationType.list.invalidate();
      setOperationTypeForm(EMPTY_OPERATION_TYPE_FORM);
      setOperationConfigError(null);
    },
  });

  const addPortMutation = api.operationType.addPort.useMutation({
    onSuccess: async () => {
      await utils.operationType.listPorts.invalidate();
      setPortConfigError(null);
      setPortForm((prev) => ({
        ...EMPTY_PORT_FORM,
        operationTypeId: prev.operationTypeId,
        itemTypeId: prev.itemTypeId,
      }));
    },
  });

  const deleteOperationTypeMutation = api.operationType.delete.useMutation({
    onSuccess: async () => {
      await utils.operationType.list.invalidate();
      await utils.operationType.listPorts.invalidate();
      setPortForm((prev) => ({ ...prev, operationTypeId: "" }));
    },
  });

  const deletePortMutation = api.operationType.deletePort.useMutation({
    onSuccess: async () => {
      await utils.operationType.listPorts.invalidate();
    },
  });

  const parseJsonConfig = (
    jsonText: string,
    setError: (error: string | null) => void,
  ) => {
    if (!jsonText.trim()) return {};

    try {
      const parsed = JSON.parse(jsonText) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        setError(null);
        return parsed as Record<string, unknown>;
      }
      setError("Config must be a JSON object.");
      return null;
    } catch {
      setError("Config must be valid JSON.");
      return null;
    }
  };

  const handleCreateOperationType = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const config = parseJsonConfig(
      operationTypeForm.configText,
      setOperationConfigError,
    );
    if (!config) return;

    await createOperationTypeMutation.mutateAsync({
      name: operationTypeForm.name.trim(),
      slug: operationTypeForm.slug.trim(),
      description: operationTypeForm.description.trim() || null,
      icon: operationTypeForm.icon.trim() || null,
      config,
    });
  };

  const handleAddPort = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const config = parseJsonConfig(portForm.configText, setPortConfigError);
    if (!config) return;

    await addPortMutation.mutateAsync({
      operationTypeId: portForm.operationTypeId,
      direction: portForm.direction,
      itemTypeId: portForm.itemTypeId,
      portRole: portForm.portRole.trim(),
      qtyMin: portForm.qtyMin.trim() || null,
      qtyMax: portForm.qtyMax.trim() || null,
      uom: portForm.uom.trim() || "each",
      isConsumed: portForm.isConsumed,
      isRequired: portForm.isRequired,
      config,
    });
  };

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Operation Types
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Create operation types and define their input and output ports.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Existing operation types</CardTitle>
            <CardDescription>
              Operation types and configured ports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {operationTypesLoading ? (
              <p className="text-muted-foreground text-sm">
                Loading operation types...
              </p>
            ) : operationTypes.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No operation types yet. Create one to get started.
              </p>
            ) : (
              <div className="space-y-3">
                {operationTypes.map((op) => {
                  const ports = portsByOperationType.get(op.id) ?? [];
                  return (
                    <div
                      key={op.id}
                      className="border-border rounded-md border px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{op.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">
                            {op.slug}
                          </span>
                          <Button
                            type="button"
                            variant="destructive"
                            size="xs"
                            disabled={deleteOperationTypeMutation.isPending}
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  `Delete operation type "${op.name}" and all its ports?`,
                                )
                              ) {
                                return;
                              }
                              await deleteOperationTypeMutation.mutateAsync({
                                id: op.id,
                              });
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      {op.description && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {op.description}
                        </p>
                      )}
                      {ports.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {ports.map((port) => {
                            const itemType = itemTypes.find(
                              (candidate) => candidate.id === port.itemTypeId,
                            );
                            return (
                              <div
                                key={port.id}
                                className="flex items-center justify-between gap-2"
                              >
                                <p className="text-muted-foreground text-xs">
                                  {port.direction.toUpperCase()} -{" "}
                                  {port.portRole} (
                                  {itemType?.name ?? "Unknown item type"})
                                </p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="xs"
                                  disabled={deletePortMutation.isPending}
                                  onClick={async () => {
                                    if (
                                      !window.confirm(
                                        `Delete port "${port.portRole}" from "${op.name}"?`,
                                      )
                                    ) {
                                      return;
                                    }
                                    await deletePortMutation.mutateAsync({
                                      id: port.id,
                                    });
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create operation type</CardTitle>
              <CardDescription>
                Add a new operation type definition.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateOperationType}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="op-name">Name</FieldLabel>
                    <FieldContent>
                      <input
                        id="op-name"
                        required
                        value={operationTypeForm.name}
                        onChange={(e) =>
                          setOperationTypeForm((prev) => {
                            const nextName = e.target.value;
                            return {
                              ...prev,
                              name: nextName,
                              slug: prev.slug ? prev.slug : slugify(nextName),
                            };
                          })
                        }
                        className="border-input bg-background w-full rounded-md border px-3 py-2"
                        placeholder="Harvest"
                      />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="op-slug">Slug</FieldLabel>
                    <FieldContent>
                      <input
                        id="op-slug"
                        required
                        value={operationTypeForm.slug}
                        onChange={(e) =>
                          setOperationTypeForm((prev) => ({
                            ...prev,
                            slug: e.target.value,
                          }))
                        }
                        className="border-input bg-background w-full rounded-md border px-3 py-2"
                        placeholder="harvest"
                      />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="op-description">
                      Description
                    </FieldLabel>
                    <FieldContent>
                      <textarea
                        id="op-description"
                        value={operationTypeForm.description}
                        onChange={(e) =>
                          setOperationTypeForm((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2"
                        placeholder="Optional description"
                      />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="op-icon">Icon</FieldLabel>
                    <FieldContent>
                      <input
                        id="op-icon"
                        value={operationTypeForm.icon}
                        onChange={(e) =>
                          setOperationTypeForm((prev) => ({
                            ...prev,
                            icon: e.target.value,
                          }))
                        }
                        className="border-input bg-background w-full rounded-md border px-3 py-2"
                        placeholder="package"
                      />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="op-config">
                      Config (JSON object)
                    </FieldLabel>
                    <FieldContent>
                      <textarea
                        id="op-config"
                        value={operationTypeForm.configText}
                        onChange={(e) =>
                          setOperationTypeForm((prev) => ({
                            ...prev,
                            configText: e.target.value,
                          }))
                        }
                        className="border-input bg-background min-h-28 w-full rounded-md border px-3 py-2 font-mono text-xs"
                      />
                      <FieldDescription>
                        Use a JSON object for operation-type specific settings.
                      </FieldDescription>
                    </FieldContent>
                  </Field>

                  {operationConfigError && (
                    <p className="text-destructive text-sm">
                      {operationConfigError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={createOperationTypeMutation.isPending}
                  >
                    {createOperationTypeMutation.isPending
                      ? "Creating..."
                      : "Create operation type"}
                  </Button>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add operation type port</CardTitle>
              <CardDescription>
                Attach input/output ports to an operation type.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPort}>
                <FieldGroup>
                  <Field>
                    <FieldLabel>Operation Type</FieldLabel>
                    <FieldContent>
                      <Select
                        value={portForm.operationTypeId}
                        onValueChange={(value) =>
                          setPortForm((prev) => ({
                            ...prev,
                            operationTypeId: value,
                          }))
                        }
                        disabled={
                          operationTypesLoading || operationTypes.length === 0
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select operation type" />
                        </SelectTrigger>
                        <SelectContent>
                          {operationTypes.map((op) => (
                            <SelectItem key={op.id} value={op.id}>
                              {op.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel>Direction</FieldLabel>
                    <FieldContent>
                      <Select
                        value={portForm.direction}
                        onValueChange={(value: "input" | "output") =>
                          setPortForm((prev) => ({ ...prev, direction: value }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select direction" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="input">Input</SelectItem>
                          <SelectItem value="output">Output</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel>Item Type</FieldLabel>
                    <FieldContent>
                      <Select
                        value={portForm.itemTypeId}
                        onValueChange={(value) =>
                          setPortForm((prev) => ({
                            ...prev,
                            itemTypeId: value,
                          }))
                        }
                        disabled={itemTypesLoading || itemTypes.length === 0}
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
                    <FieldLabel htmlFor="port-role">Port Role</FieldLabel>
                    <FieldContent>
                      <input
                        id="port-role"
                        required
                        value={portForm.portRole}
                        onChange={(e) =>
                          setPortForm((prev) => ({
                            ...prev,
                            portRole: e.target.value,
                          }))
                        }
                        className="border-input bg-background w-full rounded-md border px-3 py-2"
                        placeholder="primary"
                      />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="port-uom">UOM</FieldLabel>
                    <FieldContent>
                      <input
                        id="port-uom"
                        required
                        value={portForm.uom}
                        onChange={(e) =>
                          setPortForm((prev) => ({
                            ...prev,
                            uom: e.target.value,
                          }))
                        }
                        className="border-input bg-background w-full rounded-md border px-3 py-2"
                        placeholder="each"
                      />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="port-qty-min">Qty Min</FieldLabel>
                    <FieldContent>
                      <input
                        id="port-qty-min"
                        value={portForm.qtyMin}
                        onChange={(e) =>
                          setPortForm((prev) => ({
                            ...prev,
                            qtyMin: e.target.value,
                          }))
                        }
                        className="border-input bg-background w-full rounded-md border px-3 py-2"
                        placeholder="0"
                      />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="port-qty-max">Qty Max</FieldLabel>
                    <FieldContent>
                      <input
                        id="port-qty-max"
                        value={portForm.qtyMax}
                        onChange={(e) =>
                          setPortForm((prev) => ({
                            ...prev,
                            qtyMax: e.target.value,
                          }))
                        }
                        className="border-input bg-background w-full rounded-md border px-3 py-2"
                        placeholder="100"
                      />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="port-config">
                      Config (JSON object)
                    </FieldLabel>
                    <FieldContent>
                      <textarea
                        id="port-config"
                        value={portForm.configText}
                        onChange={(e) =>
                          setPortForm((prev) => ({
                            ...prev,
                            configText: e.target.value,
                          }))
                        }
                        className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 font-mono text-xs"
                      />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="port-is-consumed">
                      Is Consumed
                    </FieldLabel>
                    <FieldContent>
                      <input
                        id="port-is-consumed"
                        type="checkbox"
                        checked={portForm.isConsumed}
                        onChange={(e) =>
                          setPortForm((prev) => ({
                            ...prev,
                            isConsumed: e.target.checked,
                          }))
                        }
                        className="size-4"
                      />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="port-is-required">
                      Is Required
                    </FieldLabel>
                    <FieldContent>
                      <input
                        id="port-is-required"
                        type="checkbox"
                        checked={portForm.isRequired}
                        onChange={(e) =>
                          setPortForm((prev) => ({
                            ...prev,
                            isRequired: e.target.checked,
                          }))
                        }
                        className="size-4"
                      />
                    </FieldContent>
                  </Field>

                  {portConfigError && (
                    <p className="text-destructive text-sm">
                      {portConfigError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={
                      addPortMutation.isPending ||
                      operationTypes.length === 0 ||
                      itemTypes.length === 0
                    }
                  >
                    {addPortMutation.isPending ? "Adding..." : "Add port"}
                  </Button>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
