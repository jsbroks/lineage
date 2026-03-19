/**
 * Value resolution and condition evaluation for the step engine.
 */

import type { ExecCtx, Step } from "./types";

// ── Value resolution ─────────────────────────────────────────────────

export function resolvePath(path: string, ctx: ExecCtx): unknown {
  const parts = path.split(".");

  if (parts[0] === "inputs") {
    return ctx.inputs[parts.slice(1).join(".")];
  }

  const items = ctx.items[parts[0]!];
  if (items && items.length > 0) {
    const firstItem = items[0]!;
    const attrPath = parts.slice(1).join(".");
    if (attrPath === "status") return firstItem.statusId;
    if (attrPath === "id") return firstItem.id;
    const attrs = (firstItem.attributes ?? {}) as Record<string, unknown>;
    return attrs[attrPath];
  }

  return undefined;
}

// ── Condition evaluation ─────────────────────────────────────────────

export function evaluateCondition(cond: unknown, ctx: ExecCtx): boolean {
  if (cond === null || cond === undefined) return true;
  if (typeof cond !== "object") return true;

  const c = cond as Record<string, unknown>;

  if ("equals" in c && Array.isArray(c.equals) && c.equals.length === 2) {
    const [a, b] = c.equals;
    const resolvedA = typeof a === "string" ? resolvePath(a, ctx) : a;
    const resolvedB = typeof b === "string" ? resolvePath(b, ctx) : b;
    return String(resolvedA) === String(resolvedB);
  }

  if ("exists" in c && typeof c.exists === "string") {
    const val = resolvePath(c.exists, ctx);
    if (val === undefined || val === null || val === "") return false;
    if (ctx.items[c.exists] && ctx.items[c.exists]!.length > 0) return true;
    return true;
  }

  if ("not" in c) {
    return !evaluateCondition(c.not, ctx);
  }

  if ("all" in c && Array.isArray(c.all)) {
    return c.all.every((sub) => evaluateCondition(sub, ctx));
  }

  if ("any" in c && Array.isArray(c.any)) {
    return c.any.some((sub) => evaluateCondition(sub, ctx));
  }

  return true;
}

// ── Step config extraction ───────────────────────────────────────────

export function getStepConfig(step: Step): {
  condition: unknown;
  config: Record<string, unknown>;
} {
  const raw = step.value;

  if (raw === null || raw === undefined) {
    return { condition: null, config: {} };
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { condition: null, config: { _value: raw } };
  }

  const obj = raw as Record<string, unknown>;
  const { condition, ...rest } = obj;
  return { condition: condition ?? null, config: rest };
}

// ── Helpers ──────────────────────────────────────────────────────────

export function getTargetItems(target: string | null, ctx: ExecCtx) {
  if (!target) return [];
  return ctx.items[target] ?? [];
}

/**
 * Returns a human-readable label like "3 Blocks" or "1 Packaged Product"
 * using the item type name from the context.
 */
export function describeItems(
  items: { itemTypeId: string }[],
  ctx: ExecCtx,
): string {
  if (items.length === 0) return "0 items";
  const name = ctx.itemTypeNames.get(items[0]!.itemTypeId) ?? "item";
  const plural = items.length === 1 ? name : `${name}s`;
  return `${items.length} ${plural}`;
}
