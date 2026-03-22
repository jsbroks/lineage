import type { SeedLotType } from "../../../types";

export function buildSporehubsSpawn(varieties: string[]): SeedLotType {
  return {
    name: "Spawn",
    description: "Grain or liquid spawn for inoculation, tracked by lot",
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
      {
        name: "Grain Type",
        position: 1,
        values: [
          { value: "Rye", position: 0 },
          { value: "Millet", position: 1 },
          { value: "Wheat", position: 2 },
          { value: "Liquid", position: 3 },
        ],
      },
    ],
    variants: varieties.map((v, i) => ({
      name: v,
      isDefault: i === 0,
      sortOrder: i,
      optionSelections: { Variety: v },
    })),
    statuses: [
      { name: "In Stock", color: "#22C55E", category: "unstarted", ordinal: 0 },
      { name: "In Use", color: "#3B82F6", category: "in_progress", ordinal: 1 },
      { name: "Depleted", color: "#6B7280", category: "done", ordinal: 2 },
      {
        name: "Contaminated",
        color: "#EF4444",
        category: "canceled",
        ordinal: 3,
      },
    ],
    transitions: [
      { from: "In Stock", to: "In Use" },
      { from: "In Use", to: "Depleted" },
      { from: "In Stock", to: "Contaminated" },
      { from: "In Use", to: "Contaminated" },
    ],
    attributes: [
      {
        attrKey: "supplier",
        dataType: "text",
        isRequired: false,
        sortOrder: 0,
      },
      {
        attrKey: "lot_number",
        dataType: "text",
        isRequired: false,
        sortOrder: 1,
      },
      {
        attrKey: "unit_cost",
        dataType: "number",
        isRequired: false,
        unit: "USD",
        sortOrder: 2,
      },
    ],
  };
}
