import type { SchemaContext } from "../build-schema-context";
import { createListItemsTool } from "./list-items";
import { createStatusCountsTool } from "./status-counts";
import { createGetItemDetailTool } from "./get-item-detail";
import { createGetItemLineageTool } from "./get-item-lineage";
import { createAggregateItemsTool } from "./aggregate-items";
import { createUpdateItemStatusTool } from "./update-item-status";
import { createMoveItemsTool } from "./move-items";
import { createExecuteOperationTool } from "./execute-operation";
import { createBulkUpdateStatusTool } from "./bulk-update-status";
import { createUpdateAttributesTool } from "./update-attributes";
import { createDetectAnomaliesTool } from "./detect-anomalies";

export function createTools(ctx: SchemaContext) {
  return {
    listItems: createListItemsTool(ctx),
    statusCounts: createStatusCountsTool(ctx),
    getItemDetail: createGetItemDetailTool(ctx),
    getItemLineage: createGetItemLineageTool(ctx),
    aggregateItems: createAggregateItemsTool(ctx),
    updateItemStatus: createUpdateItemStatusTool(ctx),
    moveItems: createMoveItemsTool(ctx),
    executeOperation: createExecuteOperationTool(ctx),
    bulkUpdateStatus: createBulkUpdateStatusTool(ctx),
    updateAttributes: createUpdateAttributesTool(ctx),
    detectAnomalies: createDetectAnomaliesTool(ctx),
  };
}
