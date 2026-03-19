import { getTargetItems } from "../context";
import type { ActionHandler, ExecCtx, Item, Tx } from "../types";
import { z } from "zod";
import _ from "lodash";

// ── Schemas ──────────────────────────────────────────────────────────────

const fromRefSchema = z.object({
  from: z.array(z.string()),
});

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const resolvableValueSchema = z.union([literalSchema, fromRefSchema]);

const configSchema = z.object({
  status: resolvableValueSchema.nullable().optional(),
  attributes: z.record(z.string(), resolvableValueSchema).nullable().optional(),
});

// ── Inferred types ───────────────────────────────────────────────────────
type LiteralValue = z.infer<typeof literalSchema>;
type ResolvableValue = z.infer<typeof resolvableValueSchema>;

const attrSchema = z.record(z.string(), literalSchema);

type ItemChanges = Record<string, Partial<Omit<Item, "id">>>;

/**
 * Composite action that can set status and/or multiple attributes on target
 * items in a single step.
 *
 * Expected config shape (from step.value):
 *   status: "Approved"                              // status name
 *   attributes:
 *     Key: value                                     // literal
 *     Key: { from: ["inputs", "Field"] }  // array ref
 */
export const setItem: ActionHandler = async (tx, step, configData, ctx) => {
  const config = configSchema.safeParse(configData);
  if (!config.success) return `Invalid config: ${config.error.message}`;

  const targets = getTargetItems(step.target, ctx);
  if (targets.length === 0)
    return step.target
      ? `Unknown able to update items type in "${step.target}"`
      : "No item type specified for updating";

  const { status, attributes } = config.data;
  const statusChanges = await applyStatus(tx, status, targets, ctx);
  const attrChanges = await applyAttributes(tx, attributes, targets, ctx);
  const changes = _.merge(statusChanges.changes, attrChanges.changes);
  const countsChanges = Object.keys(changes).length;

  return `${countsChanges > 0 ? `${countsChanges} items updated.` : "No items updated."}`;
};

async function applyStatus(
  tx: Tx,
  statusDef: ResolvableValue | null | undefined,
  targets: Item[],
  ctx: ExecCtx,
): Promise<{ changes: ItemChanges; message: string }> {
  const statusName = resolveValue(statusDef, ctx);
  if (typeof statusName !== "string" || statusName.length === 0)
    return { changes: {}, message: `invalid status: ${statusDef}` };

  const changes: ItemChanges = {};
  const itemTypeId = targets[0]!.itemTypeId;
  const itemTypeStatus = ctx.itemTypes
    .get(itemTypeId)
    ?.statusDefinitions.find((sd) => sd.name === statusName);
  if (!itemTypeStatus)
    throw new Error(`Status "${statusName}" not found for item type`);
  const resolvedId = itemTypeStatus.id;

  for (const t of targets) {
    changes[t.id] = { statusId: resolvedId, updatedAt: new Date() };
    t.statusId = resolvedId;
    ctx.itemsUpdated.add(t.id);
  }

  return { changes, message: `status → ${statusName}` };
}

async function applyAttributes(
  _tx: Tx,
  attrDefs: Record<string, ResolvableValue> | null | undefined,
  targets: Item[],
  ctx: ExecCtx,
): Promise<{ changes: ItemChanges; message: string }> {
  if (attrDefs == null) return { changes: {}, message: "" };

  const changes: ItemChanges = {};
  const entries = Object.entries(attrDefs);
  const attrs = attrSchema.safeParse(attrDefs);
  if (!attrs.success)
    throw new Error(`invalid attributes: ${attrs.error.message}`);

  for (const t of targets) {
    const newAttrs = _.cloneDeep(attrs.data ?? {});
    let touched = false;

    for (const [key, def] of entries) {
      const value = resolveValue(def, ctx);
      if (value !== undefined) {
        newAttrs[key] = value;
        changes[t.id] = { attributes: newAttrs, updatedAt: new Date() };
      }
    }

    if (touched) {
      ctx.itemsUpdated.add(t.id);
    }
  }

  return { changes, message: entries.map(([k]) => k).join(", ") };
}

export function resolveValue(
  val: ResolvableValue | null | undefined,
  ctx: ExecCtx,
): LiteralValue | undefined {
  if (val == null) return val;
  if (typeof val !== "object") return val;
  if ("from" in val) {
    return _.get(ctx.inputs, val.from);
  }
  return undefined;
}
