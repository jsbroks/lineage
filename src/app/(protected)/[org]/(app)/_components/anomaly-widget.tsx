"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  TrendingDown,
  Scale,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

export function AnomalyWidget({ org }: { org: string }) {
  const { data, isLoading } = api.anomaly.detect.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const [expanded, setExpanded] = useState(false);

  const totalAnomalies =
    (data?.stuckLots.length ?? 0) +
    (data?.throughputChanges.length ?? 0) +
    (data?.yieldOutliers.length ?? 0);

  if (!isLoading && totalAnomalies === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-foreground flex items-center gap-2 text-lg font-semibold tracking-tight">
          <AlertTriangle className="size-4 text-amber-500" />
          Attention Needed
        </h2>
        {totalAnomalies > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Collapse" : "Show all"}
            {expanded ? (
              <ChevronUp className="ml-1 size-3.5" />
            ) : (
              <ChevronDown className="ml-1 size-3.5" />
            )}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} size="sm">
              <CardContent className="pt-0">
                <Skeleton className="mb-2 h-4 w-24" />
                <Skeleton className="h-6 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <AnomalyStatCard
              icon={<Clock className="size-4 text-amber-500" />}
              label="Stuck Lots"
              count={data?.stuckLots.length ?? 0}
              description="longer than peers in same status"
            />
            <AnomalyStatCard
              icon={<TrendingDown className="size-4 text-red-500" />}
              label="Throughput Drops"
              count={data?.throughputChanges.length ?? 0}
              description="lot types with 30%+ fewer transitions"
            />
            <AnomalyStatCard
              icon={<Scale className="size-4 text-violet-500" />}
              label="Yield Outliers"
              count={data?.yieldOutliers.length ?? 0}
              description="lots with unusual quantities"
            />
          </div>

          {expanded && data && (
            <div className="mt-4 space-y-4">
              {data.stuckLots.length > 0 && (
                <AnomalyDetailCard
                  title="Stuck Lots"
                  icon={<Clock className="size-3.5 text-amber-500" />}
                >
                  <div className="divide-y">
                    {data.stuckLots.slice(0, 10).map((stuck) => (
                      <div
                        key={stuck.lotId}
                        className="flex items-start justify-between gap-3 px-4 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm">
                            <Link
                              href={`/${org}/lots/${stuck.lotId}`}
                              className="font-medium hover:underline"
                            >
                              {stuck.code}
                            </Link>
                            <span className="text-muted-foreground">
                              {" "}
                              · {stuck.lotTypeName}
                            </span>
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {stuck.statusName}
                            {stuck.locationName && ` · ${stuck.locationName}`}
                            {stuck.variantName && ` · ${stuck.variantName}`}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <Badge
                            variant="outline"
                            className="text-amber-600 dark:text-amber-400"
                          >
                            {stuck.daysInStatus}d
                          </Badge>
                          <p className="text-muted-foreground mt-0.5 text-[10px]">
                            avg {stuck.avgDaysInStatus}d
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </AnomalyDetailCard>
              )}

              {data.throughputChanges.length > 0 && (
                <AnomalyDetailCard
                  title="Throughput Drops"
                  icon={<TrendingDown className="size-3.5 text-red-500" />}
                >
                  <div className="divide-y">
                    {data.throughputChanges.map((change) => (
                      <div
                        key={change.lotTypeName}
                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {change.lotTypeName}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {change.recentCount} transitions this week vs{" "}
                            {change.priorCount} last week
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-red-600 dark:text-red-400"
                        >
                          {change.changePercent}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </AnomalyDetailCard>
              )}

              {data.yieldOutliers.length > 0 && (
                <AnomalyDetailCard
                  title="Yield Outliers"
                  icon={<Scale className="size-3.5 text-violet-500" />}
                >
                  <div className="divide-y">
                    {data.yieldOutliers.slice(0, 10).map((outlier) => (
                      <div
                        key={outlier.lotId}
                        className="flex items-start justify-between gap-3 px-4 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm">
                            <Link
                              href={`/${org}/lots/${outlier.lotId}`}
                              className="font-medium hover:underline"
                            >
                              {outlier.code}
                            </Link>
                            <span className="text-muted-foreground">
                              {" "}
                              · {outlier.lotTypeName}
                            </span>
                          </p>
                          {outlier.variantName && (
                            <p className="text-muted-foreground text-xs">
                              {outlier.variantName}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <Badge
                            variant="outline"
                            className={cn(
                              outlier.quantity > outlier.avgQuantity
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400",
                            )}
                          >
                            {outlier.quantity}
                          </Badge>
                          <p className="text-muted-foreground mt-0.5 text-[10px]">
                            avg {outlier.avgQuantity}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </AnomalyDetailCard>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function AnomalyStatCard({
  icon,
  label,
  count,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  description: string;
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
        <div
          className={cn(
            "text-2xl font-bold tabular-nums",
            count > 0 ? "text-amber-600 dark:text-amber-400" : "",
          )}
        >
          {count}
        </div>
        <p className="text-muted-foreground text-xs">{description}</p>
      </CardContent>
    </Card>
  );
}

function AnomalyDetailCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        {icon}
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}
