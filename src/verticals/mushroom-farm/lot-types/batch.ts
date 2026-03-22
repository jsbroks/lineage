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
      {
        name: "Mixing",
        color: "#F59E0B",
        isInitial: true,
        isTerminal: false,
        ordinal: 0,
      },
      {
        name: "Pasteurizing",
        color: "#EF4444",
        isInitial: false,
        isTerminal: false,
        ordinal: 1,
      },
      {
        name: "Cooling",
        color: "#3B82F6",
        isInitial: false,
        isTerminal: false,
        ordinal: 2,
      },
      {
        name: "Ready",
        color: "#22C55E",
        isInitial: false,
        isTerminal: false,
        ordinal: 3,
      },
      {
        name: "Used",
        color: "#6B7280",
        isInitial: false,
        isTerminal: true,
        ordinal: 4,
      },
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
