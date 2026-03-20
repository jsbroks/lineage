export const WRITE_TOOL_NAMES = [
  "updateItemStatus",
  "moveItems",
  "executeOperation",
  "bulkUpdateStatus",
  "updateAttributes",
] as const;

export type WriteToolName = (typeof WRITE_TOOL_NAMES)[number];

export type AffectedItem = {
  id: string;
  code: string;
  currentStatus?: string;
  currentLocation?: string;
};

export type PendingAction = {
  type: WriteToolName;
  description: string;
  affectedItems: AffectedItem[];
  changes: Record<string, string>;
  payload: Record<string, unknown>;
  requiresConfirmation: true;
};
