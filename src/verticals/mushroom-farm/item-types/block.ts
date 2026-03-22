import type { SeedItemType } from "../../types";

export function buildBlockItemType(varieties: string[]): SeedItemType {
  return {
    name: "Grow Unit",
    description: "An individual fruiting unit — block, bag, or bed",
    category: "wip",
    quantityName: "Count",
    quantityDefaultUnit: "each",
    icon: "box",
    color: "#10B981",
    codePrefix: "BK",
    options: [
      {
        name: "Variety",
        position: 0,
        values: varieties.map((v, i) => ({ value: v, position: i })),
      },
    ],
    variants: varieties.map((v, i) => ({
      name: `${v} Unit`,
      isDefault: i === 0,
      sortOrder: i,
      optionSelections: { Variety: v },
    })),
    statuses: [
      {
        name: "Inoculated",
        color: "#8B5CF6",
        isInitial: true,
        isTerminal: false,
        ordinal: 0,
      },
      {
        name: "Colonizing",
        color: "#F59E0B",
        isInitial: false,
        isTerminal: false,
        ordinal: 1,
      },
      {
        name: "Fruiting",
        color: "#22C55E",
        isInitial: false,
        isTerminal: false,
        ordinal: 2,
      },
      {
        name: "Resting",
        color: "#6B7280",
        isInitial: false,
        isTerminal: false,
        ordinal: 3,
      },
      {
        name: "Spent",
        color: "#9CA3AF",
        isInitial: false,
        isTerminal: true,
        ordinal: 4,
      },
      {
        name: "Contaminated",
        color: "#EF4444",
        isInitial: false,
        isTerminal: true,
        ordinal: 5,
      },
    ],
    transitions: [
      { from: "Inoculated", to: "Colonizing" },
      { from: "Colonizing", to: "Fruiting" },
      { from: "Fruiting", to: "Resting" },
      { from: "Resting", to: "Fruiting" },
      { from: "Fruiting", to: "Spent" },
      { from: "Resting", to: "Spent" },
      { from: "Inoculated", to: "Contaminated" },
      { from: "Colonizing", to: "Contaminated" },
      { from: "Fruiting", to: "Contaminated" },
    ],
    attributes: [
      {
        attrKey: "Inoculation Date",
        dataType: "date",
        isRequired: true,
        sortOrder: 0,
      },
      {
        attrKey: "Flush Number",
        dataType: "number",
        isRequired: false,
        sortOrder: 1,
      },
    ],
  };
}
