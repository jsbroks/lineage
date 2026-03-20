import { ActionRegistry } from "./actions";
import { createItem } from "./create-item";
import { incrementAttribute } from "./increment-attribute";
import { recordEvent } from "./record-event";
import { setItemAttr } from "./set-item-attr";
import { setItemStatus } from "./set-item-status";
import { setLineage } from "./set-lineage";
import { setOperation } from "./set-operation";

export const registry = new ActionRegistry()
  .register(createItem)
  .register(incrementAttribute)
  .register(recordEvent)
  .register(setItemAttr)
  .register(setItemStatus)
  .register(setLineage)
  .register(setOperation);
