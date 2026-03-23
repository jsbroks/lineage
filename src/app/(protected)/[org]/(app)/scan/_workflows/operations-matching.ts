/**
 * Pure matching functions for scan-workflow operation matching.
 * Extracted from operations.tsx for testability.
 */

export interface OpInput {
  id: string;
  referenceKey: string;
  label: string | null;
  type: string;
  required: boolean;
  lotConfig: {
    lotTypeId: string;
    preconditionsStatuses: string[] | null;
  } | null;
  [key: string]: unknown;
}

export interface OpTypeWithInputs {
  id: string;
  name: string;
  inputs: OpInput[];
  [key: string]: unknown;
}

export interface ScanLot {
  lot: { id: string; [key: string]: unknown };
  lotType: { id: string; [key: string]: unknown };
  lotStatus: { name: string; [key: string]: unknown } | null;
  [key: string]: unknown;
}

export interface ScanLocation {
  location: { id: string; [key: string]: unknown };
  [key: string]: unknown;
}

export interface ScanContext {
  lots: ScanLot[];
  locations: ScanLocation[];
  [key: string]: unknown;
}

export interface InputMatch {
  input: OpInput;
  value: unknown;
}

export interface MatchResult {
  matchedInputs: InputMatch[];
  unmatchedScanInputs: OpInput[];
  promptInputs: OpInput[];
  score: number;
  allRequiredScanInputsSatisfied: boolean;
}

export function matchLocationInput(
  inp: OpInput,
  ctx: ScanContext,
): InputMatch | null {
  if (ctx.locations.length === 0) return null;
  return { input: inp, value: ctx.locations[0]!.location.id };
}

export function matchLotsInput(
  inp: OpInput,
  ctx: ScanContext,
): InputMatch | null {
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

export function evaluateOperationType(
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

export function buildMatchDescription(result: MatchResult): string {
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
