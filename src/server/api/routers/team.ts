import { TRPCError } from "@trpc/server";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { member, invitation, user, organization } from "~/server/db/schema";
import { getActiveOrgId } from "~/server/api/org";
import { auth } from "~/server/better-auth";

export const teamRouter = createTRPCRouter({
  listMembers: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getActiveOrgId(ctx.session);

    const rows = await ctx.db
      .select({
        memberId: member.id,
        userId: member.userId,
        role: member.role,
        joinedAt: member.createdAt,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
      })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(eq(member.organizationId, orgId))
      .orderBy(member.createdAt);

    return rows;
  }),

  listInvitations: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getActiveOrgId(ctx.session);

    const rows = await ctx.db
      .select({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        inviterName: user.name,
      })
      .from(invitation)
      .innerJoin(user, eq(user.id, invitation.inviterId))
      .where(eq(invitation.organizationId, orgId))
      .orderBy(desc(invitation.createdAt));

    return rows;
  }),

  invite: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["member", "admin", "owner"]).default("member"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);

      const callerMember = await ctx.db
        .select({ role: member.role })
        .from(member)
        .where(
          and(
            eq(member.organizationId, orgId),
            eq(member.userId, ctx.session.user.id),
          ),
        )
        .limit(1);

      if (
        !callerMember[0] ||
        !["admin", "owner"].includes(callerMember[0].role)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins and owners can invite members.",
        });
      }

      const result = await auth.api.createInvitation({
        body: {
          email: input.email,
          role: input.role,
          organizationId: orgId,
        },
        headers: ctx.headers,
      });

      return result;
    }),

  removeMember: protectedProcedure
    .input(z.object({ memberId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);

      const callerMember = await ctx.db
        .select({ role: member.role })
        .from(member)
        .where(
          and(
            eq(member.organizationId, orgId),
            eq(member.userId, ctx.session.user.id),
          ),
        )
        .limit(1);

      if (
        !callerMember[0] ||
        !["admin", "owner"].includes(callerMember[0].role)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins and owners can remove members.",
        });
      }

      const [target] = await ctx.db
        .select({ id: member.id, userId: member.userId, role: member.role })
        .from(member)
        .where(
          and(eq(member.id, input.memberId), eq(member.organizationId, orgId)),
        )
        .limit(1);

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      if (target.role === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot remove the owner.",
        });
      }

      await ctx.db
        .delete(member)
        .where(
          and(eq(member.id, input.memberId), eq(member.organizationId, orgId)),
        );

      return { removed: true };
    }),

  updateRole: protectedProcedure
    .input(
      z.object({
        memberId: z.uuid(),
        role: z.enum(["member", "admin"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);

      const callerMember = await ctx.db
        .select({ role: member.role })
        .from(member)
        .where(
          and(
            eq(member.organizationId, orgId),
            eq(member.userId, ctx.session.user.id),
          ),
        )
        .limit(1);

      if (!callerMember[0] || callerMember[0].role !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the owner can change roles.",
        });
      }

      const [target] = await ctx.db
        .select({ role: member.role })
        .from(member)
        .where(
          and(eq(member.id, input.memberId), eq(member.organizationId, orgId)),
        )
        .limit(1);

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      if (target.role === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot change the owner's role.",
        });
      }

      await ctx.db
        .update(member)
        .set({ role: input.role })
        .where(
          and(eq(member.id, input.memberId), eq(member.organizationId, orgId)),
        );

      return { updated: true };
    }),

  cancelInvitation: protectedProcedure
    .input(z.object({ invitationId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);

      await ctx.db
        .delete(invitation)
        .where(
          and(
            eq(invitation.id, input.invitationId),
            eq(invitation.organizationId, orgId),
          ),
        );

      return { cancelled: true };
    }),
});
