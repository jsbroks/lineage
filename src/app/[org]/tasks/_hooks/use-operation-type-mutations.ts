"use client";

import { api } from "~/trpc/react";
import type { OperationTypeFormData } from "../_components/OperationTypeForm";

function buildBasePayload(base: OperationTypeFormData["base"]) {
  return {
    name: base.name.trim(),
    description: base.description.trim() || null,
    icon: base.icon.trim() || null,
  };
}

export function useOperationTypeMutations() {
  const utils = api.useUtils();

  const savePortsMutation = api.operationType.savePorts.useMutation();
  const saveFieldsMutation = api.operationType.saveFields.useMutation();
  const saveStepsMutation = api.operationType.saveSteps.useMutation();

  const isSavingRelated =
    savePortsMutation.isPending ||
    saveFieldsMutation.isPending ||
    saveStepsMutation.isPending;

  async function saveRelatedData(
    operationTypeId: string,
    formData: OperationTypeFormData,
    { skipEmpty = false }: { skipEmpty?: boolean } = {},
  ) {
    const { inputItems, inputFields, steps } = formData;

    const filteredPorts = inputItems.filter(
      (p) => p.referenceKey.trim() && p.itemTypeId,
    );
    if (!skipEmpty || filteredPorts.length > 0) {
      await savePortsMutation.mutateAsync({
        operationTypeId,
        ports: filteredPorts.map((p) => ({
          id: p.id,
          itemTypeId: p.itemTypeId,
          referenceKey: p.referenceKey.trim(),
          qtyMin: p.qtyMin.trim() || null,
          qtyMax: p.qtyMax.trim() || null,
          preconditionsStatuses:
            p.preconditionsStatuses.length > 0 ? p.preconditionsStatuses : null,
        })),
      });
    }

    const filteredFields = inputFields.filter((f) => f.referenceKey.trim());
    if (!skipEmpty || filteredFields.length > 0) {
      await saveFieldsMutation.mutateAsync({
        operationTypeId,
        fields: filteredFields.map((f, i) => ({
          id: f.id,
          referenceKey: f.referenceKey.trim(),
          label: f.label.trim() || null,
          description: f.description.trim() || null,
          type: f.type,
          required: f.required,
          sortOrder: i,
        })),
      });
    }

    const filteredSteps = steps.filter((s) => s.name.trim());
    if (!skipEmpty || filteredSteps.length > 0) {
      await saveStepsMutation.mutateAsync({
        operationTypeId,
        steps: filteredSteps.map((s, i) => {
          let parsedValue: unknown = {};
          try {
            parsedValue = JSON.parse(s.value);
          } catch {
            parsedValue = {};
          }
          return {
            id: s.id,
            name: s.name.trim(),
            action: s.action,
            target: s.target.trim() || null,
            config: parsedValue,
            sortOrder: i,
          };
        }),
      });
    }
  }

  async function invalidateCommon(operationTypeId?: string) {
    if (operationTypeId) {
      await utils.operationType.getById.invalidate({ id: operationTypeId });
    }
    await utils.operationType.list.invalidate();
  }

  return {
    buildBasePayload,
    saveRelatedData,
    invalidateCommon,
    isSavingRelated,
  };
}
