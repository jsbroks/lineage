import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { operation } from "~/server/db/schema";
import { registry } from "~/server/engine/actions";
import { executeOperation } from "~/server/engine/execute-operation";
import { suggestOperations } from "~/server/engine/suggest-operations";

const executeInput = z.object({
  operationTypeId: z.uuid(),
  lots: z.record(z.string(), z.array(z.uuid())),
  fields: z.record(z.string(), z.unknown()),
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
        return executeOperation(tx, {
          operationTypeId: input.operationTypeId,
          lots: input.lots,
          fields: input.fields,
          performedBy: input.performedBy,
          locationId: input.locationId,
          notes: input.notes,
        });
      });
    }),

  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(operation)
      .orderBy(desc(operation.completedAt))
      .limit(100);
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
