import { TRPCError } from "@trpc/server";

export function getActiveOrgId(session: {
  session: { activeOrganizationId?: string | null };
}): string {
  const orgId = session.session.activeOrganizationId;
  if (!orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active organization. Set an active org first.",
    });
  }
  return orgId;
}
