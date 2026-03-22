import type { SeedItemType } from "../../types";

export function buildTrayItemType(): SeedItemType {
  return {
    name: "Harvest Container",
    description:
      "A tray, box, or crate of harvested mushrooms ready for sale or processing",
    category: "output",
    quantityName: "Weight",
    quantityDefaultUnit: "lb",
    icon: "package",
    color: "#06B6D4",
    codePrefix: "HT",
    statuses: [
      {
        name: "Open",
        color: "#3B82F6",
        isInitial: true,
        isTerminal: false,
        ordinal: 0,
      },
      {
        name: "Closed",
        color: "#22C55E",
        isInitial: false,
        isTerminal: false,
        ordinal: 1,
      },
      {
        name: "Shipped",
        color: "#6B7280",
        isInitial: false,
        isTerminal: true,
        ordinal: 2,
      },
    ],
    transitions: [
      { from: "Open", to: "Closed" },
      { from: "Closed", to: "Shipped" },
    ],
  };
}
