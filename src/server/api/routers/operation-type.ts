import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  operationType,
  operationTypeInputField,
  operationTypeInputItem,
  operationTypeStep,
  statusDefinition,
} from "~/server/db/schema";

const createOperationTypeInput = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  needs: z.array(z.string()).nullable().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const updateOperationTypeInput = z.object({
  id: z.uuid(),
  slug: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const addOperationTypeStepInput = z.object({
  operationTypeId: z.uuid(),
  name: z.string().min(1),
  action: z.string().min(1),
  target: z.string().nullable().optional(),
  value: z.unknown().nullable().optional(),
  sortOrder: z.string().optional(),
  itemType: z.string().nullable().optional(),
  eventType: z.string().nullable().optional(),
});

const updateOperationTypeStepInput = z.object({
  id: z.uuid(),
  name: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  target: z.string().nullable().optional(),
  value: z.unknown().nullable().optional(),
  sortOrder: z.string().optional(),
  itemType: z.string().nullable().optional(),
  eventType: z.string().nullable().optional(),
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
  preconditionsStatuses: z.array(z.string()).nullable().optional(),
});

const updateOperationTypePortInput = z.object({
  id: z.uuid(),
  direction: z.enum(["input", "output"]).optional(),
  itemTypeId: z.uuid().optional(),
  portRole: z.string().min(1).optional(),
  qtyMin: z.string().nullable().optional(),
  qtyMax: z.string().nullable().optional(),
  uom: z.string().min(1).optional(),
  isConsumed: z.boolean().optional(),
  isRequired: z.boolean().optional(),
  preconditionsStatuses: z.array(z.string()).nullable().optional(),
});

const addOperationTypeFieldInput = z.object({
  operationTypeId: z.uuid(),
  key: z.string().min(1),
  description: z.string().nullable().optional(),
  fieldType: z.string().min(1),
  isRequired: z.boolean().optional(),
  options: z.record(z.string(), z.unknown()).nullable().optional(),
  defaultValue: z.unknown().nullable().optional(),
  sortOrder: z.string().optional(),
  scanMethod: z.string().nullable().optional(),
  isAuto: z.boolean().optional(),
  enumOptions: z.array(z.string()).nullable().optional(),
});

const updateOperationTypeFieldInput = z.object({
  id: z.uuid(),
  key: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  fieldType: z.string().min(1).optional(),
  isRequired: z.boolean().optional(),
  options: z.record(z.string(), z.unknown()).nullable().optional(),
  defaultValue: z.unknown().nullable().optional(),
  sortOrder: z.string().optional(),
  scanMethod: z.string().nullable().optional(),
  isAuto: z.boolean().optional(),
  enumOptions: z.array(z.string()).nullable().optional(),
});

export const operationTypeRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(operationType).orderBy(asc(operationType.name));
  }),

  statusesForItemType: publicProcedure
    .input(z.object({ itemTypeId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({ slug: statusDefinition.slug, name: statusDefinition.name })
        .from(statusDefinition)
        .where(eq(statusDefinition.itemTypeId, input.itemTypeId))
        .orderBy(asc(statusDefinition.ordinal));
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

      const [ports, fields, steps] = await Promise.all([
        ctx.db
          .select()
          .from(operationTypeInputItem)
          .where(eq(operationTypeInputItem.operationTypeId, input.id))
          .orderBy(asc(operationTypeInputItem.portRole)),
        ctx.db
          .select()
          .from(operationTypeInputField)
          .where(eq(operationTypeInputField.operationTypeId, input.id))
          .orderBy(asc(operationTypeInputField.sortOrder)),
        ctx.db
          .select()
          .from(operationTypeStep)
          .where(eq(operationTypeStep.operationTypeId, input.id))
          .orderBy(asc(operationTypeStep.sortOrder)),
      ]);

      return { ...op, ports, fields, steps };
    }),

  listPorts: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(operationTypeInputItem)
      .orderBy(asc(operationTypeInputItem.portRole));
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
        })
        .returning();

      return createdOperationType;
    }),

  update: publicProcedure
    .input(updateOperationTypeInput)
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

  addPort: publicProcedure
    .input(addOperationTypePortInput)
    .mutation(async ({ ctx, input }) => {
      const [createdPort] = await ctx.db
        .insert(operationTypeInputItem)
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
          preconditionsStatuses: input.preconditionsStatuses,
        })
        .returning();

      return createdPort;
    }),

  updatePort: publicProcedure
    .input(updateOperationTypePortInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(operationTypeInputItem)
        .set(data)
        .where(eq(operationTypeInputItem.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operation type port not found",
        });
      }

      return updated;
    }),

  listFields: publicProcedure
    .input(z.object({ operationTypeId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(operationTypeInputField)
        .where(
          eq(operationTypeInputField.operationTypeId, input.operationTypeId),
        )
        .orderBy(asc(operationTypeInputField.sortOrder));
    }),

  addField: publicProcedure
    .input(addOperationTypeFieldInput)
    .mutation(async ({ ctx, input }) => {
      const [createdField] = await ctx.db
        .insert(operationTypeInputField)
        .values({
          operationTypeId: input.operationTypeId,
          key: input.key,
          description: input.description,
          fieldType: input.fieldType,
          isRequired: input.isRequired,
          options: input.options,
          defaultValue: input.defaultValue,
          sortOrder: input.sortOrder,
          scanMethod: input.scanMethod,
          isAuto: input.isAuto,
          enumOptions: input.enumOptions,
        })
        .returning();

      return createdField;
    }),

  updateField: publicProcedure
    .input(updateOperationTypeFieldInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(operationTypeInputField)
        .set(data)
        .where(eq(operationTypeInputField.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operation type field not found",
        });
      }

      return updated;
    }),

  deleteField: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deletedField] = await ctx.db
        .delete(operationTypeInputField)
        .where(eq(operationTypeInputField.id, input.id))
        .returning({ id: operationTypeInputField.id });

      if (!deletedField) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operation type field not found",
        });
      }

      return deletedField;
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
          value: input.value,
          sortOrder: input.sortOrder,
          itemType: input.itemType,
          eventType: input.eventType,
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

  deletePort: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deletedOperationTypePort] = await ctx.db
        .delete(operationTypeInputItem)
        .where(eq(operationTypeInputItem.id, input.id))
        .returning({ id: operationTypeInputItem.id });

      if (!deletedOperationTypePort) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operation type port not found",
        });
      }

      return deletedOperationTypePort;
    }),
});
