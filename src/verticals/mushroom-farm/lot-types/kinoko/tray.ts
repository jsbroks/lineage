import type { SeedLotType } from "../../../types";

export function buildKinokoTray(): SeedLotType {
  return {
    name: "Tray",
    description:
      "A harvest tray that collects mushrooms from one or more blocks",
    category: "output",
    quantityName: "Weight",
    quantityDefaultUnit: "lb",
    icon: "package",
    color: "#06B6D4",
    codePrefix: "TR",
    statuses: [
      { name: "Open", color: "#3B82F6", category: "unstarted", ordinal: 0 },
      { name: "Closed", color: "#22C55E", category: "done", ordinal: 1 },
    ],
    transitions: [{ from: "Open", to: "Closed" }],
    attributes: [
      {
        attrKey: "total_weight_lbs",
        dataType: "number",
        isRequired: false,
        unit: "lb",
        sortOrder: 0,
      },
    ],
  };
}
