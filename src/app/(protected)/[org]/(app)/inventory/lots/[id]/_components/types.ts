import { type RouterOutputs } from "~/trpc/react";

export type LotData = RouterOutputs["lot"]["getById"];
export type LotTypeData = RouterOutputs["lotType"]["getById"];
export type AttrDef = LotTypeData["attributeDefinitions"][number];
