import type { VerticalDefinition } from "./types";
import { mushroomFarmVertical } from "./mushroom-farm";

const verticals: VerticalDefinition[] = [mushroomFarmVertical];

const verticalsByKey = new Map(verticals.map((v) => [v.key, v]));

export function getVertical(key: string): VerticalDefinition | undefined {
  return verticalsByKey.get(key);
}

export function listVerticals(): readonly VerticalDefinition[] {
  return verticals;
}
