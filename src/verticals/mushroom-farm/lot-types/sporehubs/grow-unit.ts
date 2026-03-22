import type { SeedLotType } from "../../../types";

export function buildSporehubsGrowUnit(varieties: string[]): SeedLotType {
  return {
    name: "Grow Unit",
    description:
      "A fruiting block, bag, or bed tracked from inoculation through harvest",
    category: "wip",
    quantityName: "Count",
    quantityDefaultUnit: "each",
    icon: "box",
    color: "#10B981",
    codePrefix: "GU",
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
      { name: "Inoculated", color: "#8B5CF6", category: "unstarted", ordinal: 0 },
      { name: "Colonizing", color: "#F59E0B", category: "in_progress", ordinal: 1 },
      { name: "Fruiting", color: "#22C55E", category: "in_progress", ordinal: 2 },
      { name: "Resting", color: "#6B7280", category: "in_progress", ordinal: 3 },
      { name: "Spent", color: "#9CA3AF", category: "done", ordinal: 4 },
      { name: "Contaminated", color: "#EF4444", category: "canceled", ordinal: 5 },
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
      { attrKey: "inoculation_date", dataType: "date", isRequired: true, sortOrder: 0 },
      { attrKey: "flush_number", dataType: "number", isRequired: false, sortOrder: 1 },
    ],
  };
}
