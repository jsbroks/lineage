import type { SchemaContext } from "../build-schema-context";
import { createListItemsTool } from "./list-items";
import { createStatusCountsTool } from "./status-counts";
import { createGetItemDetailTool } from "./get-item-detail";
import { createGetItemLineageTool } from "./get-item-lineage";
import { createAggregateItemsTool } from "./aggregate-items";

export function createTools(ctx: SchemaContext) {
  return {
    listItems: createListItemsTool(ctx),
    statusCounts: createStatusCountsTool(ctx),
    getItemDetail: createGetItemDetailTool(ctx),
    getItemLineage: createGetItemLineageTool(ctx),
    aggregateItems: createAggregateItemsTool(ctx),
  };
}
