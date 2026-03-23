import { asc, eq } from "drizzle-orm";
import * as schema from "../db/schema";
import type { Tx } from "./types";

export type OperationInputs = Record<string, unknown>;

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

  const inputDefs = await tx
    .select()
    .from(schema.operationTypeInput)
    .where(eq(schema.operationTypeInput.operationTypeId, operationType.id));

  for (const def of inputDefs) {
    const value = inputs[def.referenceKey];
    if (value === undefined || value === null) continue;

    switch (def.type) {
      case "lots": {
        const lotIds = value as string[];
        if (lotIds.length > 0) {
          await tx.insert(schema.operationInputLot).values(
            lotIds.map((lotId) => ({
              operationId: operation.id,
              key: def.referenceKey,
              lotId,
            })),
          );
        }
        break;
      }
      case "locations": {
        await tx.insert(schema.operationInputLocation).values({
          operationId: operation.id,
          key: def.referenceKey,
          locationId: value as string,
        });
        break;
      }
      default: {
        await tx.insert(schema.operationInputValue).values({
          operationId: operation.id,
          key: def.referenceKey,
          value,
        });
        break;
      }
    }
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
