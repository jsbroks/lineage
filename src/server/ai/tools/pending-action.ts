export const WRITE_TOOL_NAMES = [
  "updateLotStatus",
  "moveLots",
  "executeOperation",
  "bulkUpdateStatus",
  "updateAttributes",
] as const;

export type WriteToolName = (typeof WRITE_TOOL_NAMES)[number];

export type AffectedLot = {
  id: string;
  code: string;
  currentStatus?: string;
  currentLocation?: string;
};

export type PendingAction = {
  type: WriteToolName;
  description: string;
  affectedLots: AffectedLot[];
  changes: Record<string, string>;
  payload: Record<string, unknown>;
  requiresConfirmation: true;
};
