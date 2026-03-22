import type { SeedLotType } from "~/verticals/types";

export function buildSuppliesLotType(): SeedLotType {
  return {
    name: "Supplies",
    description: "Supplies used in the mushroom farm",
    category: "input",
    quantityName: "Quantity",
    quantityDefaultUnit: "each",
    icon: "box",
    color: "#10B981",
    codePrefix: "SP",
    statuses: [
      { name: "In Stock", category: "unstarted", ordinal: 0 },
      { name: "Depleted", category: "done", ordinal: 1 },
    ],
    transitions: [{ from: "In Stock", to: "Depleted" }],
    attributes: [],
  };
}
