"use client";

import { useState } from "react";
import { Boxes, Bug, Package, Thermometer } from "lucide-react";
import type { StepProps } from "../../types";
import {
  DEFAULT_WORKFLOW_FLAGS,
  type WorkflowFlags,
  type MushroomWizardAnswers,
} from "../config";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";

type WorkflowOption = {
  key: keyof WorkflowFlags;
  title: string;
  description: string;
  icon: React.ReactNode;
};

const WORKFLOW_OPTIONS: WorkflowOption[] = [
  {
    key: "batchTracking",
    title: "Batch pasteurization tracking",
    description:
      "Track substrate batches through mixing, pasteurization, and cooling. Creates the Substrate Batch lot type with pasteurization operations.",
    icon: <Boxes className="size-5" />,
  },
  {
    key: "blockTracking",
    title: "Individual block tracking",
    description:
      "Track each grow unit (block, bag, or bed) from inoculation through fruiting and harvest. Creates the Grow Unit lot type with full lifecycle operations.",
    icon: <Bug className="size-5" />,
  },
  {
    key: "trayTracking",
    title: "Harvest tray tracking",
    description:
      "Pack harvested mushrooms into tracked containers (trays, boxes, or crates) for sale or distribution. Creates the Harvest Container lot type with a close operation.",
    icon: <Package className="size-5" />,
  },
  {
    key: "roomMetrics",
    title: "Room environmental monitoring",
    description:
      "Record temperature, humidity, and CO\u2082 readings for grow rooms. Adds a Record Room Metrics operation.",
    icon: <Thermometer className="size-5" />,
  },
];

export function WorkflowConfigurator({ answers, onNext, onBack }: StepProps<MushroomWizardAnswers>) {
  const [flags, setFlags] = useState<WorkflowFlags>({
    ...DEFAULT_WORKFLOW_FLAGS,
    ...answers.workflowFlags,
  });

  function toggle(key: keyof WorkflowFlags) {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Configure your workflow</h2>
        <p className="text-muted-foreground text-sm">
          Choose which tracking features to enable. You can change these later.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {WORKFLOW_OPTIONS.map((opt) => (
          <div
            key={opt.key}
            role="button"
            tabIndex={0}
            onClick={() => toggle(opt.key)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle(opt.key);
              }
            }}
            className={`flex cursor-pointer items-start gap-4 rounded-lg border p-4 text-left transition-all ${
              flags[opt.key]
                ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                : "border-border hover:border-muted-foreground/40 hover:bg-muted/50"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              <Checkbox checked={flags[opt.key]} tabIndex={-1} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="text-muted-foreground">{opt.icon}</span>
                {opt.title}
              </div>
              <div className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {opt.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={() => onNext({ workflowFlags: flags })}>
          Next
        </Button>
      </div>
    </div>
  );
}
