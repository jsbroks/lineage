import { tool } from "ai";
import { z } from "zod/v4";
import { asc, eq, inArray } from "drizzle-orm";

import { db } from "~/server/db";
import {
  lot,
  operationType,
  operationTypeInput,
  operationTypeInputLotConfig,
} from "~/server/db/schema";
import type { SchemaContext } from "../build-schema-context";
import type { PendingAction } from "./pending-action";

export function createExecuteOperationTool(ctx: SchemaContext) {
  return tool({
    description:
      "Propose executing an operation (task/workflow) on lots. Operations are predefined workflows like Harvest, Inoculate, Package, etc. If required input fields are missing, returns the list of fields needed so you can ask the user. Returns a pending action that the user must confirm.",
    inputSchema: z.object({
      operationTypeName: z
        .string()
        .describe("Name of the operation type (e.g. 'Harvest')"),
      lotCodes: z
        .array(z.string())
        .min(1)
        .describe("Lot codes to use as input for the operation"),
      fields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          "Field values for the operation, keyed by the field's reference key",
        ),
      notes: z.string().optional().describe("Optional notes for the operation"),
    }),
    execute: async ({ operationTypeName, lotCodes, fields, notes }) => {
      const allOpTypes = await db.select().from(operationType);
      const opType = allOpTypes.find(
        (o) => o.name.toLowerCase() === operationTypeName.toLowerCase(),
      );

      if (!opType) {
        return {
          error: `Unknown operation type: "${operationTypeName}". Available operations: ${allOpTypes.map((o) => o.name).join(", ")}`,
        };
      }

      const allInputs = await db
        .select()
        .from(operationTypeInput)
        .where(eq(operationTypeInput.operationTypeId, opType.id))
        .orderBy(asc(operationTypeInput.sortOrder));

      const lotInputs = allInputs.filter((i) => i.type === "lots");
      const fieldInputs = allInputs.filter((i) => i.type !== "lots");

      const lotConfigs =
        lotInputs.length > 0
          ? await db
              .select()
              .from(operationTypeInputLotConfig)
              .where(
                inArray(
                  operationTypeInputLotConfig.inputId,
                  lotInputs.map((i) => i.id),
                ),
              )
          : [];
      const configByInputId = new Map(lotConfigs.map((c) => [c.inputId, c]));

      const matchedLots = await db
        .select()
        .from(lot)
        .where(inArray(lot.code, lotCodes));

      if (matchedLots.length === 0)
        return { error: "No lots found matching the provided codes" };

      const notFound = lotCodes.filter(
        (c) => !matchedLots.some((i) => i.code === c),
      );
      if (notFound.length > 0) {
        return { error: `Lots not found: ${notFound.join(", ")}` };
      }

      const inputsMap: Record<string, unknown> = {};
      for (const inp of lotInputs) {
        const cfg = configByInputId.get(inp.id);
        if (!cfg) continue;
        const matching = matchedLots.filter(
          (i) => i.lotTypeId === cfg.lotTypeId,
        );
        if (matching.length > 0) {
          inputsMap[inp.referenceKey] = matching.map((i) => i.id);
        }
      }

      const matchedIds = new Set(
        Object.values(inputsMap).filter(Array.isArray).flat() as string[],
      );
      const unmatched = matchedLots.filter((i) => !matchedIds.has(i.id));
      if (unmatched.length > 0) {
        const portDesc = lotInputs
          .map((inp) => {
            const cfg = configByInputId.get(inp.id);
            const typeName = cfg
              ? ctx.lotTypes.find((t) => t.id === cfg.lotTypeId)?.name
              : "unknown";
            return `${inp.referenceKey} (${typeName ?? "unknown"})`;
          })
          .join(", ");
        return {
          error: `Some lots don't match any input port: ${unmatched.map((i) => i.code).join(", ")}. This operation expects: ${portDesc}`,
        };
      }

      const requiredFields = fieldInputs.filter((f) => f.required);
      const missingFields = requiredFields.filter(
        (f) => !fields || !(f.referenceKey in fields),
      );

      if (missingFields.length > 0) {
        return {
          needsFields: true,
          message: `The "${opType.name}" operation requires additional fields:`,
          requiredFields: missingFields.map((f) => ({
            key: f.referenceKey,
            label: f.label ?? f.referenceKey,
            type: f.type,
            description: f.description,
          })),
          allFields: fieldInputs.map((f) => ({
            key: f.referenceKey,
            label: f.label ?? f.referenceKey,
            type: f.type,
            required: f.required,
            description: f.description,
            defaultValue: f.defaultValue,
          })),
        };
      }

      for (const f of fieldInputs) {
        if (fields && f.referenceKey in fields) {
          inputsMap[f.referenceKey] = fields[f.referenceKey];
        } else if (f.defaultValue !== null) {
          inputsMap[f.referenceKey] = f.defaultValue;
        }
      }

      const affectedLots = matchedLots.map((i) => ({
        id: i.id,
        code: i.code,
        currentStatus: ctx.statuses.find((s) => s.id === i.statusId)?.name,
        currentLocation: i.locationId
          ? ctx.locations.find((l) => l.id === i.locationId)?.name
          : undefined,
      }));

      const changes: Record<string, string> = {
        operation: opType.name,
      };
      for (const f of fieldInputs) {
        const val = inputsMap[f.referenceKey];
        if (val !== undefined) {
          changes[f.label ?? f.referenceKey] = String(val);
        }
      }

      const pendingAction: PendingAction = {
        type: "executeOperation",
        description: `Execute "${opType.name}" on ${matchedLots.length} lot(s)`,
        affectedLots,
        changes,
        payload: {
          operationTypeId: opType.id,
          inputs: inputsMap,
          notes: notes ?? null,
        },
        requiresConfirmation: true,
      };

      return pendingAction;
    },
  });
}
