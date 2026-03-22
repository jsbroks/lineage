import type { SeedLotType } from "../../types";

export function buildSpawnLotType(varieties: string[]): SeedLotType {
  return {
    name: "Spawn",
    description: "Grain or liquid spawn used to inoculate substrate",
    category: "input",
    quantityName: "Weight",
    quantityDefaultUnit: "lb",
    icon: "flask-conical",
    color: "#8B5CF6",
    codePrefix: "SP",
    options: [
      {
        name: "Variety",
        position: 0,
        values: varieties.map((v, i) => ({ value: v, position: i })),
      },
    ],
    variants: varieties.map((v, i) => ({
      name: v,
      isDefault: i === 0,
      sortOrder: i,
      optionSelections: { Variety: v },
    })),
    statuses: [
      {
        name: "In Stock",
        color: "#22C55E",
        isInitial: true,
        isTerminal: false,
        ordinal: 0,
      },
      {
        name: "In Use",
        color: "#3B82F6",
        isInitial: false,
        isTerminal: false,
        ordinal: 1,
      },
      {
        name: "Depleted",
        color: "#6B7280",
        isInitial: false,
        isTerminal: true,
        ordinal: 2,
      },
      {
        name: "Contaminated",
        color: "#EF4444",
        isInitial: false,
        isTerminal: true,
        ordinal: 3,
      },
    ],
    transitions: [
      { from: "In Stock", to: "In Use" },
      { from: "In Use", to: "Depleted" },
      { from: "In Stock", to: "Contaminated" },
      { from: "In Use", to: "Contaminated" },
    ],
  };
}
