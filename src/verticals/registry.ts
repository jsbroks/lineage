import type { VerticalDefinition } from "./types";
import { defineVertical } from "./types";
import { mushroomFarmVertical } from "./mushroom-farm";

const blankVertical = defineVertical({
  key: "blank",
  name: "Blank Workspace",
  description:
    "Start from scratch — set up your own lot types, workflows, and locations.",
  icon: "box",
  steps: [],
  buildSeedData: () => ({ lotTypes: [], operations: [], locations: [] }),
});

const verticals: VerticalDefinition[] = [mushroomFarmVertical, blankVertical];

const verticalsByKey = new Map(verticals.map((v) => [v.key, v]));

export function getVertical(key: string): VerticalDefinition | undefined {
  return verticalsByKey.get(key);
}

export function listVerticals(): readonly VerticalDefinition[] {
  return verticals;
}
