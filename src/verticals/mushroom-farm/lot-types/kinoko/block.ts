import type { SeedLotType } from "../../../types";

export function buildKinokoBlock(varieties: string[]): SeedLotType {
  return {
    name: "Block",
    description: "An individual mushroom fruiting block tracked by QR code",
    category: "wip",
    quantityName: "Count",
    quantityDefaultUnit: "each",
    icon: "box",
    color: "#10B981",
    codePrefix: "BK",
    options: [
      {
        name: "Variety",
        position: 0,
        values: varieties.map((v, i) => ({ value: v, position: i })),
      },
    ],
    variants: varieties.map((v, i) => ({
      name: `${v} Block`,
      isDefault: i === 0,
      sortOrder: i,
      optionSelections: { Variety: v },
    })),
    statuses: [
      { name: "Inoculated", color: "#8B5CF6", category: "unstarted", ordinal: 0 },
      { name: "Colonizing", color: "#F59E0B", category: "in_progress", ordinal: 1 },
      { name: "Fruiting", color: "#22C55E", category: "in_progress", ordinal: 2 },
      { name: "Disposed", color: "#6B7280", category: "done", ordinal: 3 },
    ],
    transitions: [
      { from: "Inoculated", to: "Colonizing" },
      { from: "Colonizing", to: "Fruiting" },
      { from: "Fruiting", to: "Disposed" },
      { from: "Inoculated", to: "Disposed" },
      { from: "Colonizing", to: "Disposed" },
    ],
    attributes: [
      { attrKey: "inoculation_date", dataType: "date", isRequired: true, sortOrder: 0 },
      { attrKey: "location", dataType: "text", isRequired: false, sortOrder: 1 },
    ],
  };
}
