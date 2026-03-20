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
  await tx.insert(schema.operationInputItem).values(
    items.map(({ itemId, key }) => ({
      operationId: operation.id,
      key,
      itemId: itemId,
    })),
  );

  await tx.insert(schema.operationInputField).values(
    Object.entries(inputs.fields).map(([key, value]) => ({
      operationId: operation.id,
      key,
      value,
    })),
  );

  return operation;
};
