"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  Package,
  Plus,
  Printer,
  Scan,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
            Configure your item types, operations, and locations with our setup
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
    api.itemType.inventoryOverview.useQuery();

  const { data: recentEvents, isLoading: loadingEvents } =
    api.item.recentActivity.useQuery({ limit: 15 });

  const { data: recentOps, isLoading: loadingOps } =
    api.operation.recentWithTypes.useQuery({ limit: 8 });

  const { data: operationTypes } = api.operationType.list.useQuery();

  const typeRows = inventoryRows?.filter((r) => r.variantId === null) ?? [];
  const totals = typeRows.reduce(
    (acc, r) => ({
      total: acc.total + r.prepared + r.active,
      prepared: acc.prepared + r.prepared,
      active: acc.active + r.active,
      value: acc.value + r.totalValue,
    }),
    { total: 0, prepared: 0, active: 0, value: 0 },
  );

  return (
    <div className="space-y-8">
      {/* Onboarding Banner */}
      <OnboardingBanner org={org} />

      {/* Quick Actions */}
      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction
            href={`/${org}/scan`}
            icon={<Scan className="size-5" />}
            label="Scan"
            description="Scan a QR label"
          />
          <QuickAction
            href={`/${org}/operations`}
            icon={<ClipboardList className="size-5" />}
            label="Record Task"
            description="Log an operation"
          />
          <QuickAction
            href={`/${org}/items/new`}
            icon={<Plus className="size-5" />}
            label="New Item"
            description="Add to inventory"
          />
          <QuickAction
            href={`/${org}/inventory/print`}
            icon={<Printer className="size-5" />}
            label="Print Labels"
            description="Generate QR labels"
          />
        </div>
      </section>

      {/* Stat Cards */}
      <section>
        <h2 className="text-foreground mb-3 text-lg font-semibold tracking-tight">
          Inventory Snapshot
        </h2>
        {loadingInventory ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} size="sm">
                <CardContent className="pt-0">
                  <Skeleton className="mb-2 h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Total In Progress"
              value={totals.total}
              icon={<Package className="text-muted-foreground size-4" />}
            />
            <StatCard
              label="Prepared"
              value={totals.prepared}
              sub={pct(totals.prepared, totals.total)}
              icon={<Clock className="size-4 text-blue-500" />}
            />
            <StatCard
              label="Active"
              value={totals.active}
              sub={pct(totals.active, totals.total)}
              icon={<Zap className="size-4 text-amber-500" />}
            />
          </div>
        )}
      </section>

      {/* Anomaly Detection */}
      <AnomalyWidget org={org} />

      {/* Two-column: Inventory by Type + Recent Operations */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Inventory by Type */}
        <section className="lg:col-span-3">
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
                  No item types configured yet.{" "}
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
                        key={row.itemTypeId}
                        href={`/${org}/inventory/type/${row.itemTypeId}`}
                        className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3 transition-colors"
                      >
                        <div
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded",
                            getColorClasses(row.itemTypeColor).bg,
                            getColorClasses(row.itemTypeColor).text,
                          )}
                          style={
                            row.itemTypeColor
                              ? { backgroundColor: row.itemTypeColor + "20" }
                              : undefined
                          }
                        >
                          <Icon icon={row.itemTypeIcon} className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {row.itemTypeName}
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

        {/* Recent Operations */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-foreground text-lg font-semibold tracking-tight">
              Recent Tasks
            </h2>
            {(operationTypes?.length ?? 0) > 0 && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/${org}/operations`}>
                  Record <ArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            )}
          </div>
          <Card size="sm">
            <CardContent className="p-0">
              {loadingOps ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-6 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !recentOps || recentOps.length === 0 ? (
                <div className="text-muted-foreground px-4 py-8 text-center text-sm">
                  No tasks recorded yet.
                </div>
              ) : (
                <div className="divide-y">
                  {recentOps.map((op) => (
                    <div
                      key={op.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                        <CheckCircle2 className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {op.operationTypeName}
                        </p>
                        {op.notes && (
                          <p className="text-muted-foreground truncate text-xs">
                            {op.notes}
                          </p>
                        )}
                      </div>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {op.completedAt
                          ? formatDistanceToNow(new Date(op.completedAt), {
                              addSuffix: true,
                            })
                          : "–"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Recent Activity */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-foreground text-lg font-semibold tracking-tight">
            Recent Activity
          </h2>
        </div>
        <Card size="sm">
          <CardContent className="p-0">
            {loadingEvents ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-2 rounded-full" />
                    <Skeleton className="h-3.5 flex-1" />
                  </div>
                ))}
              </div>
            ) : !recentEvents || recentEvents.length === 0 ? (
              <div className="text-muted-foreground px-4 py-8 text-center text-sm">
                No activity recorded yet.
              </div>
            ) : (
              <div className="divide-y">
                {recentEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-start gap-3 px-4 py-3"
                  >
                    <div
                      className={cn(
                        "mt-1 flex size-6 shrink-0 items-center justify-center rounded",
                        getColorClasses(evt.itemTypeColor).bg,
                        getColorClasses(evt.itemTypeColor).text,
                      )}
                      style={
                        evt.itemTypeColor
                          ? { backgroundColor: evt.itemTypeColor + "20" }
                          : undefined
                      }
                    >
                      <Icon icon={evt.itemTypeIcon} className="size-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <Link
                          href={`/${org}/items/${evt.itemId}`}
                          className="font-medium hover:underline"
                        >
                          {evt.itemCode}
                        </Link>
                        <span className="text-muted-foreground">
                          {" "}
                          · {evt.itemTypeName}
                        </span>
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {evt.message}
                      </p>
                    </div>
                    <span className="text-muted-foreground mt-0.5 shrink-0 text-xs">
                      {formatDistanceToNow(new Date(evt.recordedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                ))}
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

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-center justify-between pb-1">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function pct(n: number, total: number) {
  if (total === 0) return "No items yet";
  return `${Math.round((n / total) * 100)}% of total`;
}
