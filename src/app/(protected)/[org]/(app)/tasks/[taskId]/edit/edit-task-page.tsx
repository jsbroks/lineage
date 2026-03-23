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
  OperationTypeForm,
  type OperationTypeFormData,
} from "../../_components/OperationTypeForm";
import { useOperationTypeMutations } from "../../_hooks/use-operation-type-mutations";
import { Icon } from "~/app/_components/IconPicker";

export default function EditTaskTypePage() {
  const params = useParams<{ org: string; taskId: string }>();

  const { data, isLoading } = api.operationType.getById.useQuery(
    { id: params.taskId },
    { enabled: !!params.taskId },
  );

  const updateMutation = api.operationType.update.useMutation();
  const {
    buildBasePayload,
    saveRelatedData,
    invalidateCommon,
    isSavingRelated,
  } = useOperationTypeMutations();

  const isSubmitting = updateMutation.isPending || isSavingRelated;

  const initialData: OperationTypeFormData | undefined = useMemo(() => {
    if (!data) return undefined;
    return {
      base: {
        name: data.name,
        description: data.description ?? "",
        icon: data.icon ?? "",
        color: data.color ?? "",
        category: data.category ?? "",
      },
      inputs: data.inputs.map((inp) => ({
        id: inp.id,
        referenceKey: inp.referenceKey,
        label: inp.label ?? "",
        description: inp.description ?? "",
        type: inp.type === "items" ? "lots" : inp.type,
        required: inp.required,
        sortOrder: inp.sortOrder,
        ...((inp.type === "items" || inp.type === "lots") && inp.lotConfig
          ? {
              lotTypeId: inp.lotConfig.lotTypeId,
              qtyMin: String(inp.lotConfig.minCount ?? 0),
              qtyMax:
                inp.lotConfig.maxCount != null
                  ? String(inp.lotConfig.maxCount)
                  : "",
              preconditionsStatuses:
                (inp.lotConfig.preconditionsStatuses as string[]) ?? [],
            }
          : {}),
      })),
      steps: data.steps.map((s) => ({
        id: s.id,
        name: s.name,
        action: s.action,
        target: s.target ?? "",
        value: JSON.stringify(s.config ?? {}, null, 2),
      })),
    };
  }, [data]);

  const handleSubmit = async (formData: OperationTypeFormData) => {
    await updateMutation.mutateAsync({
      id: params.taskId,
      ...buildBasePayload(formData.base),
    });
    await saveRelatedData(params.taskId, formData);
    await invalidateCommon(params.taskId);
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center gap-2 border-b px-4 py-2">
        <SidebarTrigger />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/${params.org}/tasks`}>Activities</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink className="flex items-center gap-2">
                <Icon icon={data?.icon} className="size-3.5" />
                {data?.name ?? "..."}
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
          <p className="text-muted-foreground text-sm">Activity not found.</p>
        ) : (
          <OperationTypeForm
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
