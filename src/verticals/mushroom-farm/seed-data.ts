import type { SeedData, SeedLotType } from "../types";
import {
  DEFAULT_WORKFLOW_FLAGS,
  type MushroomWizardAnswers,
} from "./config";
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
  type MushroomWizardAnswers,
  DEFAULT_WORKFLOW_FLAGS,
} from "./config";

export function buildMushroomFarmSeedData(
  answers: MushroomWizardAnswers,
): SeedData {
  const varieties = answers.varieties ?? ["Blue Oyster"];
  const flags = { ...DEFAULT_WORKFLOW_FLAGS, ...answers.workflowFlags };

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
