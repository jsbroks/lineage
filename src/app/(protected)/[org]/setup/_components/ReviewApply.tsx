"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  Box,
  Zap,
  MapPin,
  Tag,
  Columns3,
  FileText,
  ArrowRight,
} from "lucide-react";
import { api } from "~/trpc/react";
import type {
  VerticalDefinition,
  SeedData,
  SeedLotType,
  SeedOperationType,
  SeedLocation,
} from "~/verticals/types";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

export function ReviewApply({
  org,
  vertical,
  answers,
  onBack,
}: {
  org: string;
  vertical: VerticalDefinition;
  answers: Record<string, unknown>;
  onBack: () => void;
}) {
  const router = useRouter();

  const seedData: SeedData = useMemo(
    () => vertical.buildSeedData(answers),
    [vertical, answers],
  );

  const applyMutation = api.onboarding.applySetup.useMutation({
    onSuccess: () => router.push(`/${org}`),
  });

  function handleApply() {
    applyMutation.mutate({
      verticalKey: vertical.key,
      answers,
    });
  }

  const totalEntities =
    seedData.lotTypes.length +
    seedData.operations.length +
    countLocations(seedData.locations);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Review your setup</h2>
        <p className="text-muted-foreground text-sm">
          We&apos;ll create{" "}
          <span className="font-medium">{totalEntities} entities</span> for your{" "}
          <span className="font-medium">{vertical.name}</span> workspace. You
          can customize everything in settings after setup.
        </p>
      </div>

      {/* Lot Types */}
      {seedData.lotTypes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Box className="text-muted-foreground size-4" />
            Lot Types
            <Badge variant="secondary">{seedData.lotTypes.length}</Badge>
          </h3>
          <div className="bg-muted/50 divide-y rounded-lg border">
            {seedData.lotTypes.map((it) => (
              <LotTypeRow key={it.name} lotType={it} />
            ))}
          </div>
        </section>
      )}

      {/* Operations */}
      {seedData.operations.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Zap className="text-muted-foreground size-4" />
            Activities
            <Badge variant="secondary">{seedData.operations.length}</Badge>
          </h3>
          <div className="bg-muted/50 divide-y rounded-lg border">
            {seedData.operations.map((op) => (
              <OperationRow key={op.name} operation={op} />
            ))}
          </div>
        </section>
      )}

      {/* Locations */}
      {seedData.locations.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="text-muted-foreground size-4" />
            Locations
            <Badge variant="secondary">
              {countLocations(seedData.locations)}
            </Badge>
          </h3>
          <div className="bg-muted/50 rounded-lg border p-3">
            <div className="flex flex-col gap-1">
              {seedData.locations.map((loc) => (
                <LocationTree key={loc.name} location={loc} depth={0} />
              ))}
            </div>
          </div>
        </section>
      )}

      {totalEntities === 0 && (
        <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          No pre-configured entities — you&apos;ll start with a clean slate.
        </div>
      )}

      {/* Error */}
      {applyMutation.isError && (
        <div className="bg-destructive/10 text-destructive rounded-lg border p-3 text-sm">
          Something went wrong: {applyMutation.error.message}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={applyMutation.isPending}
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={handleApply}
          disabled={applyMutation.isPending}
        >
          {applyMutation.isPending ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <Check className="mr-1.5 size-4" />
          )}
          Apply &amp; finish
        </Button>
      </div>
    </div>
  );
}

function LotTypeRow({ lotType: it }: { lotType: SeedLotType }) {
  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 size-3 shrink-0 rounded-full"
          style={{ backgroundColor: it.color ?? "#6B7280" }}
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{it.name}</div>
          {it.description && (
            <div className="text-muted-foreground text-xs">
              {it.description}
            </div>
          )}
        </div>
        {it.codePrefix && (
          <Badge
            variant="outline"
            className="text-muted-foreground text-[10px]"
          >
            {it.codePrefix}-###
          </Badge>
        )}
      </div>

      {/* Statuses as flow */}
      <div className="flex flex-wrap items-center gap-1 pl-6">
        {it.statuses.map((s, i) => (
          <span key={s.name} className="flex items-center gap-1">
            <Badge
              variant={
                s.category === "unstarted"
                  ? "default"
                  : s.category === "done" || s.category === "canceled"
                    ? "secondary"
                    : "outline"
              }
              className="text-[10px]"
            >
              {s.name}
            </Badge>
            {i < it.statuses.length - 1 && (
              <ArrowRight className="text-muted-foreground/50 size-2.5" />
            )}
          </span>
        ))}
      </div>

      {/* Variants */}
      {it.variants && it.variants.length > 0 && (
        <div className="flex items-start gap-1.5 pl-6">
          <Tag className="text-muted-foreground mt-0.5 size-3 shrink-0" />
          <div className="flex flex-wrap gap-1">
            {it.variants.map((v) => (
              <Badge
                key={v.name}
                variant="outline"
                className="text-[10px] font-normal"
              >
                {v.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Attributes */}
      {it.attributes && it.attributes.length > 0 && (
        <div className="flex items-start gap-1.5 pl-6">
          <Columns3 className="text-muted-foreground mt-0.5 size-3 shrink-0" />
          <div className="flex flex-wrap gap-1">
            {it.attributes.map((a) => (
              <Badge
                key={a.attrKey}
                variant="outline"
                className="text-[10px] font-normal"
              >
                {a.attrKey.replace(/_/g, " ")}
                {a.unit ? ` (${a.unit})` : ""}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OperationRow({ operation: op }: { operation: SeedOperationType }) {
  const inputs = op.inputs ?? [];
  const lotInputs = inputs.filter((i) => i.type === "lots");
  const fieldInputs = inputs.filter((i) => i.type !== "lots");
  const hasInputs = inputs.length > 0;

  return (
    <div className="flex items-start gap-3 p-3">
      <div
        className="mt-0.5 size-3 shrink-0 rounded-full"
        style={{ backgroundColor: op.color ?? "#6B7280" }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{op.name}</div>
        {op.description && (
          <div className="text-muted-foreground text-xs">{op.description}</div>
        )}
        {hasInputs && (
          <div className="mt-1 flex flex-wrap gap-1">
            {lotInputs.map((inp) => (
              <Badge
                key={inp.referenceKey}
                variant="outline"
                className="text-[10px] font-normal"
              >
                <Box className="mr-0.5 size-2.5" />
                {inp.type === "lots" && "config" in inp
                  ? (inp.config as { lotTypeName?: string }).lotTypeName
                  : inp.referenceKey}
              </Badge>
            ))}
            {fieldInputs.map((inp) => (
              <Badge
                key={inp.referenceKey}
                variant="outline"
                className="text-[10px] font-normal"
              >
                <FileText className="mr-0.5 size-2.5" />
                {inp.label ?? inp.referenceKey}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {op.category && (
        <Badge
          variant="secondary"
          className="text-muted-foreground shrink-0 text-[10px]"
        >
          {op.category}
        </Badge>
      )}
    </div>
  );
}

function LocationTree({
  location,
  depth,
}: {
  location: SeedLocation;
  depth: number;
}) {
  return (
    <>
      <div
        className="flex items-center gap-2"
        style={{ paddingLeft: depth * 16 }}
      >
        <MapPin className="text-muted-foreground size-3" />
        <span className="text-sm">{location.name}</span>
        <span className="text-muted-foreground text-[10px]">
          ({location.type})
        </span>
      </div>
      {location.children?.map((child) => (
        <LocationTree key={child.name} location={child} depth={depth + 1} />
      ))}
    </>
  );
}

function countLocations(locs: SeedLocation[]): number {
  let count = 0;
  for (const loc of locs) {
    count += 1;
    if (loc.children) {
      count += countLocations(loc.children);
    }
  }
  return count;
}
