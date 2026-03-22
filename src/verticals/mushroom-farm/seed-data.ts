import { z } from "zod";
import type { SeedData, SeedItemType } from "../types";
import { DEFAULT_WORKFLOW_FLAGS, workflowFlagsSchema } from "./config";
import {
  buildSpawnItemType,
  buildBatchItemType,
  buildBlockItemType,
  buildTrayItemType,
} from "./item-types";
import { buildOperations } from "./operations";
import { buildLocations } from "./locations";

export {
  VARIETY_CATALOG,
  type VarietyKey,
  type WorkflowFlags,
  DEFAULT_WORKFLOW_FLAGS,
} from "./config";

const answersSchema = z.object({
  varieties: z.array(z.string()).min(1).optional(),
  workflowFlags: workflowFlagsSchema.partial().optional(),
});

export function buildMushroomFarmSeedData(
  answers: Record<string, unknown>,
): SeedData {
  const parsed = answersSchema.parse(answers);
  const varieties = parsed.varieties ?? ["Blue Oyster"];
  const flags = { ...DEFAULT_WORKFLOW_FLAGS, ...parsed.workflowFlags };

  const itemTypes: SeedItemType[] = [buildSpawnItemType(varieties)];

  if (flags.batchTracking) {
    itemTypes.push(buildBatchItemType());
  }
  if (flags.blockTracking) {
    itemTypes.push(buildBlockItemType(varieties));
  }
  if (flags.trayTracking) {
    itemTypes.push(buildTrayItemType());
  }

  return {
    itemTypes,
    operations: buildOperations(flags),
    locations: buildLocations(),
  };
}
