import { z } from "zod";
import type { SeedData, SeedLotType } from "../types";
import { DEFAULT_WORKFLOW_FLAGS, workflowFlagsSchema } from "./config";
import {
  buildSpawnLotType,
  buildBatchLotType,
  buildBlockLotType,
  buildTrayLotType,
} from "./lot-types";
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

  const lotTypes: SeedLotType[] = [buildSpawnLotType(varieties)];

  if (flags.batchTracking) {
    lotTypes.push(buildBatchLotType());
  }
  if (flags.blockTracking) {
    lotTypes.push(buildBlockLotType(varieties));
  }
  if (flags.trayTracking) {
    lotTypes.push(buildTrayLotType());
  }

  return {
    lotTypes,
    operations: buildOperations(flags),
    locations: buildLocations(),
  };
}
