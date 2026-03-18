"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Play,
  Search,
  X,
  Zap,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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

type SuggestedOperation = RouterOutputs["operation"]["suggest"][number];
type ExecuteResult = RouterOutputs["operation"]["execute"];

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function OperationsPage() {
  const params = useParams<{ org: string }>();

  // Item selection
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Workflow state
  const [chosenOp, setChosenOp] = useState<SuggestedOperation | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<ExecuteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Queries
  const itemsQuery = api.item.list.useQuery();
  const items = itemsQuery.data ?? [];

  const suggestQuery = api.operation.suggest.useQuery(
    { itemIds: selectedItemIds },
    { enabled: selectedItemIds.length > 0 },
  );

  const opTypeQuery = api.operationType.getById.useQuery(
    { id: chosenOp?.operationType.id ?? "" },
    { enabled: !!chosenOp },
  );

  const executeMutation = api.operation.execute.useMutation();

  // Search filtering
  const searchResults = itemSearch.trim()
    ? items.filter(
        (l) =>
          l.code.toLowerCase().includes(itemSearch.toLowerCase()) &&
          !selectedItemIds.includes(l.id),
      )
    : [];

  const selectedItems = items.filter((l) => selectedItemIds.includes(l.id));

  const addItem = (id: string) => {
    setSelectedItemIds((prev) => [...prev, id]);
    setItemSearch("");
    setChosenOp(null);
    setResult(null);
    setError(null);
  };

  const removeItem = (id: string) => {
    setSelectedItemIds((prev) => prev.filter((x) => x !== id));
    setChosenOp(null);
    setResult(null);
    setError(null);
  };

  const selectOperation = (suggestion: SuggestedOperation) => {
    setChosenOp(suggestion);
    setFieldValues({});
    setResult(null);
    setError(null);
  };

  const handleExecute = async () => {
    if (!chosenOp) return;

    // Build the items map: portRole → item IDs from the suggestion's port matches
    const itemsMap: Record<string, string[]> = {};
    for (const port of chosenOp.ports) {
      if (port.matchedItemIds.length > 0) {
        itemsMap[port.portRole] = port.matchedItemIds;
      }
    }

    setError(null);
    try {
      const res = await executeMutation.mutateAsync({
        operationTypeId: chosenOp.operationType.id,
        items: itemsMap,
        fields: fieldValues,
      });
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Execution failed");
    }
  };

  const reset = () => {
    setSelectedItemIds([]);
    setChosenOp(null);
    setFieldValues({});
    setResult(null);
    setError(null);
    setItemSearch("");
  };

  return (
    <div className="container mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Record Task</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Scan or pick items, then choose a task to record.
        </p>
      </div>

      {/* Results view */}
      {result && (
        <ResultsView result={result} onReset={reset} />
      )}

      {!result && (
        <div className="space-y-6">
          {/* Step 1: Select items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-xs font-bold">
                  1
                </span>
                Scan or Pick Items
              </CardTitle>
              <CardDescription>
                Search by code to add items for this task.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
                <Input
                  placeholder="Search by code..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Search dropdown */}
              {searchResults.length > 0 && (
                <div className="border-border mt-1 max-h-48 overflow-y-auto rounded-md border">
                  {searchResults.slice(0, 20).map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      className="hover:bg-muted flex w-full items-center justify-between px-3 py-2 text-left text-sm"
                      onClick={() => addItem(l.id)}
                    >
                      <span className="font-medium">{l.code}</span>
                      <span className="text-muted-foreground text-xs">
                        {l.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected items */}
              {selectedItems.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedItems.map((l) => (
                    <Badge
                      key={l.id}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {l.code}
                      <button
                        type="button"
                        onClick={() => removeItem(l.id)}
                        className="hover:bg-muted rounded-full p-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Suggested operations */}
          {selectedItemIds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-xs font-bold">
                    2
                  </span>
                  What are you doing?
                </CardTitle>
                <CardDescription>
                  Tasks ranked by how well they match the selected items.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {suggestQuery.isLoading && (
                  <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
                    <Loader2 className="size-4 animate-spin" />
                    Finding matching tasks...
                  </div>
                )}

                {suggestQuery.data && suggestQuery.data.length === 0 && (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    No matching tasks for the selected items.
                  </p>
                )}

                <div className="space-y-2">
                  {suggestQuery.data?.map((suggestion) => (
                    <button
                      key={suggestion.operationType.id}
                      type="button"
                      onClick={() => selectOperation(suggestion)}
                      className={`border-border hover:border-foreground/20 w-full rounded-md border px-4 py-3 text-left transition-colors ${
                        chosenOp?.operationType.id ===
                        suggestion.operationType.id
                          ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {suggestion.operationType.name}
                          </span>
                          {suggestion.ready ? (
                            <Badge
                              variant="ghost"
                              className="bg-green-300/20 text-xs text-green-600"
                            >
                              <CheckCircle2 className="mr-0.5 size-3" />
                              Ready
                            </Badge>
                          ) : (
                            <Badge
                              variant="ghost"
                              className="bg-yellow-300/20 text-xs text-yellow-700"
                            >
                              <AlertCircle className="mr-0.5 size-3" />
                              Needs more items
                            </Badge>
                          )}
                        </div>
                        <ChevronRight className="text-muted-foreground size-4" />
                      </div>
                      {suggestion.operationType.description && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {suggestion.operationType.description}
                        </p>
                      )}
                      
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Fill fields & execute */}
          {chosenOp && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-xs font-bold">
                    3
                  </span>
                  Fill in Details
                </CardTitle>
                <CardDescription>
                  Fill in any required fields, then record the task.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldInputs
                  opTypeData={opTypeQuery.data}
                  isLoading={opTypeQuery.isLoading}
                  fieldValues={fieldValues}
                  setFieldValues={setFieldValues}
                />

                {error && (
                  <div className="bg-destructive/10 text-destructive mt-4 rounded-md px-3 py-2 text-sm">
                    {error}
                  </div>
                )}

                <div className="mt-5">
                  <Button
                    onClick={handleExecute}
                    disabled={executeMutation.isPending || !chosenOp.ready}
                    className="gap-2"
                  >
                    {executeMutation.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Recording...
                      </>
                    ) : (
                      <>
                        <Play className="size-4" />
                        Record {chosenOp.operationType.name}
                      </>
                    )}
                  </Button>
                  {!chosenOp.ready && (
                    <p className="text-muted-foreground mt-2 text-xs">
                      Not all required items are present. Add more items or
                      choose a different task.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field Inputs
// ---------------------------------------------------------------------------

function FieldInputs({
  opTypeData,
  isLoading,
  fieldValues,
  setFieldValues,
}: {
  opTypeData:
    | RouterOutputs["operationType"]["getById"]
    | undefined;
  isLoading: boolean;
  fieldValues: Record<string, unknown>;
  setFieldValues: React.Dispatch<
    React.SetStateAction<Record<string, unknown>>
  >;
}) {
  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-3 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading fields...
      </div>
    );
  }

  const fields = opTypeData?.fields ?? [];

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

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields
        .filter((f) => !f.isAuto)
        .map((field) => (
          <div key={field.id} className="space-y-1.5">
            <label className="text-sm font-medium">
              {field.key}
              {field.isRequired && (
                <span className="text-destructive ml-0.5">*</span>
              )}
            </label>
            {field.description && (
              <p className="text-muted-foreground text-xs">
                {field.description}
              </p>
            )}

            {field.fieldType === "select" && field.enumOptions ? (
              <Select
                value={(fieldValues[field.key] as string) ?? ""}
                onValueChange={(v) => updateField(field.key, v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={`Select ${field.key}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.enumOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.fieldType === "boolean" ? (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!fieldValues[field.key]}
                  onChange={(e) =>
                    updateField(field.key, e.target.checked)
                  }
                  className="size-4 rounded"
                />
                <span className="text-sm">Yes</span>
              </label>
            ) : field.fieldType === "number" ||
              field.fieldType === "weight" ||
              field.fieldType === "temperature" ? (
              <Input
                type="number"
                step="any"
                placeholder={field.key}
                value={(fieldValues[field.key] as string) ?? ""}
                onChange={(e) =>
                  updateField(
                    field.key,
                    e.target.value ? Number(e.target.value) : "",
                  )
                }
              />
            ) : field.fieldType === "date" ||
              field.fieldType === "datetime" ? (
              <Input
                type={field.fieldType === "datetime" ? "datetime-local" : "date"}
                value={(fieldValues[field.key] as string) ?? ""}
                onChange={(e) => updateField(field.key, e.target.value)}
              />
            ) : (
              <Input
                placeholder={field.key}
                value={(fieldValues[field.key] as string) ?? ""}
                onChange={(e) => updateField(field.key, e.target.value)}
              />
            )}
          </div>
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results view
// ---------------------------------------------------------------------------

function ResultsView({
  result,
  onReset,
}: {
  result: ExecuteResult;
  onReset: () => void;
}) {
  const failedSteps = result.steps.filter((s) => !s.skipped && !s.success);
  const hasErrors = failedSteps.length > 0;
  const executedCount = result.steps.filter((s) => !s.skipped).length;
  const skippedCount = result.steps.filter((s) => s.skipped).length;
  const succeededCount = executedCount - failedSteps.length;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <Card
        className={
          hasErrors
            ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
            : "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
        }
      >
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                hasErrors
                  ? "bg-red-100 dark:bg-red-900/40"
                  : "bg-green-100 dark:bg-green-900/40"
              }`}
            >
              {hasErrors ? (
                <AlertCircle className="size-5 text-red-600" />
              ) : (
                <CheckCircle2 className="size-5 text-green-600" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">
                {hasErrors
                  ? "Task completed with errors"
                  : "Done!"}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {succeededCount} step(s) succeeded
                {failedSteps.length > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    , {failedSteps.length} failed
                  </span>
                )}
                {skippedCount > 0 && <>, {skippedCount} skipped</>}.
              </p>

              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                {result.itemsCreated.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Zap className="size-3.5 text-blue-500" />
                    <span>
                      {result.itemsCreated.length} created
                    </span>
                  </div>
                )}
                {result.itemsUpdated.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-green-500" />
                    <span>
                      {result.itemsUpdated.length} updated
                    </span>
                  </div>
                )}
                {result.lineageCreated > 0 && (
                  <div className="flex items-center gap-1.5">
                    <ChevronRight className="size-3.5 text-purple-500" />
                    <span>
                      {result.lineageCreated} connection(s)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Show failed steps only if there were errors */}
      {hasErrors && (
        <Card>
          <CardHeader>
            <CardTitle>Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {failedSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-md bg-red-50 px-3 py-2 dark:bg-red-950/20"
                >
                  <div className="mt-0.5 shrink-0">
                    <div className="flex size-5 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40">
                      <X className="size-3" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">
                      {step.stepName}
                    </span>
                    {step.detail && (
                      <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                        {step.detail}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action */}
      <div className="flex gap-3">
        <Button onClick={onReset} variant="outline">
          Record Another Task
        </Button>
      </div>
    </div>
  );
}
