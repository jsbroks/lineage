import type { SeedLotType } from "../../../types";

export function buildSporehubsCulture(varieties: string[]): SeedLotType {
  return {
    name: "Culture",
    description:
      "A solid or liquid culture for genetic tracing and propagation",
    category: "genetics",
    quantityName: "Count",
    quantityDefaultUnit: "each",
    icon: "petri-dish",
    color: "#A855F7",
    codePrefix: "CU",
    options: [
      {
        name: "Variety",
        position: 0,
        values: varieties.map((v, i) => ({ value: v, position: i })),
      },
      {
        name: "Media",
        position: 1,
        values: [
          { value: "Agar", position: 0 },
          { value: "Liquid", position: 1 },
        ],
      },
    ],
    variants: varieties.map((v, i) => ({
      name: `${v} Culture`,
      isDefault: i === 0,
      sortOrder: i,
      optionSelections: { Variety: v },
    })),
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
      { from: "Ready", to: "Contaminated" },
    ],
    attributes: [
      {
        attrKey: "generation_number",
        dataType: "number",
        isRequired: true,
        sortOrder: 0,
      },
      {
        attrKey: "parent_culture_code",
        dataType: "text",
        isRequired: false,
        sortOrder: 1,
      },
      {
        attrKey: "isolation_date",
        dataType: "date",
        isRequired: false,
        sortOrder: 2,
      },
    ],
  };
}
