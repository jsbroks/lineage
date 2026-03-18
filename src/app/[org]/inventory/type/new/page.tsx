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
  const saveVariantsMutation = api.itemType.saveVariants.useMutation();
  const saveStatusesMutation = api.itemType.saveStatuses.useMutation();

  const isSubmitting =
    createMutation.isPending ||
    saveVariantsMutation.isPending ||
    saveStatusesMutation.isPending;

  const handleSubmit = async (formData: ItemTypeFormData) => {
    const { base, variants, statuses, transitions } = formData;

    const created = await createMutation.mutateAsync({
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

    if (!created) return;

    if (variants.length > 0) {
      await saveVariantsMutation.mutateAsync({
        itemTypeId: created.id,
        variants: variants.map((v, i) => ({
          name: v.name.trim(),
          isDefault: v.isDefault,
          isActive: v.isActive,
          sortOrder: i,
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
