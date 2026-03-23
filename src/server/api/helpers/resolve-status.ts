import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { lotTypeStatusDefinition } from "~/server/db/schema";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export { UUID_RE };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolveStatusId(
  tx: any,
  lotTypeId: string,
  statusInput: string,
): Promise<string> {
  if (UUID_RE.test(statusInput)) {
    const [match] = await tx
      .select({ id: lotTypeStatusDefinition.id })
      .from(lotTypeStatusDefinition)
      .where(
        and(
          eq(lotTypeStatusDefinition.id, statusInput),
          eq(lotTypeStatusDefinition.lotTypeId, lotTypeId),
        ),
      )
      .limit(1);
    if (match) return match.id as string;
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Status ID "${statusInput}" does not belong to this lot type.`,
    });
  }

  const [byName] = await tx
    .select({ id: lotTypeStatusDefinition.id })
    .from(lotTypeStatusDefinition)
    .where(
      and(
        eq(lotTypeStatusDefinition.lotTypeId, lotTypeId),
        eq(lotTypeStatusDefinition.name, statusInput),
      ),
    )
    .limit(1);
  if (byName) return byName.id as string;

  const [fallback] = await tx
    .select({ id: lotTypeStatusDefinition.id })
    .from(lotTypeStatusDefinition)
    .where(
      and(
        eq(lotTypeStatusDefinition.lotTypeId, lotTypeId),
        eq(lotTypeStatusDefinition.category, "unstarted"),
      ),
    )
    .orderBy(asc(lotTypeStatusDefinition.ordinal))
    .limit(1);
  if (fallback) return fallback.id as string;

  throw new TRPCError({
    code: "BAD_REQUEST",
    message: `Could not resolve status "${statusInput}" for this lot type. No statuses are configured.`,
  });
}
