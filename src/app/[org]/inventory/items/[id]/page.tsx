"use client";

import { useParams } from "next/navigation";

import { SidebarTrigger } from "~/components/ui/sidebar";
import { api } from "~/trpc/react";

import {
  ActivityLogCard,
  DetailsCard,
  ItemHeaderInfo,
  ItemPageHeader,
  LabelsCard,
  LineageCard,
  LocationCard,
  PropertiesCard,
  QuantityCard,
  ValueCard,
} from "./_components";

export default function ItemDetailPage() {
  const params = useParams<{ org: string; id: string }>();
  const itemId = params.id;

  const { data, isLoading } = api.item.getById.useQuery(
    { itemId },
    { enabled: !!itemId },
  );

  const { data: typeData } = api.itemType.getById.useQuery(
    { id: data?.item.itemTypeId ?? "" },
    { enabled: !!data?.item.itemTypeId },
  );

  const attrDefs = typeData?.attributeDefinitions ?? [];
  const currentAttrs = (data?.item.attributes as Record<string, unknown>) ?? {};

  if (isLoading) {
    return (
      <div className="flex min-h-full flex-col">
        <header className="flex items-center gap-2 border-b px-4 py-2">
          <SidebarTrigger />
          <div className="bg-muted h-5 w-32 animate-pulse rounded" />
        </header>
        <div className="text-muted-foreground px-6 py-12 text-center text-sm">
          Loading item...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-full flex-col">
        <ItemPageHeader org={params.org} code={itemId} />
        <div className="text-destructive px-6 py-12 text-center text-sm">
          Item not found.
        </div>
      </div>
    );
  }

  const { item: currentItem, itemType: currentItemType } = data;

  return (
    <div className="flex min-h-full flex-col">
      <ItemPageHeader
        org={params.org}
        code={currentItem.code}
        itemType={currentItemType}
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl space-y-6 px-6 py-6">
          <ItemHeaderInfo
            code={currentItem.code}
            status={currentItem.status}
            typeName={currentItemType?.name}
            variantName={data.variant?.name}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuantityCard
              quantity={currentItem.quantity}
              unit={currentItem.quantityUnit}
            />
            <ValueCard
              value={currentItem.value}
              currency={currentItem.valueCurrency}
            />
            {currentItem.locationId && (
              <LocationCard name={data.location?.name ?? "—"} />
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DetailsCard
              typeName={currentItemType?.name ?? currentItem.itemTypeId}
              notes={currentItem.notes}
              createdAt={currentItem.createdAt}
              updatedAt={currentItem.updatedAt}
            />

            <PropertiesCard
              itemId={currentItem.id}
              attrDefs={attrDefs}
              currentAttrs={currentAttrs}
            />

            <LabelsCard
              itemId={currentItem.id}
              code={currentItem.code}
              typeName={currentItemType?.name}
              identifiers={data.identifiers}
            />

            <LineageCard
              title="Came From"
              emptyMessage="No source items recorded."
              org={params.org}
              entries={data.parentLineage}
              direction="parent"
            />

            <LineageCard
              title="Used to Make"
              emptyMessage="Not yet used in another step."
              org={params.org}
              entries={data.childLineage}
              direction="child"
            />

            <ActivityLogCard events={data.events} />
          </div>
        </div>
      </div>
    </div>
  );
}
