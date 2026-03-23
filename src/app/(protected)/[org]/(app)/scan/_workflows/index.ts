import { createLotTypeWorkflow } from "./create-lot-type";
import type { ScanWorkflow } from "./types";

export const scanWorkflows: ScanWorkflow[] = [
  createLotTypeWorkflow,
  // nestLocationsWorkflow,
  // moveToLocationWorkflow,
  // executeOperationWorkflow,
  // lotSummaryWorkflow,
  // locationSummaryWorkflow,
  // createLotWorkflow,
  // linkCodeWorkflow,
];
