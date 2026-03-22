import type { SeedLotType } from "../../../types";

export function buildKinokoSpawn(varieties: string[]): SeedLotType {
  return {
    name: "Spawn",
    description: "Grain or liquid spawn used to inoculate blocks",
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
        name: "Available",
        color: "#22C55E",
        category: "unstarted",
        ordinal: 0,
      },
      { name: "In Use", color: "#3B82F6", category: "in_progress", ordinal: 1 },
      { name: "Depleted", color: "#6B7280", category: "done", ordinal: 2 },
    ],
    transitions: [
      { from: "Available", to: "In Use" },
      { from: "In Use", to: "Depleted" },
    ],
  };
}
