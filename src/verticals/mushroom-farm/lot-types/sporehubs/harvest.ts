import type { SeedLotType } from "../../../types";

export function buildSporehubsHarvest(): SeedLotType {
  return {
    name: "Harvest Batch",
    description:
      "A batch of harvested mushrooms tracked by strain, weight, and quality",
    category: "output",
    quantityName: "Weight",
    quantityDefaultUnit: "lb",
    icon: "package",
    color: "#06B6D4",
    codePrefix: "HB",
    statuses: [
      { name: "Harvested", color: "#22C55E", category: "unstarted", ordinal: 0 },
      { name: "Graded", color: "#3B82F6", category: "in_progress", ordinal: 1 },
      { name: "Packed", color: "#8B5CF6", category: "in_progress", ordinal: 2 },
      { name: "Shipped", color: "#6B7280", category: "done", ordinal: 3 },
      { name: "Spoiled", color: "#EF4444", category: "canceled", ordinal: 4 },
    ],
    transitions: [
      { from: "Harvested", to: "Graded" },
      { from: "Graded", to: "Packed" },
      { from: "Packed", to: "Shipped" },
      { from: "Harvested", to: "Spoiled" },
      { from: "Graded", to: "Spoiled" },
      { from: "Packed", to: "Spoiled" },
    ],
    attributes: [
      { attrKey: "weight_lbs", dataType: "number", isRequired: true, unit: "lb", sortOrder: 0 },
      { attrKey: "quality_grade", dataType: "text", isRequired: false, sortOrder: 1 },
      { attrKey: "spoilage_pct", dataType: "number", isRequired: false, sortOrder: 2 },
      { attrKey: "harvest_date", dataType: "date", isRequired: true, sortOrder: 3 },
    ],
  };
}
