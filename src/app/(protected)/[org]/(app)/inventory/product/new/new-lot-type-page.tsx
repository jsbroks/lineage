"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { api } from "~/trpc/react";
import {
  LotTypeForm,
  type LotTypeFormData,
} from "../../_components/LotTypeForm";
import { useLotTypeMutations } from "../../_hooks/use-lot-type-mutations";

export default function NewLotTypePage() {
  const params = useParams<{ org: string }>();
  const router = useRouter();

  const createMutation = api.lotType.create.useMutation();
  const {
    buildBasePayload,
    saveRelatedData,
    invalidateCommon,
    isSavingRelated,
  } = useLotTypeMutations();

  const isSubmitting = createMutation.isPending || isSavingRelated;

  const handleSubmit = async (formData: LotTypeFormData) => {
    const created = await createMutation.mutateAsync(
      buildBasePayload(formData.base),
    );
    if (!created) return;

    await saveRelatedData(created.id, formData, { skipEmpty: true });
    await invalidateCommon();
    router.push(`/${params.org}/inventory/product/${created.id}`);
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
        <h1 className="text-lg font-semibold">New Product</h1>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-6">
        <LotTypeForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Create product"
        />
      </div>
    </div>
  );
}
