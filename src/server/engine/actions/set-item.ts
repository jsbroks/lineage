import { and, eq } from "drizzle-orm";
import { item, itemEvent, itemTypeStatusDefinition } from "~/server/db/schema";
import { describeItems, getTargetItems } from "../context";
import type { ActionHandler, ExecCtx, Item, Tx } from "../types";
import { z } from "zod";
import _ from "lodash";

// ── Schemas ──────────────────────────────────────────────────────────────

const fromRefSchema = z.object({
  from: z.array(z.string()),
});

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const resolvableValueSchema = z.union([literalSchema, fromRefSchema]);

const attrDefObjSchema = z.object({
  from: z.array(z.string()),
  keepExisting: z.boolean().optional(),
});

const attrDefSchema = z.union([literalSchema, attrDefObjSchema]);

const configSchema = z.object({
  status: resolvableValueSchema.nullable().optional(),
  attributes: z.record(z.string(), attrDefSchema).nullable().optional(),
});

// ── Inferred types ───────────────────────────────────────────────────────
type LiteralValue = z.infer<typeof literalSchema>;
type ResolvableValue = z.infer<typeof resolvableValueSchema>;
type AttrDef = z.infer<typeof attrDefSchema>;

/**
 * Composite action that can set status and/or multiple attributes on target
 * items in a single step.
 *
 * Expected config shape (from step.value):
 *   status: "Approved"                              // status name
 *   attributes:
 *     Key: value                                     // literal
 *     Key: { from: ["inputs", "Field"], keepExisting: true }  // array ref
 */
export const setItem: ActionHandler = async (tx, step, configData, ctx) => {
  const config = configSchema.safeParse(configData);
  if (!config.success) {
    return `invalid config: ${config.error.message}`;
  }

  const targetItems = getTargetItems(step.target, ctx);
  if (targetItems.length === 0)
    return step.target
      ? `no "${step.target}" provided`
      : "no target role specified";

  const changes: string[] = [];

  // ── Status ──────────────────────────────────────────────────────────
  const statusName = resolveValue(config.data.status, ctx);
  if (typeof statusName === "string" && statusName.length > 0) {
    const resolvedId = await resolveStatusId(
      tx,
      targetItems[0]!.itemTypeId,
      statusName,
    );

    for (const t of targetItems) {
      const oldStatus = t.statusId;
      await tx
        .update(item)
        .set({ statusId: resolvedId, updatedAt: new Date() })
        .where(eq(item.id, t.id));

      await tx.insert(itemEvent).values({
        itemId: t.id,
        eventType: "status_change",
        operationId: ctx.operationId,
        oldStatus,
        newStatus: resolvedId,
        message: `${step.name}: → ${statusName}`,
      });

      t.statusId = resolvedId;
      ctx.itemsUpdated.add(t.id);
    }
    changes.push(`status → ${statusName}`);
  }

  // ── Attributes ──────────────────────────────────────────────────────
  if (config.data.attributes) {
    const entries = Object.entries(config.data.attributes);

    for (const t of targetItems) {
      const attrs: Record<string, unknown> = {
        ...((t.attributes ?? {}) as Record<string, unknown>),
      };
      let touched = false;

      for (const [key, def] of entries) {
        const { value, keepExisting } = resolveAttrDef(def, ctx);

        if (keepExisting) {
          const cur = attrs[key];
          if (cur !== undefined && cur !== null && cur !== "") continue;
        }

        if (value !== undefined) {
          attrs[key] = value;
          touched = true;
        }
      }

      if (touched) {
        await tx
          .update(item)
          .set({ attributes: attrs, updatedAt: new Date() })
          .where(eq(item.id, t.id));

        (t as Record<string, unknown>).attributes = attrs;
        ctx.itemsUpdated.add(t.id);
      }
    }

    changes.push(entries.map(([k]) => k).join(", "));
  }

  return `set ${changes.join("; ")} on ${describeItems(targetItems, ctx)}`;
};

// ── Helpers ─────────────────────────────────────────────────────────────

async function resolveStatusId(
  tx: Tx,
  itemTypeId: string,
  statusName: string,
): Promise<string> {
  const [def] = await tx
    .select({ id: itemTypeStatusDefinition.id })
    .from(itemTypeStatusDefinition)
    .where(
      and(
        eq(itemTypeStatusDefinition.itemTypeId, itemTypeId),
        eq(itemTypeStatusDefinition.name, statusName),
      ),
    )
    .limit(1);

  if (!def) throw new Error(`Status "${statusName}" not found for item type`);
  return def.id;
}

export function resolveFromRef(parts: string[], ctx: ExecCtx): unknown {
  if (parts.length === 0) return undefined;

  const [root, ...rest] = parts;

  let value: unknown;
  if (root === "inputs") {
    const fullKey = rest.join(".");

    value = ctx.inputs[fullKey];
    if (value !== undefined || rest.length <= 1) return value;

    value = ctx.inputs[rest[0]!];
    return traverseRest(value, rest.slice(1));
  }

  const items = ctx.items[root!];
  if (items && items.length > 0) {
    const firstItem = items[0]!;
    if (rest.length === 0) return firstItem.id;
    if (rest[0] === "status") return firstItem.statusId;
    if (rest[0] === "id") return firstItem.id;
    const attrs = (firstItem.attributes ?? {}) as Record<string, unknown>;
    value = attrs[rest[0]!];
    return rest.length <= 1 ? value : traverseRest(value, rest.slice(1));
  }

  return undefined;
}

export function traverseRest(value: unknown, segments: string[]): unknown {
  let cur = value;
  for (const seg of segments) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return cur;
}

export function resolveAttrDef(
  def: AttrDef,
  ctx: ExecCtx,
): { value: unknown; keepExisting: boolean } {
  if (def === null) return { value: null, keepExisting: false };
  if (typeof def !== "object") return { value: def, keepExisting: false };

  return {
    value: resolveFromRef(def.from, ctx),
    keepExisting: def.keepExisting ?? false,
  };
}

export function resolveValue(
  val: ResolvableValue | null | undefined,
  ctx: ExecCtx,
) {
  if (val === null || val === undefined) return val;
  if (typeof val !== "object") return val;
  if ("from" in val) {
    return _.get(ctx.inputs, val.from);
  }
  return null;
}
