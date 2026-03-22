import { ActionRegistry } from "./actions";
import { createLot } from "./create-lot";
import { incrementAttribute } from "./increment-attribute";
import { recordEvent } from "./record-event";
import { setLotAttr } from "./set-lot-attr";
import { setLotStatus } from "./set-lot-status";
import { setLineage } from "./set-lineage";
import { setOperation } from "./set-operation";

export const registry = new ActionRegistry()
  .register(createLot)
  .register(incrementAttribute)
  .register(recordEvent)
  .register(setLotAttr)
  .register(setLotStatus)
  .register(setLineage)
  .register(setOperation);
