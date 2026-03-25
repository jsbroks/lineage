import { TRPCError } from "@trpc/server";

export function getActiveOrgId(ctx: {
  session: Record<string, unknown> & { activeOrganizationId?: string | null };
}): string {
  const orgId = ctx.session.activeOrganizationId;
  if (!orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active organization. Set an active org first.",
    });
  }
  return orgId;
}
