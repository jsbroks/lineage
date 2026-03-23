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
  LotTypeForm,
  type LotTypeFormData,
} from "../../../_components/LotTypeForm";
import { useLotTypeMutations } from "../../../_hooks/use-lot-type-mutations";
import { Icon } from "~/app/_components/IconPicker";

export default function EditLotTypePage() {
  const params = useParams<{ org: string; typeId: string }>();

  const { data, isLoading } = api.lotType.getById.useQuery(
    { id: params.typeId },
    { enabled: !!params.typeId },
  );

  const editMutation = api.lotType.edit.useMutation();
  const {
    buildBasePayload,
    saveRelatedData,
    invalidateCommon,
    isSavingRelated,
  } = useLotTypeMutations();

  const isSubmitting = editMutation.isPending || isSavingRelated;

  const initialData: LotTypeFormData | undefined = useMemo(() => {
    if (!data) return undefined;
    const it = data.lotType;
    return {
      base: {
        name: it.name,
        categoryId: it.categoryId ?? "",
        defaultUom: it.qtyUom ?? "each",
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
        defaultValue: v.defaultValue != null ? String(v.defaultValue) : "",
        defaultValueCurrency: v.defaultValueCurrency ?? "",
        defaultQuantity: v.defaultQuantity ?? "",
        defaultQuantityUnit: v.defaultQuantityUnit ?? "",
      })),
      statuses: data.statuses.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color ?? "",
        category: s.category as
          | "unstarted"
          | "in_progress"
          | "done"
          | "canceled",
      })),
      transitions: data.transitions.map((t) => {
        const from = data.statuses.find((s) => s.id === t.fromStatusId);
        const to = data.statuses.find((s) => s.id === t.toStatusId);
        return { fromSlug: from?.name ?? "", toSlug: to?.name ?? "" };
      }),
      attributeDefinitions: (data.attributeDefinitions ?? []).map((d) => ({
        id: d.id,
        attrKey: d.attrKey,
        dataType: d.dataType as
          | "text"
          | "number"
          | "boolean"
          | "date"
          | "select",
        isRequired: d.isRequired,
        unit: d.unit ?? "",
      })),
    };
  }, [data]);

  const handleSubmit = async (formData: LotTypeFormData) => {
    await editMutation.mutateAsync({
      id: params.typeId,
      ...buildBasePayload(formData.base),
    });
    await saveRelatedData(params.typeId, formData);
    await invalidateCommon(params.typeId);
  };

  const it = data?.lotType;
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
          <p className="text-muted-foreground text-sm">Lot type not found.</p>
        ) : (
          <LotTypeForm
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
