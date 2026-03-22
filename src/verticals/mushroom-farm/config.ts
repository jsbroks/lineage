import { z } from "zod";

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

export const workflowFlagsSchema = z.object({
  batchTracking: z.boolean(),
  blockTracking: z.boolean(),
  trayTracking: z.boolean(),
  roomMetrics: z.boolean(),
});

export type WorkflowFlags = z.infer<typeof workflowFlagsSchema>;

export const DEFAULT_WORKFLOW_FLAGS: WorkflowFlags = {
  batchTracking: true,
  blockTracking: true,
  trayTracking: false,
  roomMetrics: false,
};
