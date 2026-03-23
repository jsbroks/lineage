import { and, asc, eq, ilike } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { location, locationType } from "~/server/db/schema";
import { getActiveOrgId } from "~/server/api/org";

const createLocationInput = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  typeId: z.uuid().nullable().optional(),
  parentId: z.uuid().nullable().optional(),
});

export const locationRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getActiveOrgId(ctx.session);
    return ctx.db
      .select()
      .from(location)
      .where(eq(location.orgId, orgId))
      .orderBy(asc(location.name));
  }),

  getByName: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const [match] = await ctx.db
        .select()
        .from(location)
        .where(and(eq(location.orgId, orgId), ilike(location.name, input.name)))
        .limit(1);

      return match ?? null;
    }),

  setParent: protectedProcedure
    .input(
      z.object({
        childId: z.uuid(),
        parentId: z.uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const [updated] = await ctx.db
        .update(location)
        .set({ parentId: input.parentId, updatedAt: new Date() })
        .where(and(eq(location.id, input.childId), eq(location.orgId, orgId)))
        .returning();

      return updated ?? null;
    }),

  create: protectedProcedure
    .input(createLocationInput)
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const [createdLocation] = await ctx.db
        .insert(location)
        .values({
          orgId,
          name: input.name,
          description: input.description,
          typeId: input.typeId,
          parentId: input.parentId,
        })
        .returning();

      return createdLocation;
    }),

  edit: protectedProcedure
    .input(
      createLocationInput.extend({
        id: z.uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const [updated] = await ctx.db
        .update(location)
        .set({
          name: input.name,
          description: input.description,
          typeId: input.typeId,
          parentId: input.parentId,
          updatedAt: new Date(),
        })
        .where(and(eq(location.id, input.id), eq(location.orgId, orgId)))
        .returning();
      return updated ?? null;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      await ctx.db
        .delete(location)
        .where(and(eq(location.id, input.id), eq(location.orgId, orgId)));
    }),

  // ----- Location Type CRUD -----

  listTypes: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getActiveOrgId(ctx.session);
    return ctx.db
      .select()
      .from(locationType)
      .where(eq(locationType.orgId, orgId))
      .orderBy(asc(locationType.name));
  }),

  createType: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().nullable().optional(),
        color: z.string().nullable().optional(),
        icon: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const [created] = await ctx.db
        .insert(locationType)
        .values({
          orgId,
          name: input.name,
          description: input.description,
          color: input.color,
          icon: input.icon,
        })
        .returning();
      return created;
    }),

  editType: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        name: z.string().min(1),
        description: z.string().nullable().optional(),
        color: z.string().nullable().optional(),
        icon: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      const [updated] = await ctx.db
        .update(locationType)
        .set({
          name: input.name,
          description: input.description,
          color: input.color,
          icon: input.icon,
          updatedAt: new Date(),
        })
        .where(
          and(eq(locationType.id, input.id), eq(locationType.orgId, orgId)),
        )
        .returning();
      return updated ?? null;
    }),

  deleteType: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);
      await ctx.db
        .delete(locationType)
        .where(
          and(eq(locationType.id, input.id), eq(locationType.orgId, orgId)),
        );
    }),
});
