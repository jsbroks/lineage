import type { SchemaContext } from "../build-schema-context";
import { createListLotsTool } from "./list-lots";
import { createStatusCountsTool } from "./status-counts";
import { createGetLotDetailTool } from "./get-lot-detail";
import { createGetLotLineageTool } from "./get-lot-lineage";
import { createAggregateLotsTool } from "./aggregate-lots";
import { createUpdateLotStatusTool } from "./update-lot-status";
import { createMoveLotsTool } from "./move-lots";
import { createExecuteOperationTool } from "./execute-operation";
import { createBulkUpdateStatusTool } from "./bulk-update-status";
import { createUpdateAttributesTool } from "./update-attributes";
import { createDetectAnomaliesTool } from "./detect-anomalies";

export function createTools(ctx: SchemaContext) {
  return {
    listLots: createListLotsTool(ctx),
    statusCounts: createStatusCountsTool(ctx),
    getLotDetail: createGetLotDetailTool(ctx),
    getLotLineage: createGetLotLineageTool(ctx),
    aggregateLots: createAggregateLotsTool(ctx),
    updateLotStatus: createUpdateLotStatusTool(ctx),
    moveLots: createMoveLotsTool(ctx),
    executeOperation: createExecuteOperationTool(ctx),
    bulkUpdateStatus: createBulkUpdateStatusTool(ctx),
    updateAttributes: createUpdateAttributesTool(ctx),
    detectAnomalies: createDetectAnomaliesTool(ctx),
  };
}
