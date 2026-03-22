import type { RouterOutputs } from "~/trpc/react";

// --- Data types derived from tRPC outputs ---

export type LotWithType = RouterOutputs["lot"]["getByCode"];
export type ScannedLocationData = RouterOutputs["location"]["getByName"];
export type NonNullLocation = NonNullable<ScannedLocationData>;
export type SuggestedOperation = RouterOutputs["operation"]["suggest"][number];
export type ExecuteResult = RouterOutputs["operation"]["execute"];

// --- Scanned item: the unified type for anything the user has scanned ---

export type ScannedItem =
  | { kind: "lot"; lot: LotWithType; rawCode: string; formatName?: string }
  | {
      kind: "location";
      location: NonNullLocation;
      rawCode: string;
      formatName?: string;
    }
  | { kind: "unknown"; rawCode: string; formatName?: string };

// --- Scan context: derived from the list of scanned items ---

export interface ScanContext {
  items: ScannedItem[];
  lots: Array<{ lot: LotWithType; rawCode: string; formatName?: string }>;
  locations: Array<{
    location: NonNullLocation;
    rawCode: string;
    formatName?: string;
  }>;
  unknowns: Array<{ rawCode: string; formatName?: string }>;
}

export function buildScanContext(items: ScannedItem[]): ScanContext {
  const lots: ScanContext["lots"] = [];
  const locations: ScanContext["locations"] = [];
  const unknowns: ScanContext["unknowns"] = [];

  for (const item of items) {
    switch (item.kind) {
      case "lot":
        lots.push({
          lot: item.lot,
          rawCode: item.rawCode,
          formatName: item.formatName,
        });
        break;
      case "location":
        locations.push({
          location: item.location,
          rawCode: item.rawCode,
          formatName: item.formatName,
        });
        break;
      case "unknown":
        unknowns.push({ rawCode: item.rawCode, formatName: item.formatName });
        break;
    }
  }

  return { items, lots, locations, unknowns };
}

// --- Workflow framework types ---

export interface WorkflowMatch {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  ready: boolean;
  priority: number;
}

export interface WorkflowResult {
  message: string;
  updatedItems?: ScannedItem[];
}

export interface WorkflowPanelProps {
  ctx: ScanContext;
  onComplete: (result: WorkflowResult) => void;
}

export interface ScanWorkflow {
  id: string;
  match(ctx: ScanContext): WorkflowMatch | null;
  Panel: React.ComponentType<WorkflowPanelProps>;
}
