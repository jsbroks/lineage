import type { SeedLotType } from "../../../types";

export function buildKinokoSample(): SeedLotType {
  return {
    name: "Sample",
    description: "A tissue sample, spore print, or clone for genetic isolation",
    category: "genetics",
    quantityName: "Count",
    quantityDefaultUnit: "each",
    icon: "microscope",
    color: "#EC4899",
    codePrefix: "SA",
    statuses: [
      {
        name: "Collected",
        color: "#F59E0B",
        category: "unstarted",
        ordinal: 0,
      },
      { name: "Stored", color: "#22C55E", category: "in_progress", ordinal: 1 },
      { name: "In Use", color: "#3B82F6", category: "in_progress", ordinal: 2 },
      { name: "Exhausted", color: "#6B7280", category: "done", ordinal: 3 },
    ],
    transitions: [
      { from: "Collected", to: "Stored" },
      { from: "Stored", to: "In Use" },
      { from: "In Use", to: "Exhausted" },
    ],
    attributes: [
      {
        attrKey: "source_type",
        dataType: "text",
        isRequired: true,
        sortOrder: 0,
      },
      {
        attrKey: "collection_date",
        dataType: "date",
        isRequired: true,
        sortOrder: 1,
      },
      {
        attrKey: "source_description",
        dataType: "text",
        isRequired: false,
        sortOrder: 2,
      },
    ],
  };
}
