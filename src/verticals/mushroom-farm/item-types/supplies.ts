import type { SeedItemType } from "~/verticals/types";

export function buildSuppliesItemType(): SeedItemType {
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
      {
        name: "In Stock",
        isInitial: true,
        isTerminal: false,
        ordinal: 0,
      },
      {
        name: "Depleted",
        isInitial: false,
        isTerminal: true,
        ordinal: 1,
      },
    ],
    transitions: [{ from: "In Stock", to: "Depleted" }],
    attributes: [],
  };
}
