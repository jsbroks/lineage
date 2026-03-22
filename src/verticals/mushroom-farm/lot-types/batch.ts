import type { SeedLotType } from "../../types";

export function buildBatchLotType(): SeedLotType {
  return {
    name: "Substrate Batch",
    description: "A pasteurized batch of substrate ready for inoculation",
    category: "wip",
    quantityName: "Weight",
    quantityDefaultUnit: "lb",
    icon: "container",
    color: "#F59E0B",
    codePrefix: "SB",
    statuses: [
      { name: "Mixing", color: "#F59E0B", category: "unstarted", ordinal: 0 },
      {
        name: "Pasteurizing",
        color: "#EF4444",
        category: "in_progress",
        ordinal: 1,
      },
      {
        name: "Cooling",
        color: "#3B82F6",
        category: "in_progress",
        ordinal: 2,
      },
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
      {
        attrKey: "substrate_type",
        dataType: "text",
        isRequired: true,
        sortOrder: 0,
      },
      {
        attrKey: "weight_lbs",
        dataType: "number",
        isRequired: false,
        unit: "lb",
        sortOrder: 1,
      },
    ],
  };
}
