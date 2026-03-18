"use client";

import { api } from "~/trpc/react";
import { type ItemTypeFormData } from "../_components/item-type-form";

function buildBasePayload(base: ItemTypeFormData["base"]) {
  return {
    name: base.name.trim(),
    slug: base.slug.trim(),
    category: base.category.trim(),
    quantityName: base.quantityName.trim() || null,
    quantityDefaultUnit: base.defaultUom.trim() || "each",
    description: base.description.trim() || null,
    icon: base.icon.trim() || null,
    color: base.color.trim() || null,
    codePrefix: base.codePrefix.trim() || null,
    codeNextNumber: Number(base.codeNextNumber) || undefined,
  };
}

export function useItemTypeMutations() {
  const utils = api.useUtils();

  const saveOptionsMutation = api.itemType.saveOptions.useMutation();
  const saveVariantsMutation = api.itemType.saveVariants.useMutation();
  const saveStatusesMutation = api.itemType.saveStatuses.useMutation();
  const saveAttrDefsMutation =
    api.itemType.saveAttributeDefinitions.useMutation();

  const isSavingRelated =
    saveOptionsMutation.isPending ||
    saveVariantsMutation.isPending ||
    saveStatusesMutation.isPending ||
    saveAttrDefsMutation.isPending;

  async function saveRelatedData(
    itemTypeId: string,
    formData: ItemTypeFormData,
    { skipEmpty = false }: { skipEmpty?: boolean } = {},
  ) {
    const { options, variants, statuses, transitions, attributeDefinitions } =
      formData;

    const filteredOptions = options.filter((o) => o.name.trim());
    if (!skipEmpty || filteredOptions.length > 0) {
      await saveOptionsMutation.mutateAsync({
        itemTypeId,
        options: filteredOptions.map((o) => ({
          id: o.id,
          name: o.name.trim(),
          values: o.values.filter((v) => v.trim()),
        })),
      });
    }

    if (variants.length > 0) {
      await saveVariantsMutation.mutateAsync({
        itemTypeId,
        variants: variants.map((v, i) => ({
          id: v.id,
          name: v.name,
          isDefault: v.isDefault,
          isActive: v.isActive,
          sortOrder: i,
          defaultValue: v.defaultValue ? parseInt(v.defaultValue, 10) : null,
          defaultValueCurrency: v.defaultValueCurrency.trim() || null,
          defaultQuantity: v.defaultQuantity.trim() || null,
          defaultQuantityUnit: v.defaultQuantityUnit.trim() || null,
        })),
      });
    }

    const filteredStatuses = statuses.map((s, i) => ({
      id: s.id,
      slug: s.slug.trim(),
      name: s.name.trim(),
      color: s.color.trim() || null,
      isInitial: s.isInitial,
      isTerminal: s.isTerminal,
      ordinal: i,
    }));
    if (!skipEmpty || statuses.length > 0) {
      await saveStatusesMutation.mutateAsync({
        itemTypeId,
        statuses: filteredStatuses,
        transitions: transitions.filter((t) => t.fromSlug && t.toSlug),
      });
    }

    const filteredAttrDefs = attributeDefinitions.filter((d) =>
      d.attrKey.trim(),
    );
    if (!skipEmpty || filteredAttrDefs.length > 0) {
      await saveAttrDefsMutation.mutateAsync({
        itemTypeId,
        definitions: filteredAttrDefs.map((d, i) => ({
          id: d.id,
          attrKey: d.attrKey.trim(),
          dataType: d.dataType,
          isRequired: d.isRequired,
          unit: d.unit.trim() || null,
          sortOrder: i,
        })),
      });
    }
  }

  async function invalidateCommon(itemTypeId?: string) {
    if (itemTypeId) {
      await utils.itemType.getById.invalidate({ id: itemTypeId });
    }
    await utils.itemType.list.invalidate();
    await utils.itemType.inventoryOverview.invalidate();
  }

  return {
    buildBasePayload,
    saveRelatedData,
    invalidateCommon,
    isSavingRelated,
  };
}
