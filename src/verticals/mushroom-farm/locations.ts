import type { SeedLocation } from "../types";

export function buildLocations(): SeedLocation[] {
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
