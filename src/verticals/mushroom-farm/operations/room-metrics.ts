import type { SeedOperationType } from "../../types";

export function buildRoomMetricsOperation(): SeedOperationType {
  return {
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
  };
}
