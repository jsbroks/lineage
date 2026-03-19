import { ActionRegistry } from "../types";
import { setItem } from "./set-item";

export const registry = new ActionRegistry().register("set-item", setItem);
