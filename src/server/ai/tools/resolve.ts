import type { SchemaContext } from "../build-schema-context";

export function resolveItemTypeId(
  ctx: SchemaContext,
  name: string,
): string | null {
  const lower = name.toLowerCase();
  return ctx.itemTypes.find((t) => t.name.toLowerCase() === lower)?.id ?? null;
}

export function resolveStatusId(
  ctx: SchemaContext,
  itemTypeId: string,
  name: string,
): string | null {
  const lower = name.toLowerCase();
  return (
    ctx.statuses.find(
      (s) => s.itemTypeId === itemTypeId && s.name.toLowerCase() === lower,
    )?.id ?? null
  );
}

export function resolveVariantId(
  ctx: SchemaContext,
  itemTypeId: string,
  name: string,
): string | null {
  const lower = name.toLowerCase();
  return (
    ctx.variants.find(
      (v) => v.itemTypeId === itemTypeId && v.name.toLowerCase() === lower,
    )?.id ?? null
  );
}

export function resolveLocationId(
  ctx: SchemaContext,
  name: string,
): string | null {
  const lower = name.toLowerCase();
  return ctx.locations.find((l) => l.name.toLowerCase() === lower)?.id ?? null;
}
