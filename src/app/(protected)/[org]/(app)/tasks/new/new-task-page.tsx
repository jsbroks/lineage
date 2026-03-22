"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { api } from "~/trpc/react";
import {
  OperationTypeForm,
  type OperationTypeFormData,
} from "../_components/OperationTypeForm";
import { useOperationTypeMutations } from "../_hooks/use-operation-type-mutations";

export default function NewTaskTypePage() {
  const params = useParams<{ org: string }>();
  const router = useRouter();

  const createMutation = api.operationType.create.useMutation();
  const {
    buildBasePayload,
    saveRelatedData,
    invalidateCommon,
    isSavingRelated,
  } = useOperationTypeMutations();

  const isSubmitting = createMutation.isPending || isSavingRelated;

  const handleSubmit = async (formData: OperationTypeFormData) => {
    const created = await createMutation.mutateAsync(
      buildBasePayload(formData.base),
    );
    if (!created) return;

    await saveRelatedData(created.id, formData, { skipEmpty: true });
    await invalidateCommon();
    router.push(`/${params.org}/tasks`);
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center gap-2 border-b px-4 py-2">
        <SidebarTrigger />
        <Button variant="ghost" size="sm" className="size-8 p-0" asChild>
          <Link href={`/${params.org}/tasks`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">New Task Type</h1>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-6">
        <OperationTypeForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Create task type"
        />
      </div>
    </div>
  );
}
