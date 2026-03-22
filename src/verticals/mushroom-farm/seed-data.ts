import type {
  SeedData,
  SeedItemType,
  SeedOperationType,
  SeedOperationTypeInput,
  SeedLocation,
} from "../types";

// ---------------------------------------------------------------------------
// Variety catalog — used by the VarietyPicker step
// ---------------------------------------------------------------------------

export const VARIETY_CATALOG = [
  { key: "white-button", label: "White Button", emoji: "🤍" },
  { key: "cremini", label: "Cremini (Baby Bella)", emoji: "🤎" },
  { key: "portobello", label: "Portobello", emoji: "🍄" },
  { key: "shiitake", label: "Shiitake", emoji: "🍄" },
  { key: "blue-oyster", label: "Blue Oyster", emoji: "💙" },
  { key: "golden-oyster", label: "Golden Oyster", emoji: "💛" },
  { key: "pink-oyster", label: "Pink Oyster", emoji: "🩷" },
  { key: "king-oyster", label: "King Oyster", emoji: "👑" },
  { key: "lions-mane", label: "Lion's Mane", emoji: "🦁" },
  { key: "maitake", label: "Maitake (Hen of the Woods)", emoji: "🌿" },
  { key: "enoki", label: "Enoki", emoji: "🌾" },
  { key: "chestnut", label: "Chestnut Mushroom", emoji: "🌰" },
] as const;

export type VarietyKey = (typeof VARIETY_CATALOG)[number]["key"];

// ---------------------------------------------------------------------------
// Workflow feature flags — used by the WorkflowConfigurator step
// ---------------------------------------------------------------------------

export interface WorkflowFlags {
  batchTracking: boolean;
  blockTracking: boolean;
  trayTracking: boolean;
  roomMetrics: boolean;
}

export const DEFAULT_WORKFLOW_FLAGS: WorkflowFlags = {
  batchTracking: true,
  blockTracking: true,
  trayTracking: false,
  roomMetrics: false,
};

// ---------------------------------------------------------------------------
// Seed data builders
// ---------------------------------------------------------------------------

function buildSpawnItemType(varieties: string[]): SeedItemType {
  return {
    name: "Spawn",
    description: "Grain or liquid spawn used to inoculate substrate",
    category: "input",
    quantityName: "Weight",
    quantityDefaultUnit: "lb",
    icon: "flask-conical",
    color: "#8B5CF6",
    codePrefix: "SP",
    options: [
      {
        name: "Variety",
        position: 0,
        values: varieties.map((v, i) => ({ value: v, position: i })),
      },
    ],
    variants: varieties.map((v, i) => ({
      name: `${v} Spawn`,
      isDefault: i === 0,
      sortOrder: i,
      optionSelections: { Variety: v },
    })),
    statuses: [
      {
        name: "In Stock",
        color: "#22C55E",
        isInitial: true,
        isTerminal: false,
        ordinal: 0,
      },
      {
        name: "In Use",
        color: "#3B82F6",
        isInitial: false,
        isTerminal: false,
        ordinal: 1,
      },
      {
        name: "Depleted",
        color: "#6B7280",
        isInitial: false,
        isTerminal: true,
        ordinal: 2,
      },
      {
        name: "Contaminated",
        color: "#EF4444",
        isInitial: false,
        isTerminal: true,
        ordinal: 3,
      },
    ],
    transitions: [
      { from: "In Stock", to: "In Use" },
      { from: "In Use", to: "Depleted" },
      { from: "In Stock", to: "Contaminated" },
      { from: "In Use", to: "Contaminated" },
    ],
  };
}

function buildBatchItemType(): SeedItemType {
  return {
    name: "Substrate Batch",
    description: "A pasteurized batch of substrate ready for inoculation",
    category: "wip",
    quantityName: "Weight",
    quantityDefaultUnit: "lb",
    icon: "container",
    color: "#F59E0B",
    codePrefix: "SB",
    statuses: [
      {
        name: "Mixing",
        color: "#F59E0B",
        isInitial: true,
        isTerminal: false,
        ordinal: 0,
      },
      {
        name: "Pasteurizing",
        color: "#EF4444",
        isInitial: false,
        isTerminal: false,
        ordinal: 1,
      },
      {
        name: "Cooling",
        color: "#3B82F6",
        isInitial: false,
        isTerminal: false,
        ordinal: 2,
      },
      {
        name: "Ready",
        color: "#22C55E",
        isInitial: false,
        isTerminal: false,
        ordinal: 3,
      },
      {
        name: "Used",
        color: "#6B7280",
        isInitial: false,
        isTerminal: true,
        ordinal: 4,
      },
    ],
    transitions: [
      { from: "Mixing", to: "Pasteurizing" },
      { from: "Pasteurizing", to: "Cooling" },
      { from: "Cooling", to: "Ready" },
      { from: "Ready", to: "Used" },
    ],
    attributes: [
      {
        attrKey: "substrate_type",
        dataType: "text",
        isRequired: true,
        sortOrder: 0,
      },
      {
        attrKey: "weight_lbs",
        dataType: "number",
        isRequired: false,
        unit: "lb",
        sortOrder: 1,
      },
    ],
  };
}

function buildBlockItemType(varieties: string[]): SeedItemType {
  return {
    name: "Grow Block",
    description: "An individual fruiting block or bag",
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
      {
        name: "Inoculated",
        color: "#8B5CF6",
        isInitial: true,
        isTerminal: false,
        ordinal: 0,
      },
      {
        name: "Colonizing",
        color: "#F59E0B",
        isInitial: false,
        isTerminal: false,
        ordinal: 1,
      },
      {
        name: "Fruiting",
        color: "#22C55E",
        isInitial: false,
        isTerminal: false,
        ordinal: 2,
      },
      {
        name: "Resting",
        color: "#6B7280",
        isInitial: false,
        isTerminal: false,
        ordinal: 3,
      },
      {
        name: "Spent",
        color: "#9CA3AF",
        isInitial: false,
        isTerminal: true,
        ordinal: 4,
      },
      {
        name: "Contaminated",
        color: "#EF4444",
        isInitial: false,
        isTerminal: true,
        ordinal: 5,
      },
    ],
    transitions: [
      { from: "Inoculated", to: "Colonizing" },
      { from: "Colonizing", to: "Fruiting" },
      { from: "Fruiting", to: "Resting" },
      { from: "Resting", to: "Fruiting" },
      { from: "Fruiting", to: "Spent" },
      { from: "Resting", to: "Spent" },
      { from: "Inoculated", to: "Contaminated" },
      { from: "Colonizing", to: "Contaminated" },
      { from: "Fruiting", to: "Contaminated" },
    ],
    attributes: [
      {
        attrKey: "inoculation_date",
        dataType: "date",
        isRequired: true,
        sortOrder: 0,
      },
      {
        attrKey: "flush_number",
        dataType: "number",
        isRequired: false,
        sortOrder: 1,
      },
    ],
  };
}

function buildTrayItemType(): SeedItemType {
  return {
    name: "Harvest Tray",
    description:
      "A container for harvested mushrooms ready for sale or processing",
    category: "output",
    quantityName: "Weight",
    quantityDefaultUnit: "lb",
    icon: "package",
    color: "#06B6D4",
    codePrefix: "HT",
    statuses: [
      {
        name: "Open",
        color: "#3B82F6",
        isInitial: true,
        isTerminal: false,
        ordinal: 0,
      },
      {
        name: "Closed",
        color: "#22C55E",
        isInitial: false,
        isTerminal: false,
        ordinal: 1,
      },
      {
        name: "Shipped",
        color: "#6B7280",
        isInitial: false,
        isTerminal: true,
        ordinal: 2,
      },
    ],
    transitions: [
      { from: "Open", to: "Closed" },
      { from: "Closed", to: "Shipped" },
    ],
  };
}

function buildQrLabelItemType(): SeedItemType {
  return {
    name: "QR Label",
    description: "Printed QR code label for tracking items",
    category: "consumable",
    quantityName: "Count",
    quantityDefaultUnit: "each",
    icon: "qr-code",
    color: "#1E293B",
    codePrefix: "QR",
    statuses: [
      {
        name: "Printed",
        color: "#3B82F6",
        isInitial: true,
        isTerminal: false,
        ordinal: 0,
      },
      {
        name: "Applied",
        color: "#22C55E",
        isInitial: false,
        isTerminal: true,
        ordinal: 1,
      },
    ],
    transitions: [{ from: "Printed", to: "Applied" }],
  };
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

function buildOperations(flags: WorkflowFlags): SeedOperationType[] {
  const ops: SeedOperationType[] = [];

  if (flags.batchTracking) {
    ops.push({
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
    });
    ops.push({
      name: "Pasteurize",
      description: "Pasteurize a substrate batch",
      icon: "flame",
      color: "#EF4444",
      category: "substrate",
      inputs: [
        {
          type: "items",
          referenceKey: "batch",
          sortOrder: 0,
          config: {
            itemTypeName: "Substrate Batch",
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
    });
  }

  if (flags.blockTracking) {
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
    if (flags.batchTracking) {
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
      label: "Block Count",
      required: true,
      sortOrder: inoculateInputs.length,
    });
    ops.push({
      name: "Inoculate",
      description: "Inoculate substrate with spawn to create grow blocks",
      icon: "syringe",
      color: "#8B5CF6",
      category: "cultivation",
      inputs: inoculateInputs,
    });
    ops.push({
      name: "Transfer to Fruiting",
      description: "Move colonized blocks into fruiting conditions",
      icon: "arrow-right",
      color: "#10B981",
      category: "cultivation",
      inputs: [
        {
          type: "items",
          referenceKey: "block",
          sortOrder: 0,
          config: {
            itemTypeName: "Grow Block",
            preconditionsStatuses: ["Colonizing"],
          },
        },
      ],
    });
    ops.push({
      name: "Observe",
      description:
        "Record observations on a grow block (colonization %, contamination check)",
      icon: "eye",
      color: "#6366F1",
      category: "cultivation",
      inputs: [
        {
          type: "items",
          referenceKey: "block",
          sortOrder: 0,
          config: { itemTypeName: "Grow Block" },
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
    });
    ops.push({
      name: "Harvest",
      description: "Harvest mushrooms from a fruiting block",
      icon: "scissors",
      color: "#22C55E",
      category: "harvest",
      inputs: [
        {
          type: "items",
          referenceKey: "block",
          sortOrder: 0,
          config: {
            itemTypeName: "Grow Block",
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
    });
    ops.push({
      name: "Mark Spent",
      description: "Mark a block as spent (no more flushes expected)",
      icon: "x-circle",
      color: "#9CA3AF",
      category: "cultivation",
      inputs: [
        {
          type: "items",
          referenceKey: "block",
          sortOrder: 0,
          config: {
            itemTypeName: "Grow Block",
            preconditionsStatuses: ["Fruiting", "Resting"],
          },
        },
      ],
    });
    ops.push({
      name: "Dispose",
      description: "Dispose of a contaminated or spent block",
      icon: "trash-2",
      color: "#EF4444",
      category: "cultivation",
      inputs: [
        {
          type: "items",
          referenceKey: "block",
          sortOrder: 0,
          config: {
            itemTypeName: "Grow Block",
            preconditionsStatuses: ["Spent", "Contaminated"],
          },
        },
      ],
    });
  }

  ops.push({
    name: "Print Labels",
    description: "Print QR code labels for items",
    icon: "printer",
    color: "#1E293B",
    category: "admin",
  });

  if (flags.trayTracking) {
    ops.push({
      name: "Close Tray",
      description: "Seal a harvest tray for shipment",
      icon: "package-check",
      color: "#06B6D4",
      category: "harvest",
      inputs: [
        {
          type: "items",
          referenceKey: "tray",
          sortOrder: 0,
          config: {
            itemTypeName: "Harvest Tray",
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
    });
  }

  if (flags.roomMetrics) {
    ops.push({
      name: "Record Room Metrics",
      description: "Log temperature, humidity, and CO₂ for a grow room",
      icon: "thermometer",
      color: "#0EA5E9",
      category: "environment",
      inputs: [
        {
          type: "number",
          referenceKey: "temperature_f",
          label: "Temperature (°F)",
          required: true,
          sortOrder: 0,
        },
        {
          type: "number",
          referenceKey: "humidity_pct",
          label: "Humidity (%)",
          sortOrder: 1,
        },
        {
          type: "number",
          referenceKey: "co2_ppm",
          label: "CO₂ (ppm)",
          sortOrder: 2,
        },
      ],
    });
  }

  return ops;
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

function buildLocations(): SeedLocation[] {
  return [
    {
      name: "Farm",
      type: "facility",
      description: "Main farm facility",
      children: [
        {
          name: "Lab",
          type: "room",
          description: "Clean room for inoculation",
        },
        {
          name: "Incubation Room",
          type: "room",
          description: "Dark room for colonization",
        },
        {
          name: "Fruiting Room 1",
          type: "room",
          description: "Humidity-controlled fruiting chamber",
        },
        {
          name: "Fruiting Room 2",
          type: "room",
          description: "Humidity-controlled fruiting chamber",
        },
        {
          name: "Harvest & Packing",
          type: "room",
          description: "Processing and packing area",
        },
        {
          name: "Cold Storage",
          type: "room",
          description: "Refrigerated storage for harvested product",
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

export function buildMushroomFarmSeedData(
  answers: Record<string, unknown>,
): SeedData {
  const varieties = (answers.varieties as string[] | undefined) ?? [
    "Blue Oyster",
  ];
  const flags: WorkflowFlags = {
    ...DEFAULT_WORKFLOW_FLAGS,
    ...(answers.workflowFlags as Partial<WorkflowFlags> | undefined),
  };

  const itemTypes: SeedItemType[] = [buildSpawnItemType(varieties)];

  if (flags.batchTracking) {
    itemTypes.push(buildBatchItemType());
  }
  if (flags.blockTracking) {
    itemTypes.push(buildBlockItemType(varieties));
  }
  if (flags.trayTracking) {
    itemTypes.push(buildTrayItemType());
  }

  itemTypes.push(buildQrLabelItemType());

  return {
    itemTypes,
    operations: buildOperations(flags),
    locations: buildLocations(),
  };
}
