import type { SeedLotType } from "../../../types";

export function buildSporehubsSubstrateBatch(): SeedLotType {
  return {
    name: "Media Batch",
    description:
      "A substrate batch including bulk substrate, bags, and additives",
    category: "wip",
    quantityName: "Weight",
    quantityDefaultUnit: "lb",
    icon: "container",
    color: "#F59E0B",
    codePrefix: "MB",
    options: [
      {
        name: "Substrate Type",
        position: 0,
        values: [
          { value: "Hardwood Sawdust", position: 0 },
          { value: "Straw", position: 1 },
          { value: "Coco Coir", position: 2 },
          { value: "Manure/Compost", position: 3 },
          { value: "Custom Mix", position: 4 },
        ],
      },
    ],
    statuses: [
      { name: "Mixing", color: "#F59E0B", category: "unstarted", ordinal: 0 },
      { name: "Pasteurizing", color: "#EF4444", category: "in_progress", ordinal: 1 },
      { name: "Cooling", color: "#3B82F6", category: "in_progress", ordinal: 2 },
      { name: "Ready", color: "#22C55E", category: "in_progress", ordinal: 3 },
      { name: "Used", color: "#6B7280", category: "done", ordinal: 4 },
    ],
    transitions: [
      { from: "Mixing", to: "Pasteurizing" },
      { from: "Pasteurizing", to: "Cooling" },
      { from: "Cooling", to: "Ready" },
      { from: "Ready", to: "Used" },
    ],
    attributes: [
      { attrKey: "weight_lbs", dataType: "number", isRequired: true, unit: "lb", sortOrder: 0 },
      { attrKey: "additives", dataType: "text", isRequired: false, sortOrder: 1 },
    ],
  };
}
