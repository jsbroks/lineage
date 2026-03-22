import type { SeedLotType } from "../../../types";

export function buildKinokoCulture(): SeedLotType {
  return {
    name: "Culture",
    description:
      "An agar plate or liquid culture grown from a sample or parent culture",
    category: "genetics",
    quantityName: "Count",
    quantityDefaultUnit: "each",
    icon: "petri-dish",
    color: "#A855F7",
    codePrefix: "CU",
    statuses: [
      {
        name: "Inoculated",
        color: "#F59E0B",
        category: "unstarted",
        ordinal: 0,
      },
      {
        name: "Growing",
        color: "#8B5CF6",
        category: "in_progress",
        ordinal: 1,
      },
      { name: "Ready", color: "#22C55E", category: "in_progress", ordinal: 2 },
      { name: "In Use", color: "#3B82F6", category: "in_progress", ordinal: 3 },
      { name: "Exhausted", color: "#6B7280", category: "done", ordinal: 4 },
      {
        name: "Contaminated",
        color: "#EF4444",
        category: "canceled",
        ordinal: 5,
      },
    ],
    transitions: [
      { from: "Inoculated", to: "Growing" },
      { from: "Growing", to: "Ready" },
      { from: "Ready", to: "In Use" },
      { from: "In Use", to: "Exhausted" },
      { from: "Inoculated", to: "Contaminated" },
      { from: "Growing", to: "Contaminated" },
    ],
    attributes: [
      {
        attrKey: "media_type",
        dataType: "text",
        isRequired: true,
        sortOrder: 0,
      },
      {
        attrKey: "generation_number",
        dataType: "number",
        isRequired: true,
        sortOrder: 1,
      },
    ],
  };
}
