import type { db as dbInstance } from "~/server/db";
import type {
  item,
  ItemType,
  ItemTypeStatusDefinition,
  operationTypeStep,
} from "~/server/db/schema";

export type Tx = Parameters<
  Parameters<(typeof dbInstance)["transaction"]>[0]
>[0];

export type Item = typeof item.$inferSelect;

export type Step = typeof operationTypeStep.$inferSelect;

export type ExecCtx = {
  items: Record<string, Item[]>;
  inputs: Record<string, unknown>;

  itemTypes: Record<
    string,
    ItemType & { statusDefinitions: ItemTypeStatusDefinition[] }
  >;

  /** Accumulate IDs for the result */
  itemsCreated: string[];
  itemsUpdated: Set<string>;
  lineageCreated: number;
  /** The operation record ID (created before steps run) */
  operationId: string;
};

export type ExecuteOperationInput = {
  operationTypeId: string;
  /** portRole → array of item IDs */
  items: Record<string, string[]>;
  /** field key → user-provided value */
  fields: Record<string, unknown>;
  performedBy?: string | null;
  locationId?: string | null;
  notes?: string | null;
};

export type ActionResult = {
  action: string;
  stepName: string;
  skipped: boolean;
  success: boolean;
  detail?: string;
};
export type ExecuteOperationResult = {
  operationId: string;
  steps: ActionResult[];
  itemsCreated: string[];
  itemsUpdated: string[];
  lineageCreated: number;
};
