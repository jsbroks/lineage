import { useCallback, useMemo, useState } from "react";
import { Cog, CheckCircle2, MapPin, Package } from "lucide-react";

import { api, type RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type {
  ScanContext,
  ScanWorkflow,
  WorkflowMatch,
  WorkflowPanelProps,
} from "./types";

type OpTypeWithInputs =
  RouterOutputs["operationType"]["listWithInputs"][number];
type OpInput = OpTypeWithInputs["inputs"][number];

interface InputMatch {
  input: OpInput;
  value: unknown;
}

interface MatchResult {
  matchedInputs: InputMatch[];
  unmatchedScanInputs: OpInput[];
  promptInputs: OpInput[];
  score: number;
  allRequiredScanInputsSatisfied: boolean;
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

function matchLocationInput(inp: OpInput, ctx: ScanContext): InputMatch | null {
  if (ctx.locations.length === 0) return null;
  return { input: inp, value: ctx.locations[0]!.location.id };
}

function matchLotsInput(inp: OpInput, ctx: ScanContext): InputMatch | null {
  const lotConfig = inp.lotConfig;

  const matchingLots = lotConfig
    ? ctx.lots.filter((lot) => {
        if (lot.lotType.id !== lotConfig.lotTypeId) return false;
        const statuses = lotConfig.preconditionsStatuses;
        if (!statuses || statuses.length === 0) return true;
        return !!lot.lotStatus?.name && statuses.includes(lot.lotStatus.name);
      })
    : ctx.lots;

  if (matchingLots.length === 0) return null;

  const lotIds = matchingLots.map((l) => l.lot.id);
  return { input: inp, value: lotIds };
}

function evaluateOperationType(
  opType: OpTypeWithInputs,
  ctx: ScanContext,
): MatchResult | null {
  const matchedInputs: InputMatch[] = [];
  const unmatchedScanInputs: OpInput[] = [];
  const promptInputs: OpInput[] = [];

  for (const inp of opType.inputs) {
    if (inp.type !== "locations" && inp.type !== "lots") {
      promptInputs.push(inp);
      continue;
    }

    const match =
      inp.type === "locations"
        ? matchLocationInput(inp, ctx)
        : matchLotsInput(inp, ctx);

    if (match) {
      matchedInputs.push(match);
    } else {
      unmatchedScanInputs.push(inp);
    }
  }

  if (matchedInputs.length === 0) return null;

  const totalScanInputs = matchedInputs.length + unmatchedScanInputs.length;

  return {
    matchedInputs,
    unmatchedScanInputs,
    promptInputs,
    score: totalScanInputs > 0 ? matchedInputs.length / totalScanInputs : 0,
    allRequiredScanInputsSatisfied: unmatchedScanInputs.every(
      (inp) => !inp.required,
    ),
  };
}

function buildMatchDescription(result: MatchResult): string {
  const parts: string[] = [];

  const lotMatches = result.matchedInputs.filter(
    (m) => m.input.type === "lots",
  );
  if (lotMatches.length > 0) {
    const n = lotMatches.reduce(
      (sum, m) => sum + (m.value as string[]).length,
      0,
    );
    parts.push(`${n} lot${n !== 1 ? "s" : ""}`);
  }

  const locMatches = result.matchedInputs.filter(
    (m) => m.input.type === "locations",
  );
  if (locMatches.length > 0) {
    parts.push(
      `${locMatches.length} location${locMatches.length !== 1 ? "s" : ""}`,
    );
  }

  const extra = result.promptInputs.length;
  return (
    parts.join(" and ") +
    " matched" +
    (extra > 0 ? `. ${extra} more input${extra !== 1 ? "s" : ""} needed.` : ".")
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

function OperationPanel({
  opType,
  matchResult,
  ctx,
  onComplete,
}: WorkflowPanelProps & {
  opType: OpTypeWithInputs;
  matchResult: MatchResult;
}) {
  const executeMutation = api.operation.execute.useMutation();
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);

  const setField = useCallback((key: string, value: unknown) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleExecute = async () => {
    setError(null);

    const inputs: Record<string, unknown> = {};

    for (const { input, value } of matchResult.matchedInputs) {
      inputs[input.referenceKey] = value;
    }

    for (const inp of matchResult.promptInputs) {
      const val = fieldValues[inp.referenceKey] ?? inp.defaultValue ?? null;
      if (inp.required && (val === null || val === undefined || val === "")) {
        setError(`"${inp.label ?? inp.referenceKey}" is required`);
        return;
      }
      if (val !== null && val !== undefined && val !== "") {
        inputs[inp.referenceKey] = val;
      }
    }

    try {
      await executeMutation.mutateAsync({
        operationTypeId: opType.id,
        inputs,
      });
      onComplete({ message: `${opType.name} completed successfully.` });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
    }
  };

  const matchedLotNames = matchResult.matchedInputs
    .filter((m) => m.input.type === "lots")
    .flatMap((m) => {
      const ids = m.value as string[];
      return ids.map(
        (id) => ctx.lots.find((l) => l.lot.id === id)?.lot.code ?? id,
      );
    });

  const matchedLocationNames = matchResult.matchedInputs
    .filter((m) => m.input.type === "locations")
    .map((m) => {
      const locId = m.value as string;
      return (
        ctx.locations.find((l) => l.location.id === locId)?.location.name ??
        locId
      );
    });

  const hasScannedValues =
    matchedLotNames.length > 0 || matchedLocationNames.length > 0;

  return (
    <div className="flex flex-1 flex-col space-y-3 overflow-y-auto p-4">
      {hasScannedValues && (
        <div className="space-y-1.5">
          <label className="text-muted-foreground block text-xs font-medium tracking-wide uppercase">
            From scan
          </label>
          {matchedLotNames.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Package className="text-muted-foreground size-3.5" />
              <span>{matchedLotNames.join(", ")}</span>
              <CheckCircle2 className="size-3.5 text-green-500" />
            </div>
          )}
          {matchedLocationNames.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="text-muted-foreground size-3.5" />
              <span>{matchedLocationNames.join(", ")}</span>
              <CheckCircle2 className="size-3.5 text-green-500" />
            </div>
          )}
        </div>
      )}

      {matchResult.promptInputs.length > 0 && (
        <div className="space-y-3">
          <label className="text-muted-foreground block text-xs font-medium tracking-wide uppercase">
            Additional inputs
          </label>
          {matchResult.promptInputs.map((inp) => (
            <FieldInput
              key={inp.id}
              input={inp}
              value={fieldValues[inp.referenceKey]}
              onChange={(v) => setField(inp.referenceKey, v)}
            />
          ))}
        </div>
      )}

      {error && <p className="text-destructive text-xs">{error}</p>}

      <Button
        disabled={executeMutation.isPending}
        onClick={() => void handleExecute()}
      >
        {executeMutation.isPending ? "Executing..." : `Execute ${opType.name}`}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field inputs
// ---------------------------------------------------------------------------

function FieldLabel({ label, required }: { label: string; required: boolean }) {
  return (
    <label className="text-sm font-medium">
      {label}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

function FieldInput({
  input,
  value,
  onChange,
}: {
  input: OpInput;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const label = input.label ?? input.referenceKey;
  const options = input.options as Record<string, string> | null | undefined;

  if (input.type === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id={input.id}
          checked={!!value}
          onCheckedChange={(checked) => onChange(!!checked)}
        />
        <label htmlFor={input.id} className="text-sm font-medium">
          {label}
          {input.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      </div>
    );
  }

  if (input.type === "select") {
    return (
      <div className="space-y-1.5">
        <FieldLabel label={label} required={input.required} />
        <Select
          value={(value as string) ?? ""}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={`Select ${label.toLowerCase()}...`} />
          </SelectTrigger>
          <SelectContent>
            {options &&
              Object.entries(options).map(([key, display]) => (
                <SelectItem key={key} value={key}>
                  {String(display)}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (input.type === "notes") {
    return (
      <div className="space-y-1.5">
        <FieldLabel label={label} required={input.required} />
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={input.description ?? undefined}
          rows={3}
        />
      </div>
    );
  }

  const numericTypes = ["number", "weight", "temperature"];
  if (numericTypes.includes(input.type)) {
    return (
      <div className="space-y-1.5">
        <FieldLabel label={label} required={input.required} />
        <Input
          type="number"
          value={(value as string) ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
          placeholder={input.description ?? undefined}
        />
      </div>
    );
  }

  const htmlType =
    input.type === "date"
      ? "date"
      : input.type === "datetime"
        ? "datetime-local"
        : "text";

  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} required={input.required} />
      <Input
        type={htmlType}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder={input.description ?? undefined}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useOperationWorkflowsFinder = (
  ctx: ScanContext,
): ScanWorkflow[] => {
  const opTypesQuery = api.operationType.listWithInputs.useQuery();

  return useMemo(() => {
    if (!opTypesQuery.data) return [];

    const workflows: ScanWorkflow[] = [];

    for (const opType of opTypesQuery.data) {
      if (opType.inputs.length === 0) continue;

      const hasScanInputs = opType.inputs.some(
        (inp) => inp.type === "locations" || inp.type === "lots",
      );
      if (!hasScanInputs) continue;

      const initialResult = evaluateOperationType(opType, ctx);
      if (!initialResult) continue;

      workflows.push({
        id: `op-${opType.id}`,

        match(_ctx: ScanContext): WorkflowMatch | null {
          const result = evaluateOperationType(opType, _ctx);
          if (!result) return null;

          const ready =
            result.allRequiredScanInputsSatisfied &&
            result.promptInputs.every((i) => !i.required);

          return {
            label: opType.name,
            description: buildMatchDescription(result),
            icon: Cog,
            ready,
            priority: 50 + Math.round(result.score * 40),
          };
        },

        Panel: (props: WorkflowPanelProps) => (
          <OperationPanel
            {...props}
            opType={opType}
            matchResult={
              evaluateOperationType(opType, props.ctx) ?? initialResult
            }
          />
        ),
      });
    }

    return workflows;
  }, [opTypesQuery.data, ctx]);
};
