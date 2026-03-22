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

  const saveInputsMutation = api.operationType.saveInputs.useMutation();
  const saveStepsMutation = api.operationType.saveSteps.useMutation();

  const isSavingRelated =
    saveInputsMutation.isPending || saveStepsMutation.isPending;

  async function saveRelatedData(
    operationTypeId: string,
    formData: OperationTypeFormData,
    { skipEmpty = false }: { skipEmpty?: boolean } = {},
  ) {
    const { inputs, steps } = formData;

    const filteredInputs = inputs.filter((inp) => inp.referenceKey.trim());
    if (!skipEmpty || filteredInputs.length > 0) {
      await saveInputsMutation.mutateAsync({
        operationTypeId,
        inputs: filteredInputs.map((inp, i) => ({
          id: inp.id,
          referenceKey: inp.referenceKey.trim(),
          label: inp.label.trim() || null,
          description: inp.description.trim() || null,
          type: inp.type,
          required: inp.required,
          sortOrder: i,
          ...(inp.type === "items"
            ? {
                itemTypeId: inp.itemTypeId,
                minCount: inp.qtyMin ? parseInt(inp.qtyMin, 10) || 0 : 0,
                maxCount: inp.qtyMax
                  ? parseInt(inp.qtyMax, 10) || null
                  : null,
                preconditionsStatuses:
                  inp.preconditionsStatuses &&
                  inp.preconditionsStatuses.length > 0
                    ? inp.preconditionsStatuses
                    : null,
              }
            : {}),
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
