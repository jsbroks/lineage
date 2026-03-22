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
} from "../../_components/ItemTypeForm";
import { useItemTypeMutations } from "../../_hooks/use-item-type-mutations";

export default function NewItemTypePage() {
  const params = useParams<{ org: string }>();
  const router = useRouter();

  const createMutation = api.itemType.create.useMutation();
  const {
    buildBasePayload,
    saveRelatedData,
    invalidateCommon,
    isSavingRelated,
  } = useItemTypeMutations();

  const isSubmitting = createMutation.isPending || isSavingRelated;

  const handleSubmit = async (formData: ItemTypeFormData) => {
    const created = await createMutation.mutateAsync(
      buildBasePayload(formData.base),
    );
    if (!created) return;

    await saveRelatedData(created.id, formData, { skipEmpty: true });
    await invalidateCommon();
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
