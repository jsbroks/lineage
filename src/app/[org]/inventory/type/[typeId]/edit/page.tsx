"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { api } from "~/trpc/react";
import {
  ItemTypeForm,
  type ItemTypeFormData,
} from "../../../_components/item-type-form";
import { Icon } from "~/app/_components/IconPicker";

export default function EditItemTypePage() {
  const params = useParams<{ org: string; typeId: string }>();
  const utils = api.useUtils();

  const { data, isLoading } = api.itemType.getById.useQuery(
    { id: params.typeId },
    { enabled: !!params.typeId },
  );

  const editMutation = api.itemType.edit.useMutation();
  const saveOptionsMutation = api.itemType.saveOptions.useMutation();
  const saveVariantsMutation = api.itemType.saveVariants.useMutation();
  const saveStatusesMutation = api.itemType.saveStatuses.useMutation();
  const saveAttrDefsMutation =
    api.itemType.saveAttributeDefinitions.useMutation();

  const isSubmitting =
    editMutation.isPending ||
    saveOptionsMutation.isPending ||
    saveVariantsMutation.isPending ||
    saveStatusesMutation.isPending ||
    saveAttrDefsMutation.isPending;

  const initialData: ItemTypeFormData | undefined = useMemo(() => {
    if (!data) return undefined;
    const it = data.itemType;
    return {
      base: {
        name: it.name,
        slug: it.slug,
        category: it.category,
        defaultUom: it.quantityDefaultUnit ?? "each",
        quantityName: it.quantityName ?? "",
        description: it.description ?? "",
        icon: it.icon ?? "",
        color: it.color ?? "",
        codePrefix: it.codePrefix ?? "",
        codeNextNumber: String(it.codeNextNumber),
      },
      options: data.options.map((o) => ({
        id: o.id,
        name: o.name,
        values: data.optionValues
          .filter((v) => v.optionId === o.id)
          .map((v) => v.value),
        expanded: false,
      })),
      variants: data.variants.map((v) => ({
        id: v.id,
        name: v.name,
        isDefault: v.isDefault,
        isActive: v.isActive,
        defaultValue:
          v.defaultValue != null ? String(v.defaultValue) : "",
        defaultValueCurrency: v.defaultValueCurrency ?? "",
        defaultQuantity: v.defaultQuantity ?? "",
        defaultQuantityUnit: v.defaultQuantityUnit ?? "",
      })),
      statuses: data.statuses.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        color: s.color ?? "",
        isInitial: s.isInitial,
        isTerminal: s.isTerminal,
      })),
      transitions: data.transitions.map((t) => {
        const from = data.statuses.find((s) => s.id === t.fromStatusId);
        const to = data.statuses.find((s) => s.id === t.toStatusId);
        return { fromSlug: from?.slug ?? "", toSlug: to?.slug ?? "" };
      }),
      attributeDefinitions: (data.attributeDefinitions ?? []).map((d) => ({
        id: d.id,
        attrKey: d.attrKey,
        dataType: d.dataType as "text" | "number" | "boolean" | "date" | "select",
        isRequired: d.isRequired,
        unit: d.unit ?? "",
      })),
    };
  }, [data]);

  const handleSubmit = async (formData: ItemTypeFormData) => {
    const {
      base,
      options,
      variants,
      statuses,
      transitions,
      attributeDefinitions,
    } = formData;

    await editMutation.mutateAsync({
      id: params.typeId,
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

    await saveOptionsMutation.mutateAsync({
      itemTypeId: params.typeId,
      options: options
        .filter((o) => o.name.trim())
        .map((o) => ({
          id: o.id,
          name: o.name.trim(),
          values: o.values.filter((v) => v.trim()),
        })),
    });

    if (variants.length > 0) {
      await saveVariantsMutation.mutateAsync({
        itemTypeId: params.typeId,
        variants: variants.map((v, i) => ({
          id: v.id,
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

    await saveStatusesMutation.mutateAsync({
      itemTypeId: params.typeId,
      statuses: statuses.map((s, i) => ({
        id: s.id,
        slug: s.slug.trim(),
        name: s.name.trim(),
        color: s.color.trim() || null,
        isInitial: s.isInitial,
        isTerminal: s.isTerminal,
        ordinal: i,
      })),
      transitions: transitions.filter((t) => t.fromSlug && t.toSlug),
    });

    await saveAttrDefsMutation.mutateAsync({
      itemTypeId: params.typeId,
      definitions: attributeDefinitions
        .filter((d) => d.attrKey.trim())
        .map((d, i) => ({
          id: d.id,
          attrKey: d.attrKey.trim(),
          dataType: d.dataType,
          isRequired: d.isRequired,
          unit: d.unit.trim() || null,
          sortOrder: i,
        })),
    });

    await utils.itemType.getById.invalidate({ id: params.typeId });
    await utils.itemType.list.invalidate();
    await utils.itemType.inventoryOverview.invalidate();
  };

  const it = data?.itemType;
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center gap-2 border-b px-4 py-2">
        <SidebarTrigger />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/${params.org}/inventory`}>Inventory</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  href={`/${params.org}/inventory/type/${params.typeId}`}
                  className="flex items-center gap-2"
                >
                  <Icon icon={it?.icon} className="size-3.5" />
                  {it?.name ?? "..."}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-6">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : !data ? (
          <p className="text-muted-foreground text-sm">Item type not found.</p>
        ) : (
          <ItemTypeForm
            initialData={initialData}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitLabel="Save changes"
          />
        )}
      </div>
    </div>
  );
}
