"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { api } from "~/trpc/react";
import {
  ItemTypeForm,
  type ItemTypeFormData,
} from "../../_components/item-type-form";

export default function NewItemTypePage() {
  const params = useParams<{ org: string }>();
  const router = useRouter();
  const utils = api.useUtils();

  const createMutation = api.itemType.create.useMutation();
  const saveOptionsMutation = api.itemType.saveOptions.useMutation();
  const saveVariantsMutation = api.itemType.saveVariants.useMutation();
  const saveStatusesMutation = api.itemType.saveStatuses.useMutation();
  const saveAttrDefsMutation =
    api.itemType.saveAttributeDefinitions.useMutation();

  const isSubmitting =
    createMutation.isPending ||
    saveOptionsMutation.isPending ||
    saveVariantsMutation.isPending ||
    saveStatusesMutation.isPending ||
    saveAttrDefsMutation.isPending;

  const handleSubmit = async (formData: ItemTypeFormData) => {
    const {
      base,
      options,
      variants,
      statuses,
      transitions,
      attributeDefinitions,
    } = formData;

    const created = await createMutation.mutateAsync({
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
    });

    if (!created) return;

    const filteredOptions = options.filter((o) => o.name.trim());
    if (filteredOptions.length > 0) {
      await saveOptionsMutation.mutateAsync({
        itemTypeId: created.id,
        options: filteredOptions.map((o) => ({
          name: o.name.trim(),
          values: o.values.filter((v) => v.trim()),
        })),
      });
    }

    if (variants.length > 0) {
      await saveVariantsMutation.mutateAsync({
        itemTypeId: created.id,
        variants: variants.map((v, i) => ({
          name: v.name,
          isDefault: v.isDefault,
          isActive: v.isActive,
          sortOrder: i,
          defaultValue: v.defaultValue
            ? parseInt(v.defaultValue, 10)
            : null,
          defaultValueCurrency: v.defaultValueCurrency.trim() || null,
          defaultQuantity: v.defaultQuantity.trim() || null,
          defaultQuantityUnit: v.defaultQuantityUnit.trim() || null,
        })),
      });
    }

    if (statuses.length > 0) {
      await saveStatusesMutation.mutateAsync({
        itemTypeId: created.id,
        statuses: statuses.map((s, i) => ({
          slug: s.slug.trim(),
          name: s.name.trim(),
          color: s.color.trim() || null,
          isInitial: s.isInitial,
          isTerminal: s.isTerminal,
          ordinal: i,
        })),
        transitions: transitions.filter((t) => t.fromSlug && t.toSlug),
      });
    }

    const filteredAttrDefs = attributeDefinitions.filter((d) =>
      d.attrKey.trim(),
    );
    if (filteredAttrDefs.length > 0) {
      await saveAttrDefsMutation.mutateAsync({
        itemTypeId: created.id,
        definitions: filteredAttrDefs.map((d, i) => ({
          attrKey: d.attrKey.trim(),
          dataType: d.dataType,
          isRequired: d.isRequired,
          unit: d.unit.trim() || null,
          sortOrder: i,
        })),
      });
    }

    await utils.itemType.list.invalidate();
    await utils.itemType.inventoryOverview.invalidate();
    router.push(`/${params.org}/inventory/type/${created.id}`);
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center gap-2 border-b px-4 py-2">
        <SidebarTrigger />
        <Button variant="ghost" size="sm" className="size-8 p-0" asChild>
          <Link href={`/${params.org}/inventory`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">New Item Type</h1>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-6">
        <ItemTypeForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Create item type"
        />
      </div>
    </div>
  );
}
