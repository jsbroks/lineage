import { createLotWorkflow } from "./create-lot";
import { executeOperationWorkflow } from "./execute-operation";
import { linkCodeWorkflow } from "./link-code";
import { locationSummaryWorkflow } from "./location-summary";
import { lotSummaryWorkflow } from "./lot-summary";
import { moveToLocationWorkflow } from "./move-to-location";
import { nestLocationsWorkflow } from "./nest-locations";
import type { ScanWorkflow } from "./types";

export const scanWorkflows: ScanWorkflow[] = [
  nestLocationsWorkflow,
  moveToLocationWorkflow,
  executeOperationWorkflow,
  lotSummaryWorkflow,
  locationSummaryWorkflow,
  createLotWorkflow,
  linkCodeWorkflow,
];
