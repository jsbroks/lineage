import type { SeedLotType } from "../../../types";

export function buildSporehubsRawMaterial(): SeedLotType {
  return {
    name: "Raw Material",
    description:
      "Consumable supplies — bags, gloves, sterilization chemicals, packaging",
    category: "input",
    quantityName: "Quantity",
    quantityDefaultUnit: "each",
    icon: "package",
    color: "#78716C",
    codePrefix: "RM",
    options: [
      {
        name: "Category",
        position: 0,
        values: [
          { value: "Bags & Containers", position: 0 },
          { value: "Sterilization", position: 1 },
          { value: "Packaging", position: 2 },
          { value: "PPE", position: 3 },
          { value: "Tools", position: 4 },
          { value: "Nutrients & Additives", position: 5 },
        ],
      },
    ],
    variants: [
      { name: "Unicorn Bags", isDefault: true, sortOrder: 0, optionSelections: { Category: "Bags & Containers" } },
      { name: "Grow Bags (5 lb)", isDefault: false, sortOrder: 1, optionSelections: { Category: "Bags & Containers" } },
      { name: "Alcohol (70%)", isDefault: false, sortOrder: 2, optionSelections: { Category: "Sterilization" } },
      { name: "Hydrogen Peroxide", isDefault: false, sortOrder: 3, optionSelections: { Category: "Sterilization" } },
      { name: "Clamshell Packs", isDefault: false, sortOrder: 4, optionSelections: { Category: "Packaging" } },
      { name: "Shrink Wrap", isDefault: false, sortOrder: 5, optionSelections: { Category: "Packaging" } },
      { name: "Nitrile Gloves", isDefault: false, sortOrder: 6, optionSelections: { Category: "PPE" } },
      { name: "Gypsum", isDefault: false, sortOrder: 7, optionSelections: { Category: "Nutrients & Additives" } },
    ],
    statuses: [
      { name: "In Stock", color: "#22C55E", category: "unstarted", ordinal: 0 },
      { name: "Low Stock", color: "#F59E0B", category: "in_progress", ordinal: 1 },
      { name: "Out of Stock", color: "#EF4444", category: "in_progress", ordinal: 2 },
      { name: "Discontinued", color: "#6B7280", category: "done", ordinal: 3 },
    ],
    transitions: [
      { from: "In Stock", to: "Low Stock" },
      { from: "Low Stock", to: "Out of Stock" },
      { from: "Low Stock", to: "In Stock" },
      { from: "Out of Stock", to: "In Stock" },
      { from: "In Stock", to: "Discontinued" },
      { from: "Low Stock", to: "Discontinued" },
      { from: "Out of Stock", to: "Discontinued" },
    ],
    attributes: [
      { attrKey: "reorder_threshold", dataType: "number", isRequired: false, sortOrder: 0 },
      { attrKey: "supplier", dataType: "text", isRequired: false, sortOrder: 1 },
      { attrKey: "unit_cost", dataType: "number", isRequired: false, unit: "USD", sortOrder: 2 },
    ],
  };
}
