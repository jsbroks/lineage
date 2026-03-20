"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { OperationCard } from "./_components/OperationCard";

export default function OperationsSettingsPage() {
  const params = useParams<{ org: string }>();
  const org = params.org;

  const { data: operationTypes = [], isLoading } =
    api.operationType.list.useQuery();
  const { data: operationTypePorts = [] } =
    api.operationType.listPorts.useQuery();
  const { data: itemTypes = [] } = api.itemType.list.useQuery();

  const portsByOperationType = new Map<string, typeof operationTypePorts>();
  for (const port of operationTypePorts) {
    const current = portsByOperationType.get(port.operationTypeId) ?? [];
    portsByOperationType.set(port.operationTypeId, [...current, port]);
  }

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Task Types</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Define the tasks your team performs (Harvest, Inoculate, Transfer,
            etc.)
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5">
          <Link href={`/${org}/settings/operations/new`}>
            <Plus className="size-3.5" />
            New Task Type
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : operationTypes.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed px-6 py-12 text-center text-sm">
          No task types yet. Create one to get started.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          {operationTypes.map((op) => (
            <OperationCard
              key={op.id}
              operationType={op}
              ports={portsByOperationType.get(op.id) ?? []}
              itemTypes={itemTypes}
              org={org}
            />
          ))}
        </div>
      )}
    </div>
  );
}
