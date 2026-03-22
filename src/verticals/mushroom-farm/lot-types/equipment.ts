import type { SeedLotType } from "~/verticals/types";

export function buildEquipmentLotType(): SeedLotType {
  return {
    name: "Equipment",
    description: "Equipment used in the mushroom farm",
    category: "input",
    quantityName: "Quantity",
    quantityDefaultUnit: "each",
    icon: "box",
    color: "#10B981",
    codePrefix: "EQ",
    statuses: [
      { name: "Available", isInitial: true, isTerminal: false, ordinal: 0 },
      { name: "In Use", isInitial: false, isTerminal: false, ordinal: 1 },
      { name: "Cleaning", isInitial: false, isTerminal: false, ordinal: 2 },
      { name: "Maintenance", isInitial: false, isTerminal: false, ordinal: 3 },
      { name: "Retired", isInitial: false, isTerminal: true, ordinal: 4 },
    ],
    transitions: [
      { from: "Available", to: "In Use" },
      { from: "In Use", to: "Cleaning" },
      { from: "In Use", to: "Retired" },
      { from: "In Use", to: "Maintenance" },
      { from: "Cleaning", to: "Available" },
      { from: "Available", to: "Maintenance" },
      { from: "Maintenance", to: "Available" },
      { from: "Available", to: "Retired" },
      { from: "Maintenance", to: "Retired" },
      { from: "Cleaning", to: "Retired" },
    ],
    attributes: [
      {
        attrKey: "Use Count",
        dataType: "number",
        isRequired: false,
        defaultValue: "0",
        sortOrder: 0,
      },
    ],
  };
}
