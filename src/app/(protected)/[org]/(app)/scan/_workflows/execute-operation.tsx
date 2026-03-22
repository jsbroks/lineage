"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Play, Zap } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";
import type {
  ScanWorkflow,
  ScanContext,
  WorkflowPanelProps,
  SuggestedOperation,
} from "./types";

function ExecuteOperationPanel({ ctx, onComplete }: WorkflowPanelProps) {
  const lotIds = ctx.lots.map((l) => l.lot.lot.id);

  const suggestQuery = api.operation.suggest.useQuery(
    { lotIds },
    { enabled: lotIds.length > 0 },
  );

  const [chosenOp, setChosenOp] = useState<SuggestedOperation | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [executeError, setExecuteError] = useState<string | null>(null);

  const opTypeQuery = api.operationType.getById.useQuery(
    { id: chosenOp?.operationType.id ?? "" },
    { enabled: !!chosenOp },
  );

  const executeMutation = api.operation.execute.useMutation();

  useEffect(() => {
    const suggestions = suggestQuery.data ?? [];
    if (chosenOp) {
      const stillExists = suggestions.find(
        (s) => s.operationType.id === chosenOp.operationType.id,
      );
      if (stillExists) {
        setChosenOp(stillExists);
        return;
      }
    }
    if (suggestions.length > 0) {
      setChosenOp(suggestions[0]!);
      setFieldValues({});
    } else {
      setChosenOp(null);
      setFieldValues({});
    }
  }, [suggestQuery.data]);

  const handleExecute = async () => {
    if (!chosenOp) return;
    setExecuteError(null);

    const lotsByType = new Map<string, string[]>();
    for (const l of ctx.lots) {
      const arr = lotsByType.get(l.lot.lot.lotTypeId) ?? [];
      arr.push(l.lot.lot.id);
      lotsByType.set(l.lot.lot.lotTypeId, arr);
    }

    const inputs: Record<string, unknown> = { ...fieldValues };
    for (const port of chosenOp.ports) {
      const ids = lotsByType.get(port.lotTypeId) ?? [];
      if (ids.length > 0) inputs[port.referenceKey] = ids;
    }

    if (ctx.locations[0]?.location.id) {
      inputs._locationId = ctx.locations[0].location.id;
    }

    try {
      await executeMutation.mutateAsync({
        operationTypeId: chosenOp.operationType.id,
        inputs,
      });
      onComplete({
        message: `${chosenOp.operationType.name} executed successfully.`,
      });
    } catch (e: unknown) {
      setExecuteError(e instanceof Error ? e.message : "Execution failed");
    }
  };

  return (
    <>
      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        <div className="mb-4">
          <label className="text-muted-foreground mb-1.5 block text-xs font-medium tracking-wide uppercase">
            Operation
          </label>

          {suggestQuery.isLoading && (
            <div className="text-muted-foreground flex items-center gap-2 py-3 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Finding matching operations...
            </div>
          )}

          <div className="space-y-2">
            {suggestQuery.data?.map((suggestion) => {
              const isSelected =
                chosenOp?.operationType.id === suggestion.operationType.id;
              return (
                <button
                  key={suggestion.operationType.id}
                  type="button"
                  onClick={() => {
                    setChosenOp(suggestion);
                    setFieldValues({});
                    setExecuteError(null);
                  }}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                      : "border-border hover:border-foreground/20"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-sm font-medium">
                      {suggestion.operationType.name}
                    </span>
                    {suggestion.ready ? (
                      <Badge
                        variant="ghost"
                        className="bg-green-100 text-[10px] text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      >
                        <CheckCircle2 className="mr-0.5 size-3" />
                        Ready
                      </Badge>
                    ) : (
                      <Badge
                        variant="ghost"
                        className="bg-yellow-100 text-[10px] text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      >
                        <AlertCircle className="mr-0.5 size-3" />
                        Needs lots
                      </Badge>
                    )}
                  </div>
                  {suggestion.operationType.description && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {suggestion.operationType.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {!suggestQuery.isLoading &&
            (suggestQuery.data?.length ?? 0) === 0 && (
              <p className="text-muted-foreground py-3 text-sm">
                No matching operations for these lots.
              </p>
            )}
        </div>

        {chosenOp && (
          <div className="flex-1">
            <label className="text-muted-foreground mb-1.5 block text-xs font-medium tracking-wide uppercase">
              Details
            </label>
            <FieldInputs
              opTypeData={opTypeQuery.data}
              isLoading={opTypeQuery.isLoading}
              fieldValues={fieldValues}
              setFieldValues={setFieldValues}
            />
          </div>
        )}
      </div>

      {chosenOp && (
        <div className="border-t p-4">
          {executeError && (
            <div className="bg-destructive/10 text-destructive mb-3 rounded-md px-3 py-2 text-sm">
              {executeError}
            </div>
          )}
          <Button
            onClick={() => void handleExecute()}
            disabled={executeMutation.isPending || !chosenOp.ready}
            className="w-full gap-2"
            size="lg"
          >
            {executeMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <Play className="size-4" />
                Execute {chosenOp.operationType.name}
              </>
            )}
          </Button>
          {!chosenOp.ready && (
            <p className="text-muted-foreground mt-2 text-center text-xs">
              Not all required lots are present. Scan more lots or choose a
              different operation.
            </p>
          )}
        </div>
      )}
    </>
  );
}

// --- Inline FieldInputs (only used here) ---

function FieldInputs({
  opTypeData,
  isLoading,
  fieldValues,
  setFieldValues,
}: {
  opTypeData: RouterOutputs["operationType"]["getById"] | undefined;
  isLoading: boolean;
  fieldValues: Record<string, unknown>;
  setFieldValues: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
}) {
  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-3 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading fields...
      </div>
    );
  }

  const allInputs = opTypeData?.inputs ?? [];
  const fields = allInputs.filter((inp) => inp.type !== "lots");

  if (fields.length === 0) {
    return (
      <p className="text-muted-foreground py-2 text-sm">
        No input fields required.
      </p>
    );
  }

  const updateField = (key: string, value: unknown) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const enumOpts = (field: (typeof fields)[number]) =>
    (field.options as { enum?: string[] } | null)?.enum ?? null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <label className="text-sm font-medium">
            {field.label ?? field.referenceKey}
            {field.required && (
              <span className="text-destructive ml-0.5">*</span>
            )}
          </label>
          {field.description && (
            <p className="text-muted-foreground text-xs">{field.description}</p>
          )}

          {field.type === "select" && enumOpts(field) ? (
            <Select
              value={(fieldValues[field.referenceKey] as string) ?? ""}
              onValueChange={(v) => updateField(field.referenceKey, v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={`Select ${field.referenceKey}`} />
              </SelectTrigger>
              <SelectContent>
                {enumOpts(field)!.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : field.type === "boolean" ? (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!fieldValues[field.referenceKey]}
                onChange={(e) =>
                  updateField(field.referenceKey, e.target.checked)
                }
                className="size-4 rounded"
              />
              <span className="text-sm">Yes</span>
            </label>
          ) : field.type === "number" ||
            field.type === "weight" ||
            field.type === "temperature" ? (
            <Input
              type="number"
              step="any"
              placeholder={field.referenceKey}
              value={(fieldValues[field.referenceKey] as string) ?? ""}
              onChange={(e) =>
                updateField(
                  field.referenceKey,
                  e.target.value ? Number(e.target.value) : "",
                )
              }
            />
          ) : field.type === "date" || field.type === "datetime" ? (
            <Input
              type={field.type === "datetime" ? "datetime-local" : "date"}
              value={(fieldValues[field.referenceKey] as string) ?? ""}
              onChange={(e) => updateField(field.referenceKey, e.target.value)}
            />
          ) : (
            <Input
              placeholder={field.referenceKey}
              value={(fieldValues[field.referenceKey] as string) ?? ""}
              onChange={(e) => updateField(field.referenceKey, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export const executeOperationWorkflow: ScanWorkflow = {
  id: "execute-operation",
  match(ctx: ScanContext) {
    if (ctx.lots.length === 0) return null;
    return {
      label: "Execute Operation",
      description: `Run an operation on ${ctx.lots.length} lot(s)`,
      icon: Zap,
      ready: true,
      priority: 50,
    };
  },
  Panel: ExecuteOperationPanel,
};
