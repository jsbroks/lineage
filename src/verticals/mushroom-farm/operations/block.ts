import type { SeedOperationType, SeedOperationTypeInput } from "../../types";

export function buildBlockOperations(
  hasBatchTracking: boolean,
): SeedOperationType[] {
  const inoculateInputs: SeedOperationTypeInput[] = [
    {
      type: "items",
      referenceKey: "spawn",
      sortOrder: 0,
      config: {
        itemTypeName: "Spawn",
        preconditionsStatuses: ["In Stock", "In Use"],
      },
    },
  ];
  if (hasBatchTracking) {
    inoculateInputs.push({
      type: "items",
      referenceKey: "batch",
      sortOrder: 1,
      config: {
        itemTypeName: "Substrate Batch",
        preconditionsStatuses: ["Ready"],
      },
    });
  }
  inoculateInputs.push({
    type: "number",
    referenceKey: "block_count",
    label: "Unit Count",
    required: true,
    sortOrder: inoculateInputs.length,
  });

  return [
    {
      name: "Inoculate",
      description: "Inoculate substrate with spawn to create grow units",
      icon: "syringe",
      color: "#8B5CF6",
      category: "cultivation",
      inputs: inoculateInputs,
    },
    {
      name: "Transfer to Fruiting",
      description: "Move colonized units into fruiting conditions",
      icon: "arrow-right",
      color: "#10B981",
      category: "cultivation",
      inputs: [
        {
          type: "items",
          referenceKey: "block",
          sortOrder: 0,
          config: {
            itemTypeName: "Grow Unit",
            preconditionsStatuses: ["Colonizing"],
          },
        },
      ],
    },
    {
      name: "Observe",
      description:
        "Record observations on a grow unit (colonization %, contamination check)",
      icon: "eye",
      color: "#6366F1",
      category: "cultivation",
      inputs: [
        {
          type: "items",
          referenceKey: "block",
          sortOrder: 0,
          config: { itemTypeName: "Grow Unit" },
        },
        {
          type: "number",
          referenceKey: "colonization_pct",
          label: "Colonization %",
          sortOrder: 1,
        },
        {
          type: "string",
          referenceKey: "notes",
          label: "Notes",
          sortOrder: 2,
        },
      ],
    },
    {
      name: "Harvest",
      description: "Harvest mushrooms from a fruiting unit",
      icon: "scissors",
      color: "#22C55E",
      category: "harvest",
      inputs: [
        {
          type: "items",
          referenceKey: "block",
          sortOrder: 0,
          config: {
            itemTypeName: "Grow Unit",
            preconditionsStatuses: ["Fruiting"],
          },
        },
        {
          type: "number",
          referenceKey: "harvest_weight_lbs",
          label: "Weight (lb)",
          required: true,
          sortOrder: 1,
        },
        {
          type: "number",
          referenceKey: "flush_number",
          label: "Flush #",
          sortOrder: 2,
        },
      ],
    },
    {
      name: "Mark Spent",
      description: "Mark a unit as spent (no more flushes expected)",
      icon: "x-circle",
      color: "#9CA3AF",
      category: "cultivation",
      inputs: [
        {
          type: "items",
          referenceKey: "block",
          sortOrder: 0,
          config: {
            itemTypeName: "Grow Unit",
            preconditionsStatuses: ["Fruiting", "Resting"],
          },
        },
      ],
    },
    {
      name: "Dispose",
      description: "Dispose of a contaminated or spent unit",
      icon: "trash-2",
      color: "#EF4444",
      category: "cultivation",
      inputs: [
        {
          type: "items",
          referenceKey: "block",
          sortOrder: 0,
          config: {
            itemTypeName: "Grow Unit",
            preconditionsStatuses: ["Spent", "Contaminated"],
          },
        },
      ],
    },
  ];
}
