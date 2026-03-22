"use client";

import { useParams } from "next/navigation";

import { SidebarTrigger } from "~/components/ui/sidebar";
import { api } from "~/trpc/react";

import {
  ActivityLogCard,
  DetailsCard,
  LotHeaderInfo,
  LotPageHeader,
  LabelsCard,
  LineageCard,
  LocationCard,
  PropertiesCard,
  QuantityCard,
  ValueCard,
} from "./_components";

export default function LotDetailPage() {
  const params = useParams<{ org: string; id: string }>();
  const lotId = params.id;

  const { data, isLoading } = api.lot.getById.useQuery(
    { lotId },
    { enabled: !!lotId },
  );

  const { data: typeData } = api.lotType.getById.useQuery(
    { id: data?.lot.lotTypeId ?? "" },
    { enabled: !!data?.lot.lotTypeId },
  );

  const attrDefs = typeData?.attributeDefinitions ?? [];
  const currentAttrs = (data?.lot.attributes as Record<string, unknown>) ?? {};

  if (isLoading) {
    return (
      <div className="flex min-h-full flex-col">
        <header className="flex items-center gap-2 border-b px-4 py-2">
          <SidebarTrigger />
          <div className="bg-muted h-5 w-32 animate-pulse rounded" />
        </header>
        <div className="text-muted-foreground px-6 py-12 text-center text-sm">
          Loading lot...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-full flex-col">
        <LotPageHeader org={params.org} code={lotId} />
        <div className="text-destructive px-6 py-12 text-center text-sm">
          Lot not found.
        </div>
      </div>
    );
  }

  const { lot: currentLot, lotType: currentLotType } = data;

  return (
    <div className="flex min-h-full flex-col">
      <LotPageHeader
        org={params.org}
        code={currentLot.code}
        lotType={currentLotType}
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl space-y-6 px-6 py-6">
          <LotHeaderInfo
            code={currentLot.code}
            status={currentLot.statusId}
            typeName={currentLotType?.name}
            variantName={data.variant?.name}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuantityCard
              quantity={currentLot.quantity}
              unit={currentLot.quantityUnit}
            />
            <ValueCard
              value={currentLot.value}
              currency={currentLot.valueCurrency}
            />
            {currentLot.locationId && (
              <LocationCard name={data.location?.name ?? "—"} />
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DetailsCard
              typeName={currentLotType?.name ?? currentLot.lotTypeId}
              notes={currentLot.notes}
              createdAt={currentLot.createdAt}
              updatedAt={currentLot.updatedAt}
            />

            <PropertiesCard
              lotId={currentLot.id}
              attrDefs={attrDefs}
              currentAttrs={currentAttrs}
            />

            <LabelsCard
              lotId={currentLot.id}
              code={currentLot.code}
              typeName={currentLotType?.name}
              identifiers={data.identifiers}
            />

            <LineageCard
              title="Came From"
              emptyMessage="No source lots recorded."
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
