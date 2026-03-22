import type { SchemaContext } from "../build-schema-context";

export function resolveLotTypeId(
  ctx: SchemaContext,
  name: string,
): string | null {
  const lower = name.toLowerCase();
  return ctx.lotTypes.find((t) => t.name.toLowerCase() === lower)?.id ?? null;
}

export function resolveStatusId(
  ctx: SchemaContext,
  lotTypeId: string,
  name: string,
): string | null {
  const lower = name.toLowerCase();
  return (
    ctx.statuses.find(
      (s) => s.lotTypeId === lotTypeId && s.name.toLowerCase() === lower,
    )?.id ?? null
  );
}

export function resolveVariantId(
  ctx: SchemaContext,
  lotTypeId: string,
  name: string,
): string | null {
  const lower = name.toLowerCase();
  return (
    ctx.variants.find(
      (v) => v.lotTypeId === lotTypeId && v.name.toLowerCase() === lower,
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
