import type { SeedOperationType } from "../../types";

export function buildBatchOperations(): SeedOperationType[] {
  return [
    {
      name: "Create Batch",
      description: "Mix and prepare a new substrate batch",
      icon: "plus-circle",
      color: "#F59E0B",
      category: "substrate",
      inputs: [
        {
          type: "string",
          referenceKey: "substrate_type",
          label: "Substrate Type",
          required: true,
          sortOrder: 0,
        },
        {
          type: "number",
          referenceKey: "weight_lbs",
          label: "Weight (lb)",
          sortOrder: 1,
        },
      ],
    },
    {
      name: "Pasteurize",
      description: "Pasteurize a substrate batch",
      icon: "flame",
      color: "#EF4444",
      category: "substrate",
      inputs: [
        {
          type: "lots",
          referenceKey: "batch",
          sortOrder: 0,
          config: {
            lotTypeName: "Substrate Batch",
            preconditionsStatuses: ["Mixing"],
          },
        },
        {
          type: "number",
          referenceKey: "temperature_f",
          label: "Temperature (°F)",
          required: true,
          sortOrder: 1,
        },
        {
          type: "number",
          referenceKey: "duration_hrs",
          label: "Duration (hrs)",
          required: true,
          sortOrder: 2,
        },
      ],
    },
  ];
}
