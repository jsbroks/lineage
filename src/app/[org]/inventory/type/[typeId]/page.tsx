"use client";

import { useMemo } from "react";
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

export default function EditItemTypePage() {
  const params = useParams<{ org: string; typeId: string }>();
  const router = useRouter();
  const utils = api.useUtils();

  const { data, isLoading } = api.itemType.getById.useQuery(
    { id: params.typeId },
    { enabled: !!params.typeId },
  );

  const editMutation = api.itemType.edit.useMutation();
  const saveVariantsMutation = api.itemType.saveVariants.useMutation();
  const saveStatusesMutation = api.itemType.saveStatuses.useMutation();

  const isSubmitting =
    editMutation.isPending ||
    saveVariantsMutation.isPending ||
    saveStatusesMutation.isPending;

  const initialData: ItemTypeFormData | undefined = useMemo(() => {
    if (!data) return undefined;
    const it = data.itemType;
    return {
      base: {
        name: it.name,
        slug: it.slug,
        category: it.category,
        defaultUom: it.defaultUom,
        description: it.description ?? "",
        icon: it.icon ?? "",
        color: it.color ?? "",
        codePrefix: it.codePrefix ?? "",
        codeNextNumber: String(it.codeNextNumber),
      },
      variants: data.variants.map((v) => ({
        id: v.id,
        name: v.name,
        isDefault: v.isDefault,
        isActive: v.isActive,
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
    };
  }, [data]);

  const handleSubmit = async (formData: ItemTypeFormData) => {
    const { base, variants, statuses, transitions } = formData;

    await editMutation.mutateAsync({
      id: params.typeId,
      name: base.name.trim(),
      slug: base.slug.trim(),
      category: base.category.trim(),
      defaultUom: base.defaultUom.trim() || "each",
      description: base.description.trim() || null,
      icon: base.icon.trim() || null,
      color: base.color.trim() || null,
      codePrefix: base.codePrefix.trim() || null,
      codeNextNumber: Number(base.codeNextNumber) || undefined,
    });

    await saveVariantsMutation.mutateAsync({
      itemTypeId: params.typeId,
      variants: variants.map((v, i) => ({
        id: v.id,
        name: v.name.trim(),
        isDefault: v.isDefault,
        isActive: v.isActive,
        sortOrder: i,
      })),
    });

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

    await utils.itemType.getById.invalidate({ id: params.typeId });
    await utils.itemType.list.invalidate();
    await utils.itemType.inventoryOverview.invalidate();
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center gap-2 border-b px-4 py-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${params.org}/inventory`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">
          {isLoading
            ? "Loading..."
            : data?.itemType.name
              ? `Edit ${data.itemType.name}`
              : "Edit Item Type"}
        </h1>
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
