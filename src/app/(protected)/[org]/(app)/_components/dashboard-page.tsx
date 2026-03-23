"use client";

import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Plus,
  Scan,
  Sparkles,
  X,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import { Icon } from "~/app/_components/IconPicker";
import { cn } from "~/lib/utils";
import { getColorClasses } from "~/app/_components/ColorSelector";
import { AnomalyWidget } from "./anomaly-widget";

function OnboardingBanner({ org }: { org: string }) {
  const { data: status, isLoading } = api.onboarding.getStatus.useQuery();
  const utils = api.useUtils();

  const dismissMutation = api.onboarding.dismiss.useMutation({
    onSuccess: () => utils.onboarding.getStatus.invalidate(),
  });

  if (isLoading || !status) return null;
  if (status.isComplete || status.isDismissed) return null;

  return (
    <Card
      size="sm"
      className="bg-primary/5 ring-primary/20 relative overflow-hidden"
    >
      <CardContent className="flex items-center gap-4 pt-0">
        <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Sparkles className="text-primary size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            Finish setting up your workspace
          </p>
          <p className="text-muted-foreground text-xs">
            Configure your lot types, activities, and locations with our setup
            wizard.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" asChild>
            <Link href={`/${org}/setup`}>
              Continue setup
              <ArrowRight className="ml-1 size-3.5" />
            </Link>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground size-8"
            onClick={() => dismissMutation.mutate()}
            disabled={dismissMutation.isPending}
          >
            <X className="size-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage({ org }: { org: string }) {
  const { data: inventoryRows, isLoading: loadingInventory } =
    api.lotType.inventoryOverview.useQuery();

  const typeRows = inventoryRows?.filter((r) => r.variantId === null) ?? [];

  return (
    <div className="space-y-8">
      <OnboardingBanner org={org} />

      {/* Quick Actions */}
      <section>
        <div className="grid grid-cols-3 gap-3">
          <QuickAction
            href={`/${org}/scan`}
            icon={<Scan className="size-5" />}
            label="Scan"
            description="Scan a QR label"
          />
          <QuickAction
            href={`/${org}/operations`}
            icon={<ClipboardList className="size-5" />}
            label="Log Activity"
            description="Record an activity"
          />
          <QuickAction
            href={`/${org}/inventory/lots/new`}
            icon={<Plus className="size-5" />}
            label="New Lot"
            description="Add to inventory"
          />
        </div>
      </section>

      {/* Attention Needed */}
      <AnomalyWidget org={org} />

      {/* Inventory by Type */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-foreground text-lg font-semibold tracking-tight">
            Inventory by Type
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${org}/inventory`}>
              View all <ArrowRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        </div>
        <Card size="sm">
          <CardContent className="p-0">
            {loadingInventory ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            ) : typeRows.length === 0 ? (
              <div className="text-muted-foreground px-4 py-8 text-center text-sm">
                No lot types configured yet.{" "}
                <Link
                  href={`/${org}/inventory/type/new`}
                  className="text-primary underline underline-offset-4"
                >
                  Create one
                </Link>
              </div>
            ) : (
              <div className="divide-y">
                {typeRows.map((row) => {
                  const inProgress = row.prepared + row.active;
                  return (
                    <Link
                      key={row.lotTypeId}
                      href={`/${org}/inventory/type/${row.lotTypeId}`}
                      className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3 transition-colors"
                    >
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded",
                          getColorClasses(row.lotTypeColor).bg,
                          getColorClasses(row.lotTypeColor).text,
                        )}
                        style={
                          row.lotTypeColor
                            ? { backgroundColor: row.lotTypeColor + "20" }
                            : undefined
                        }
                      >
                        <Icon icon={row.lotTypeIcon} className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {row.lotTypeName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {inProgress} in progress
                          {row.totalQuantity
                            ? ` · ${Number(row.totalQuantity).toLocaleString()} ${row.quantityUnit ?? ""}`.trim()
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {row.prepared > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] tabular-nums"
                          >
                            {row.prepared} prep
                          </Badge>
                        )}
                        {row.active > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] tabular-nums"
                          >
                            {row.active} active
                          </Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card
        size="sm"
        className="hover:bg-muted/50 cursor-pointer transition-colors"
      >
        <CardContent className="flex items-center gap-3 pt-0">
          <div className="text-muted-foreground">{icon}</div>
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-muted-foreground text-xs">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
