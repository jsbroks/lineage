import type { VerticalDefinition } from "../types";
import { buildMushroomFarmSeedData } from "./seed-data";
import { VarietyPicker } from "./steps/VarietyPicker";
import { WorkflowConfigurator } from "./steps/WorkflowConfigurator";

export const mushroomFarmVertical: VerticalDefinition = {
  key: "mushroom-farm",
  name: "Mushroom Farm",
  description:
    "Full lifecycle tracking for gourmet & medicinal mushroom cultivation — from spawn through harvest.",
  icon: "sprout",
  steps: [
    {
      key: "varieties",
      title: "What varieties do you grow?",
      component: VarietyPicker,
    },
    {
      key: "workflow",
      title: "Configure your workflow",
      component: WorkflowConfigurator,
    },
  ],
  buildSeedData: buildMushroomFarmSeedData,
};
