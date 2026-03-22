import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  organization,
  itemType,
  itemTypeStatusDefinition,
  itemTypeStatusTransition,
  itemTypeOption,
  itemTypeOptionValue,
  itemTypeVariant,
  itemTypeVariantOptionValue,
  itemTypeAttributeDefinition,
  operationType,
  operationTypeInputItem,
  operationTypeInputField,
  operationTypeStep,
  location,
} from "~/server/db/schema";
import { db } from "~/server/db";
import { getVertical } from "~/verticals/registry";
import type {
  SeedData,
  SeedItemType,
  SeedLocation,
  SeedOperationType,
} from "~/verticals/types";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface OrgMetadata {
  onboardingCompletedAt?: string | null;
  onboardingDismissedAt?: string | null;
  verticalKey?: string | null;
}

function parseOrgMetadata(raw: string | null): OrgMetadata {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as OrgMetadata;
  } catch {
    return {};
  }
}

function getActiveOrgId(session: {
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

async function insertItemType(tx: Tx, seed: SeedItemType) {
  const [created] = await tx
    .insert(itemType)
    .values({
      name: seed.name,
      description: seed.description ?? null,
      category: seed.category,
      quantityName: seed.quantityName ?? null,
      quantityDefaultUnit: seed.quantityDefaultUnit ?? "each",
      icon: seed.icon ?? null,
      color: seed.color ?? null,
      codePrefix: seed.codePrefix ?? null,
    })
    .returning();
  const typeId = created!.id;

  // Statuses
  const statusRows = await tx
    .insert(itemTypeStatusDefinition)
    .values(
      seed.statuses.map((s) => ({
        itemTypeId: typeId,
        name: s.name,
        color: s.color ?? null,
        isInitial: s.isInitial,
        isTerminal: s.isTerminal,
        ordinal: s.ordinal,
      })),
    )
    .returning({
      id: itemTypeStatusDefinition.id,
      name: itemTypeStatusDefinition.name,
    });

  const statusNameToId = new Map(statusRows.map((r) => [r.name, r.id]));

  // Transitions
  const transitionValues = seed.transitions
    .map((t) => {
      const fromId = statusNameToId.get(t.from);
      const toId = statusNameToId.get(t.to);
      if (!fromId || !toId) return null;
      return { fromStatusId: fromId, toStatusId: toId };
    })
    .filter(Boolean) as { fromStatusId: string; toStatusId: string }[];

  if (transitionValues.length > 0) {
    await tx.insert(itemTypeStatusTransition).values(transitionValues);
  }

  // Options + option values
  const optionValueMap = new Map<string, Map<string, string>>();
  if (seed.options && seed.options.length > 0) {
    for (const opt of seed.options) {
      const [createdOpt] = await tx
        .insert(itemTypeOption)
        .values({ itemTypeId: typeId, name: opt.name, position: opt.position })
        .returning();
      const optId = createdOpt!.id;

      const valueNameToId = new Map<string, string>();
      for (const val of opt.values) {
        const [createdVal] = await tx
          .insert(itemTypeOptionValue)
          .values({ optionId: optId, value: val.value, position: val.position })
          .returning();
        valueNameToId.set(val.value, createdVal!.id);
      }
      optionValueMap.set(opt.name, valueNameToId);
    }
  }

  // Variants
  if (seed.variants && seed.variants.length > 0) {
    for (const v of seed.variants) {
      const [createdVariant] = await tx
        .insert(itemTypeVariant)
        .values({
          itemTypeId: typeId,
          name: v.name,
          isDefault: v.isDefault,
          sortOrder: v.sortOrder,
        })
        .returning();
      const variantId = createdVariant!.id;

      if (v.optionSelections) {
        for (const [optName, valName] of Object.entries(v.optionSelections)) {
          const valMap = optionValueMap.get(optName);
          const ovId = valMap?.get(valName);
          if (ovId) {
            await tx
              .insert(itemTypeVariantOptionValue)
              .values({ variantId, optionValueId: ovId });
          }
        }
      }
    }
  }

  // Attributes
  if (seed.attributes && seed.attributes.length > 0) {
    await tx.insert(itemTypeAttributeDefinition).values(
      seed.attributes.map((a) => ({
        itemTypeId: typeId,
        attrKey: a.attrKey,
        dataType: a.dataType,
        isRequired: a.isRequired,
        unit: a.unit ?? null,
        options: a.options ?? null,
        defaultValue: a.defaultValue ?? null,
        sortOrder: a.sortOrder,
      })),
    );
  }

  return { id: typeId, name: seed.name };
}

async function insertOperationType(
  tx: Tx,
  seed: SeedOperationType,
  itemTypeNameToId: Map<string, string>,
) {
  const [created] = await tx
    .insert(operationType)
    .values({
      name: seed.name,
      description: seed.description ?? null,
      icon: seed.icon ?? null,
      color: seed.color ?? null,
      category: seed.category ?? null,
    })
    .returning();
  const opTypeId = created!.id;

  if (seed.inputItems && seed.inputItems.length > 0) {
    for (const inp of seed.inputItems) {
      const resolvedItemTypeId = itemTypeNameToId.get(inp.itemTypeName);
      if (!resolvedItemTypeId) continue;
      await tx.insert(operationTypeInputItem).values({
        operationTypeId: opTypeId,
        itemTypeId: resolvedItemTypeId,
        referenceKey: inp.referenceKey,
        qtyMin: inp.qtyMin ?? "0",
        qtyMax: inp.qtyMax ?? null,
        preconditionsStatuses: inp.preconditionsStatuses ?? null,
      });
    }
  }

  if (seed.inputFields && seed.inputFields.length > 0) {
    await tx.insert(operationTypeInputField).values(
      seed.inputFields.map((f) => ({
        operationTypeId: opTypeId,
        referenceKey: f.referenceKey,
        label: f.label,
        description: f.description ?? null,
        type: f.type,
        required: f.required,
        options: f.options ?? null,
        defaultValue: f.defaultValue ?? null,
        sortOrder: f.sortOrder,
      })),
    );
  }

  if (seed.steps && seed.steps.length > 0) {
    await tx.insert(operationTypeStep).values(
      seed.steps.map((s) => ({
        operationTypeId: opTypeId,
        name: s.name,
        action: s.action,
        target: s.target ?? null,
        config: s.config ?? {},
        sortOrder: s.sortOrder,
      })),
    );
  }
}

async function insertLocations(
  tx: Tx,
  seeds: SeedLocation[],
  parentId: string | null = null,
) {
  for (const loc of seeds) {
    const [created] = await tx
      .insert(location)
      .values({
        name: loc.name,
        description: loc.description ?? null,
        type: loc.type,
        parentId,
      })
      .returning();

    if (loc.children && loc.children.length > 0) {
      await insertLocations(tx, loc.children, created!.id);
    }
  }
}

export const onboardingRouter = createTRPCRouter({
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getActiveOrgId(ctx.session);

    const [org] = await ctx.db
      .select({ metadata: organization.metadata })
      .from(organization)
      .where(eq(organization.id, orgId))
      .limit(1);

    if (!org) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    const meta = parseOrgMetadata(org.metadata);

    return {
      completedAt: meta.onboardingCompletedAt ?? null,
      dismissedAt: meta.onboardingDismissedAt ?? null,
      verticalKey: meta.verticalKey ?? null,
      isComplete: !!meta.onboardingCompletedAt,
      isDismissed: !!meta.onboardingDismissedAt,
    };
  }),

  dismiss: protectedProcedure.mutation(async ({ ctx }) => {
    const orgId = getActiveOrgId(ctx.session);

    const [org] = await ctx.db
      .select({ metadata: organization.metadata })
      .from(organization)
      .where(eq(organization.id, orgId))
      .limit(1);

    if (!org) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    const meta = parseOrgMetadata(org.metadata);
    meta.onboardingDismissedAt = new Date().toISOString();

    await ctx.db
      .update(organization)
      .set({ metadata: JSON.stringify(meta) })
      .where(eq(organization.id, orgId));

    return { dismissed: true };
  }),

  apply: protectedProcedure
    .input(
      z.object({
        verticalKey: z.string().min(1),
        answers: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);

      const vertical = getVertical(input.verticalKey);
      if (!vertical) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unknown vertical: ${input.verticalKey}`,
        });
      }

      const seedData: SeedData = vertical.buildSeedData(input.answers);

      await ctx.db.transaction(async (tx) => {
        // 1. Create item types and collect name->id mapping
        const itemTypeNameToId = new Map<string, string>();
        for (const it of seedData.itemTypes) {
          const result = await insertItemType(tx, it);
          itemTypeNameToId.set(result.name, result.id);
        }

        // 2. Create operation types (resolving item type references)
        for (const op of seedData.operations) {
          await insertOperationType(tx, op, itemTypeNameToId);
        }

        // 3. Create locations (recursive parent-child)
        await insertLocations(tx, seedData.locations);

        // 4. Mark onboarding complete in org metadata
        const [org] = await tx
          .select({ metadata: organization.metadata })
          .from(organization)
          .where(eq(organization.id, orgId))
          .limit(1);

        const meta = parseOrgMetadata(org?.metadata ?? null);
        meta.onboardingCompletedAt = new Date().toISOString();
        meta.verticalKey = input.verticalKey;

        await tx
          .update(organization)
          .set({ metadata: JSON.stringify(meta) })
          .where(eq(organization.id, orgId));
      });

      return { applied: true };
    }),
});
