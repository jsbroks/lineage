import { type RouterOutputs } from "~/trpc/react";

export type ItemData = RouterOutputs["item"]["getById"];
export type ItemTypeData = RouterOutputs["itemType"]["getById"];
export type AttrDef = ItemTypeData["attributeDefinitions"][number];
