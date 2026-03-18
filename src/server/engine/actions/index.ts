import { ActionRegistry } from "../types";
import { createItem } from "./create-item";
import { incrementAttribute } from "./increment-attribute";
import { recordEvent } from "./record-event";
import { setAttribute } from "./set-attribute";
import { setLineage } from "./set-lineage";
import { setStatus } from "./set-status";

export const registry = new ActionRegistry()
  .register("set_status", setStatus)
  .register("set_attribute", setAttribute)
  .register("increment_attribute", incrementAttribute)
  .register("create_item", createItem)
  .registerAlias(["set_lineage", "link"], setLineage)
  .register("record_event", recordEvent);
