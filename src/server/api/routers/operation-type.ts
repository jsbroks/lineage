import { TRPCError } from "@trpc/server";
import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  operationType,
  operationTypeInput,
  operationTypeInputLotConfig,
  operationTypeStep,
  lotTypeStatusDefinition,
} from "~/server/db/schema";

const createOperationTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
});

const updateOperationTypeSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
});

const addOperationTypeStepInput = z.object({
  operationTypeId: z.uuid(),
  name: z.string().min(1),
  action: z.string().min(1),
  target: z.string().nullable().optional(),
  config: z.unknown().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

const updateOperationTypeStepInput = z.object({
  id: z.uuid(),
  name: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  target: z.string().nullable().optional(),
  config: z.unknown().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

const inputSchema = z.object({
  id: z.uuid().optional(),
  referenceKey: z.string().min(1),
  label: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  type: z.string().min(1),
  required: z.boolean().optional(),
  sortOrder: z.number().int().default(0),
  options: z.record(z.string(), z.unknown()).nullable().optional(),
  defaultValue: z.unknown().nullable().optional(),
  lotTypeId: z.uuid().optional(),
  minCount: z.number().int().optional(),
  maxCount: z.number().int().nullable().optional(),
  preconditionsStatuses: z.array(z.string()).nullable().optional(),
});

export const operationTypeRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(operationType).orderBy(asc(operationType.name));
  }),

  statusesForLotType: publicProcedure
    .input(z.object({ lotTypeId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({ name: lotTypeStatusDefinition.name })
        .from(lotTypeStatusDefinition)
        .where(eq(lotTypeStatusDefinition.lotTypeId, input.lotTypeId))
        .orderBy(asc(lotTypeStatusDefinition.ordinal));
    }),

  getById: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const [op] = await ctx.db
        .select()
        .from(operationType)
        .where(eq(operationType.id, input.id));

      if (!op) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operation type not found",
        });
      }

      const [allInputs, lotConfigs, steps] = await Promise.all([
        ctx.db
          .select()
          .from(operationTypeInput)
          .where(eq(operationTypeInput.operationTypeId, input.id))
          .orderBy(asc(operationTypeInput.sortOrder)),
        ctx.db
          .select()
          .from(operationTypeInputLotConfig)
          .where(
            inArray(
              operationTypeInputLotConfig.inputId,
              ctx.db
                .select({ id: operationTypeInput.id })
                .from(operationTypeInput)
                .where(eq(operationTypeInput.operationTypeId, input.id)),
            ),
          ),
        ctx.db
          .select()
          .from(operationTypeStep)
          .where(eq(operationTypeStep.operationTypeId, input.id))
          .orderBy(asc(operationTypeStep.sortOrder)),
      ]);

      const configByInputId = new Map(
        lotConfigs.map((c) => [c.inputId, c]),
      );

      const inputs = allInputs.map((inp) => ({
        ...inp,
        lotConfig: configByInputId.get(inp.id) ?? null,
      }));

      return { ...op, inputs, steps };
    }),

  listInputs: publicProcedure
    .input(z.object({ operationTypeId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(operationTypeInput)
        .where(eq(operationTypeInput.operationTypeId, input.operationTypeId))
        .orderBy(asc(operationTypeInput.sortOrder));
    }),

  create: publicProcedure
    .input(createOperationTypeSchema)
    .mutation(async ({ ctx, input }) => {
      const [createdOperationType] = await ctx.db
        .insert(operationType)
        .values({
          name: input.name,
          description: input.description,
          icon: input.icon,
        })
        .returning();

      return createdOperationType;
    }),

  update: publicProcedure
    .input(updateOperationTypeSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(operationType)
        .set(data)
        .where(eq(operationType.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operation type not found",
        });
      }

      return updated;
    }),

  addInput: publicProcedure
    .input(
      z.object({
        operationTypeId: z.uuid(),
      }).and(inputSchema),
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(operationTypeInput)
        .values({
          operationTypeId: input.operationTypeId,
          referenceKey: input.referenceKey,
          label: input.label ?? null,
          description: input.description ?? null,
          type: input.type,
          required: input.required ?? false,
          sortOrder: input.sortOrder,
          options: input.options ?? null,
          defaultValue: input.defaultValue ?? null,
        })
        .returning();

      if (input.type === "lots" && input.lotTypeId && created) {
        await ctx.db.insert(operationTypeInputLotConfig).values({
          inputId: created.id,
          lotTypeId: input.lotTypeId,
          minCount: input.minCount ?? 0,
          maxCount: input.maxCount ?? null,
          preconditionsStatuses: input.preconditionsStatuses ?? null,
        });
      }

      return created;
    }),

  updateInput: publicProcedure
    .input(inputSchema.required({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const { id, lotTypeId, minCount, maxCount, preconditionsStatuses, ...data } = input;
      const [updated] = await ctx.db
        .update(operationTypeInput)
        .set({
          referenceKey: data.referenceKey,
          label: data.label ?? null,
          description: data.description ?? null,
          type: data.type,
          required: data.required ?? false,
          sortOrder: data.sortOrder,
          options: data.options ?? null,
          defaultValue: data.defaultValue ?? null,
        })
        .where(eq(operationTypeInput.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operation type input not found",
        });
      }

      if (data.type === "lots" && lotTypeId) {
        const existing = await ctx.db
          .select()
          .from(operationTypeInputLotConfig)
          .where(eq(operationTypeInputLotConfig.inputId, id));

        if (existing.length > 0) {
          await ctx.db
            .update(operationTypeInputLotConfig)
            .set({
              lotTypeId,
              minCount: minCount ?? 0,
              maxCount: maxCount ?? null,
              preconditionsStatuses: preconditionsStatuses ?? null,
            })
            .where(eq(operationTypeInputLotConfig.inputId, id));
        } else {
          await ctx.db.insert(operationTypeInputLotConfig).values({
            inputId: id,
            lotTypeId,
            minCount: minCount ?? 0,
            maxCount: maxCount ?? null,
            preconditionsStatuses: preconditionsStatuses ?? null,
          });
        }
      }

      return updated;
    }),

  deleteInput: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(operationTypeInput)
        .where(eq(operationTypeInput.id, input.id))
        .returning({ id: operationTypeInput.id });

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operation type input not found",
        });
      }

      return deleted;
    }),

  saveInputs: publicProcedure
    .input(
      z.object({
        operationTypeId: z.uuid(),
        inputs: z.array(inputSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const existing = await tx
          .select()
          .from(operationTypeInput)
          .where(
            eq(operationTypeInput.operationTypeId, input.operationTypeId),
          );

        const incomingIds = new Set(
          input.inputs.map((i) => i.id).filter(Boolean),
        );
        const toDelete = existing.filter((e) => !incomingIds.has(e.id));

        if (toDelete.length > 0) {
          await tx.delete(operationTypeInput).where(
            inArray(
              operationTypeInput.id,
              toDelete.map((d) => d.id),
            ),
          );
        }

        for (const inp of input.inputs) {
          if (inp.id && existing.some((e) => e.id === inp.id)) {
            await tx
              .update(operationTypeInput)
              .set({
                referenceKey: inp.referenceKey,
                label: inp.label ?? null,
                description: inp.description ?? null,
                type: inp.type,
                required: inp.required ?? false,
                sortOrder: inp.sortOrder,
                options: inp.options ?? null,
                defaultValue: inp.defaultValue ?? null,
              })
              .where(eq(operationTypeInput.id, inp.id));

            if (inp.type === "lots" && inp.lotTypeId) {
              const existingConfig = await tx
                .select()
                .from(operationTypeInputLotConfig)
                .where(eq(operationTypeInputLotConfig.inputId, inp.id));

              if (existingConfig.length > 0) {
                await tx
                  .update(operationTypeInputLotConfig)
                  .set({
                    lotTypeId: inp.lotTypeId,
                    minCount: inp.minCount ?? 0,
                    maxCount: inp.maxCount ?? null,
                    preconditionsStatuses: inp.preconditionsStatuses ?? null,
                  })
                  .where(eq(operationTypeInputLotConfig.inputId, inp.id));
              } else {
                await tx.insert(operationTypeInputLotConfig).values({
                  inputId: inp.id,
                  lotTypeId: inp.lotTypeId,
                  minCount: inp.minCount ?? 0,
                  maxCount: inp.maxCount ?? null,
                  preconditionsStatuses: inp.preconditionsStatuses ?? null,
                });
              }
            }
          } else {
            const [created] = await tx
              .insert(operationTypeInput)
              .values({
                operationTypeId: input.operationTypeId,
                referenceKey: inp.referenceKey,
                label: inp.label ?? null,
                description: inp.description ?? null,
                type: inp.type,
                required: inp.required ?? false,
                sortOrder: inp.sortOrder,
                options: inp.options ?? null,
                defaultValue: inp.defaultValue ?? null,
              })
              .returning();

            if (inp.type === "lots" && inp.lotTypeId && created) {
              await tx.insert(operationTypeInputLotConfig).values({
                inputId: created.id,
                lotTypeId: inp.lotTypeId,
                minCount: inp.minCount ?? 0,
                maxCount: inp.maxCount ?? null,
                preconditionsStatuses: inp.preconditionsStatuses ?? null,
              });
            }
          }
        }

        return tx
          .select()
          .from(operationTypeInput)
          .where(
            eq(operationTypeInput.operationTypeId, input.operationTypeId),
          )
          .orderBy(asc(operationTypeInput.sortOrder));
      });
    }),

  listSteps: publicProcedure
    .input(z.object({ operationTypeId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(operationTypeStep)
        .where(eq(operationTypeStep.operationTypeId, input.operationTypeId))
        .orderBy(asc(operationTypeStep.sortOrder));
    }),

  addStep: publicProcedure
    .input(addOperationTypeStepInput)
    .mutation(async ({ ctx, input }) => {
      const [createdStep] = await ctx.db
        .insert(operationTypeStep)
        .values({
          operationTypeId: input.operationTypeId,
          name: input.name,
          action: input.action,
          target: input.target,
          config: input.config,
          sortOrder: input.sortOrder ?? 0,
        })
        .returning();

      return createdStep;
    }),

  updateStep: publicProcedure
    .input(updateOperationTypeStepInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(operationTypeStep)
        .set(data)
        .where(eq(operationTypeStep.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operation type step not found",
        });
      }

      return updated;
    }),

  deleteStep: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deletedStep] = await ctx.db
        .delete(operationTypeStep)
        .where(eq(operationTypeStep.id, input.id))
        .returning({ id: operationTypeStep.id });

      if (!deletedStep) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operation type step not found",
        });
      }

      return deletedStep;
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

  saveSteps: publicProcedure
    .input(
      z.object({
        operationTypeId: z.uuid(),
        steps: z.array(
          z.object({
            id: z.uuid().optional(),
            name: z.string().min(1),
            action: z.string().min(1),
            target: z.string().nullable().optional(),
            config: z.unknown().nullable().optional(),
            sortOrder: z.number().int().default(0),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const existing = await tx
          .select()
          .from(operationTypeStep)
          .where(eq(operationTypeStep.operationTypeId, input.operationTypeId));

        const incomingIds = new Set(
          input.steps.map((s) => s.id).filter(Boolean),
        );
        const toDelete = existing.filter((e) => !incomingIds.has(e.id));

        if (toDelete.length > 0) {
          await tx.delete(operationTypeStep).where(
            inArray(
              operationTypeStep.id,
              toDelete.map((d) => d.id),
            ),
          );
        }

        for (const s of input.steps) {
          if (s.id && existing.some((e) => e.id === s.id)) {
            await tx
              .update(operationTypeStep)
              .set({
                name: s.name,
                action: s.action,
                target: s.target ?? null,
                config: s.config ?? {},
                sortOrder: s.sortOrder,
              })
              .where(eq(operationTypeStep.id, s.id));
          } else {
            await tx.insert(operationTypeStep).values({
              operationTypeId: input.operationTypeId,
              name: s.name,
              action: s.action,
              target: s.target ?? null,
              config: s.config ?? {},
              sortOrder: s.sortOrder,
            });
          }
        }

        return tx
          .select()
          .from(operationTypeStep)
          .where(eq(operationTypeStep.operationTypeId, input.operationTypeId))
          .orderBy(asc(operationTypeStep.sortOrder));
      });
    }),
});
