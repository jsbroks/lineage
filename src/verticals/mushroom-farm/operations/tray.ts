import type { SeedOperationType } from "../../types";

export function buildTrayOperations(): SeedOperationType[] {
  return [
    {
      name: "Close Container",
      description: "Seal a harvest container for shipment",
      icon: "package-check",
      color: "#06B6D4",
      category: "harvest",
      inputs: [
        {
          type: "items",
          referenceKey: "tray",
          sortOrder: 0,
          config: {
            itemTypeName: "Harvest Container",
            preconditionsStatuses: ["Open"],
          },
        },
        {
          type: "number",
          referenceKey: "total_weight_lbs",
          label: "Total Weight (lb)",
          required: true,
          sortOrder: 1,
        },
      ],
    },
  ];
}
