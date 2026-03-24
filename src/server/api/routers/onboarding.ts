import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  organization,
  lotType,
  lotTypeCategory,
  lotTypeStatusDefinition,
  lotTypeStatusTransition,
  lotTypeOption,
  lotTypeOptionValue,
  lotTypeVariant,
  lotTypeVariantOptionValue,
  lotTypeAttributeDefinition,
  operationType,
  operationTypeInput,
  operationTypeInputLotConfig,
  operationTypeStep,
  location,
  locationType,
} from "~/server/db/schema";
import { db } from "~/server/db";
import { getVertical } from "~/verticals/registry";
import type {
  SeedData,
  SeedLotType,
  SeedLocation,
  SeedOperationType,
} from "~/verticals/types";
import { getActiveOrgId } from "~/server/api/org";

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

async function insertLotType(
  tx: Tx,
  orgId: string,
  seed: SeedLotType,
  categoryNameToId: Map<string, string>,
) {
  const [created] = await tx
    .insert(lotType)
    .values({
      orgId,
      name: seed.name,
      description: seed.description ?? null,
      categoryId: seed.category
        ? (categoryNameToId.get(seed.category) ?? null)
        : null,
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
    .insert(lotTypeStatusDefinition)
    .values(
      seed.statuses.map((s) => ({
        lotTypeId: typeId,
        name: s.name,
        color: s.color ?? null,
        category: s.category,
        ordinal: s.ordinal,
      })),
    )
    .returning({
      id: lotTypeStatusDefinition.id,
      name: lotTypeStatusDefinition.name,
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
    await tx.insert(lotTypeStatusTransition).values(transitionValues);
  }

  // Options + option values
  const optionValueMap = new Map<string, Map<string, string>>();
  if (seed.options && seed.options.length > 0) {
    for (const opt of seed.options) {
      const [createdOpt] = await tx
        .insert(lotTypeOption)
        .values({ lotTypeId: typeId, name: opt.name, position: opt.position })
        .returning();
      const optId = createdOpt!.id;

      const valueNameToId = new Map<string, string>();
      for (const val of opt.values) {
        const [createdVal] = await tx
          .insert(lotTypeOptionValue)
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
        .insert(lotTypeVariant)
        .values({
          lotTypeId: typeId,
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
              .insert(lotTypeVariantOptionValue)
              .values({ variantId, optionValueId: ovId });
          }
        }
      }
    }
  }

  // Attributes
  if (seed.attributes && seed.attributes.length > 0) {
    await tx.insert(lotTypeAttributeDefinition).values(
      seed.attributes.map((a) => ({
        lotTypeId: typeId,
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
  orgId: string,
  seed: SeedOperationType,
  lotTypeNameToId: Map<string, string>,
) {
  const [created] = await tx
    .insert(operationType)
    .values({
      orgId,
      name: seed.name,
      description: seed.description ?? null,
      icon: seed.icon ?? null,
      color: seed.color ?? null,
      category: seed.category ?? null,
    })
    .returning();
  const opTypeId = created!.id;

  if (seed.inputs && seed.inputs.length > 0) {
    for (const inp of seed.inputs) {
      const [created] = await tx
        .insert(operationTypeInput)
        .values({
          operationTypeId: opTypeId,
          referenceKey: inp.referenceKey,
          label: inp.label ?? null,
          description: inp.description ?? null,
          type: inp.type,
          required: inp.required ?? false,
          sortOrder: inp.sortOrder,
          options:
            (inp.type !== "lots" &&
              inp.type !== "locations" &&
              inp.config?.options) ||
            null,
          defaultValue:
            (inp.type !== "lots" &&
              inp.type !== "locations" &&
              inp.config?.defaultValue) ??
            null,
        })
        .returning();

      if (inp.type === "lots" && created) {
        const resolvedLotTypeId = lotTypeNameToId.get(inp.config.lotTypeName);
        if (resolvedLotTypeId) {
          await tx.insert(operationTypeInputLotConfig).values({
            inputId: created.id,
            lotTypeId: resolvedLotTypeId,
            minCount: inp.config.qtyMin ? Number(inp.config.qtyMin) : 0,
            maxCount: inp.config.qtyMax ? Number(inp.config.qtyMax) : null,
            preconditionsStatuses: inp.config.preconditionsStatuses ?? null,
          });
        }
      }
    }
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
  orgId: string,
  seeds: SeedLocation[],
  locationTypeNameToId: Map<string, string>,
  parentId: string | null = null,
) {
  for (const loc of seeds) {
    const [created] = await tx
      .insert(location)
      .values({
        orgId,
        name: loc.name,
        description: loc.description ?? null,
        typeId: loc.type ? (locationTypeNameToId.get(loc.type) ?? null) : null,
        parentId,
      })
      .returning();

    if (loc.children && loc.children.length > 0) {
      await insertLocations(
        tx,
        orgId,
        loc.children,
        locationTypeNameToId,
        created!.id,
      );
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

  applySetup: protectedProcedure
    .input(
      z.object({
        verticalKey: z.string().min(1),
        answers: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getActiveOrgId(ctx.session);

      const [org] = await ctx.db
        .select({ metadata: organization.metadata })
        .from(organization)
        .where(eq(organization.id, orgId))
        .limit(1);

      const existingMeta = parseOrgMetadata(org?.metadata ?? null);
      if (existingMeta.onboardingCompletedAt) {
        return { applied: true, alreadyCompleted: true };
      }

      const vertical = getVertical(input.verticalKey);
      if (!vertical) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unknown vertical: ${input.verticalKey}`,
        });
      }

      const seedData: SeedData = vertical.buildSeedData(input.answers);

      await ctx.db.transaction(async (tx) => {
        // 1a. Create lot type categories from unique seed category names
        const categoryNameToId = new Map<string, string>();
        const uniqueCategories = [
          ...new Set(
            seedData.lotTypes.map((lt) => lt.category).filter(Boolean),
          ),
        ];
        for (const name of uniqueCategories) {
          const [row] = await tx
            .insert(lotTypeCategory)
            .values({ orgId, name })
            .returning();
          categoryNameToId.set(name, row!.id);
        }

        // 1b. Create location types from unique seed location type names
        const locationTypeNameToId = new Map<string, string>();
        function collectLocationTypes(locs: SeedLocation[]) {
          for (const loc of locs) {
            if (loc.type) locationTypeNameToId.set(loc.type, "");
            if (loc.children) collectLocationTypes(loc.children);
          }
        }
        collectLocationTypes(seedData.locations);
        for (const name of locationTypeNameToId.keys()) {
          const [row] = await tx
            .insert(locationType)
            .values({ orgId, name })
            .returning();
          locationTypeNameToId.set(name, row!.id);
        }

        // 2. Create lot types and collect name->id mapping
        const lotTypeNameToId = new Map<string, string>();
        for (const it of seedData.lotTypes) {
          const result = await insertLotType(tx, orgId, it, categoryNameToId);
          lotTypeNameToId.set(result.name, result.id);
        }

        // 3. Create operation types (resolving lot type references)
        for (const op of seedData.operations) {
          await insertOperationType(tx, orgId, op, lotTypeNameToId);
        }

        // 4. Create locations (recursive parent-child)
        await insertLocations(
          tx,
          orgId,
          seedData.locations,
          locationTypeNameToId,
        );

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
