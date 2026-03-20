import { asc, eq } from "drizzle-orm";
import * as schema from "../db/schema";
import type { Tx } from "./types";

export type OperationInputs = {
  items: Record<string, string[]>;
  fields: Record<string, unknown>;
};

export const createOperation = async (
  tx: Tx,
  operationType: schema.OperationType,
  inputs: OperationInputs,
) => {
  const [operation] = await tx
    .insert(schema.operation)
    .values({ operationTypeId: operationType.id })
    .returning();

  if (!operation) {
    return null;
  }

  const items = Object.entries(inputs.items).flatMap(([key, itemIds]) =>
    itemIds.map((itemId) => ({ key, itemId })),
  );
  if (items.length > 0) {
    await tx.insert(schema.operationInputItem).values(
      items.map(({ itemId, key }) => ({
        operationId: operation.id,
        key,
        itemId: itemId,
      })),
    );
  }

  const fields = Object.entries(inputs.fields);
  if (fields.length > 0) {
    await tx.insert(schema.operationInputField).values(
      fields.map(([key, value]) => ({
        operationId: operation.id,
        key,
        value,
      })),
    );
  }

  const typeSteps = await tx
    .select()
    .from(schema.operationTypeStep)
    .where(eq(schema.operationTypeStep.operationTypeId, operationType.id))
    .orderBy(asc(schema.operationTypeStep.sortOrder));

  if (typeSteps.length > 0) {
    await tx.insert(schema.operationStep).values(
      typeSteps.map((step) => ({
        operationId: operation.id,
        name: step.name,
        action: step.action,
        target: step.target,
        config: step.config,
        sortOrder: step.sortOrder,
      })),
    );
  }

  return operation;
};
