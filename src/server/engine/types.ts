import type { db as dbInstance } from "~/server/db";
import type { item, operationTypeStep } from "~/server/db/schema";

export type Tx = Parameters<
  Parameters<(typeof dbInstance)["transaction"]>[0]
>[0];

export type Lot = typeof item.$inferSelect;

export type Step = typeof operationTypeStep.$inferSelect;

export type ExecCtx = {
  /** Items keyed by port role or alias (from create_lot "as") */
  lots: Record<string, Lot[]>;
  /** User-provided field values */
  inputs: Record<string, unknown>;
  /** itemTypeId → display name (e.g. "Block", "Packaged Product") */
  itemTypeNames: Map<string, string>;
  /** Accumulate IDs for the result */
  lotsCreated: string[];
  lotsUpdated: Set<string>;
  lineageCreated: number;
  /** The operation record ID (created before steps run) */
  operationId: string;
};

export type ExecuteOperationInput = {
  operationTypeId: string;
  /** portRole → array of item IDs */
  lots: Record<string, string[]>;
  /** field key → user-provided value */
  fields: Record<string, unknown>;
  performedBy?: string | null;
  locationId?: string | null;
  notes?: string | null;
};

export type StepResult = {
  stepName: string;
  action: string;
  skipped: boolean;
  success: boolean;
  detail?: string;
};

export type ExecuteOperationResult = {
  operationId: string;
  steps: StepResult[];
  lotsCreated: string[];
  lotsUpdated: string[];
  lineageCreated: number;
};

export type ActionHandler = (
  tx: Tx,
  step: Step,
  config: Record<string, unknown>,
  ctx: ExecCtx,
) => Promise<string>;

export class ActionRegistry {
  private handlers = new Map<string, ActionHandler>();

  register(action: string, handler: ActionHandler): this {
    this.handlers.set(action, handler);
    return this;
  }

  /** Register the same handler under multiple action names. */
  registerAlias(aliases: string[], handler: ActionHandler): this {
    for (const alias of aliases) {
      this.handlers.set(alias, handler);
    }
    return this;
  }

  get(action: string): ActionHandler | undefined {
    return this.handlers.get(action);
  }

  has(action: string): boolean {
    return this.handlers.has(action);
  }

  get actions(): string[] {
    return [...this.handlers.keys()];
  }
}
