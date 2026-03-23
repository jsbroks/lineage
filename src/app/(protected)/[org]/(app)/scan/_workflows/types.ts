import type { RouterOutputs } from "~/trpc/react";

export type ScanContext = RouterOutputs["scan"]["lookup"];

export interface WorkflowMatch {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  ready: boolean;
  priority: number;
}

export interface WorkflowResult {
  message: string;
}

export interface WorkflowPanelProps {
  ctx: ScanContext;
  onComplete: (result: WorkflowResult) => void;
}

export type WorkflowPanel = React.ComponentType<WorkflowPanelProps>;

export interface ScanWorkflow {
  id: string;
  match(ctx: ScanContext): WorkflowMatch | null;
  Panel: WorkflowPanel;
}
