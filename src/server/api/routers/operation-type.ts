import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { operationType, operationTypePorts } from "~/server/db/schema";

const createOperationTypeInput = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const addOperationTypePortInput = z.object({
  operationTypeId: z.uuid(),
  direction: z.enum(["input", "output"]),
  itemTypeId: z.uuid(),
  portRole: z.string().min(1),
  qtyMin: z.string().nullable().optional(),
  qtyMax: z.string().nullable().optional(),
  uom: z.string().min(1).optional(),
  isConsumed: z.boolean().optional(),
  isRequired: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const operationTypeRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(operationType).orderBy(asc(operationType.name));
  }),

  listPorts: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(operationTypePorts)
      .orderBy(asc(operationTypePorts.portRole));
  }),

  create: publicProcedure
    .input(createOperationTypeInput)
    .mutation(async ({ ctx, input }) => {
      const [createdOperationType] = await ctx.db
        .insert(operationType)
        .values({
          slug: input.slug,
          name: input.name,
          description: input.description,
          icon: input.icon,
          config: input.config,
        })
        .returning();

      return createdOperationType;
    }),

  addPort: publicProcedure
    .input(addOperationTypePortInput)
    .mutation(async ({ ctx, input }) => {
      const [createdPort] = await ctx.db
        .insert(operationTypePorts)
        .values({
          operationTypeId: input.operationTypeId,
          direction: input.direction,
          itemTypeId: input.itemTypeId,
          portRole: input.portRole,
          qtyMin: input.qtyMin,
          qtyMax: input.qtyMax,
          uom: input.uom,
          isConsumed: input.isConsumed,
          isRequired: input.isRequired,
          config: input.config,
        })
        .returning();

      return createdPort;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deletedOperationType] = await ctx.db
        .delete(operationType)
        .where(eq(operationType.id, input.id))
        .returning({ id: operationType.id });

      if (!deletedOperationType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operation type not found",
        });
      }

      return deletedOperationType;
    }),

  deletePort: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deletedOperationTypePort] = await ctx.db
        .delete(operationTypePorts)
        .where(eq(operationTypePorts.id, input.id))
        .returning({ id: operationTypePorts.id });

      if (!deletedOperationTypePort) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operation type port not found",
        });
      }

      return deletedOperationTypePort;
    }),
});
