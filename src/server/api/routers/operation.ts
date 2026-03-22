import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { operation, operationType } from "~/server/db/schema";
import { registry } from "~/server/engine/actions";
import type { OperationInputs } from "~/server/engine/operation-create";
import { createAndExecute } from "~/server/engine/operation-execute";

import { suggestOperations } from "~/server/engine/suggest-operations";
import * as schema from "~/server/db/schema";
import { TRPCError } from "@trpc/server";

const executeInput = z.object({
  operationTypeId: z.uuid(),
  inputs: z.record(z.string(), z.unknown()),
  performedBy: z.uuid().nullable().optional(),
  locationId: z.uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const operationRouter = createTRPCRouter({
  actions: publicProcedure.query(() => registry.actions),

  suggest: publicProcedure
    .input(z.object({ lotIds: z.array(z.uuid()).min(1) }))
    .query(async ({ ctx, input }) => {
      return suggestOperations(ctx.db, input.lotIds);
    }),

  execute: publicProcedure
    .input(executeInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const inputs: OperationInputs = input.inputs;
        const operationType = await tx.query.operationType.findFirst({
          where: eq(schema.operationType.id, input.operationTypeId),
        });
        if (!operationType) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Operation type not found",
          });
        }

        const result = await createAndExecute(tx, operationType, inputs);
        if (!result) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create operation",
          });
        }
        return result;
      });
    }),

  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(operation)
      .orderBy(desc(operation.completedAt))
      .limit(100);
  }),

  recentWithTypes: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: operation.id,
          status: operation.status,
          completedAt: operation.completedAt,
          notes: operation.notes,
          operationTypeName: operationType.name,
          operationTypeIcon: operationType.icon,
          operationTypeColor: operationType.color,
        })
        .from(operation)
        .innerJoin(
          operationType,
          eq(operation.operationTypeId, operationType.id),
        )
        .orderBy(desc(operation.completedAt))
        .limit(input.limit);
    }),

  getById: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const [op] = await ctx.db
        .select()
        .from(operation)
        .where(eq(operation.id, input.id))
        .limit(1);

      return op ?? null;
    }),
});
