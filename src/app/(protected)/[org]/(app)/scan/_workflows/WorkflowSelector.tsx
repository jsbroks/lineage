import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import type { ScanWorkflow, WorkflowMatch } from "./types";

interface EvaluatedWorkflow {
  workflow: ScanWorkflow;
  match: WorkflowMatch;
}

interface WorkflowSelectorProps {
  evaluated: EvaluatedWorkflow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function WorkflowSelector({
  evaluated,
  selectedId,
  onSelect,
}: WorkflowSelectorProps) {
  if (evaluated.length === 0) return null;

  return (
    <div className="space-y-2">
      {evaluated.map(({ workflow, match }) => {
        const isSelected = selectedId === workflow.id;
        const Icon = match.icon;
        return (
          <button
            key={workflow.id}
            type="button"
            onClick={() => onSelect(workflow.id)}
            className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all ${
              isSelected
                ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                : "border-border hover:border-foreground/20"
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon className="text-muted-foreground size-4 shrink-0" />
              <span className="flex-1 text-sm font-medium">{match.label}</span>
              {match.ready ? (
                <Badge
                  variant="ghost"
                  className="bg-green-100 text-[10px] text-green-700 dark:bg-green-900/30 dark:text-green-400"
                >
                  <CheckCircle2 className="mr-0.5 size-3" />
                  Ready
                </Badge>
              ) : (
                <Badge
                  variant="ghost"
                  className="bg-yellow-100 text-[10px] text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                >
                  <AlertCircle className="mr-0.5 size-3" />
                  Needs more
                </Badge>
              )}
            </div>
            {match.description && (
              <p className="text-muted-foreground mt-0.5 text-xs">
                {match.description}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

export type { EvaluatedWorkflow };
