import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  ScanBarcode,
  X,
  Zap,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { ExecuteResult } from "../_workflows/types";

interface ResultsViewProps {
  result: ExecuteResult;
  onReset: () => void;
}

export function ResultsView({ result, onReset }: ResultsViewProps) {
  const failedSteps = result.steps.filter((s) => !s.skipped && !s.success);
  const hasErrors = failedSteps.length > 0;
  const executedCount = result.steps.filter((s) => !s.skipped).length;
  const skippedCount = result.steps.filter((s) => s.skipped).length;
  const succeededCount = executedCount - failedSteps.length;

  return (
    <div className="space-y-6">
      <Card
        className={
          hasErrors
            ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
            : "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
        }
      >
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                hasErrors
                  ? "bg-red-100 dark:bg-red-900/40"
                  : "bg-green-100 dark:bg-green-900/40"
              }`}
            >
              {hasErrors ? (
                <AlertCircle className="size-5 text-red-600" />
              ) : (
                <CheckCircle2 className="size-5 text-green-600" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">
                {hasErrors ? "Completed with errors" : "Done!"}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {succeededCount} step(s) succeeded
                {failedSteps.length > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    , {failedSteps.length} failed
                  </span>
                )}
                {skippedCount > 0 && <>, {skippedCount} skipped</>}.
              </p>

              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                {result.lotsCreated.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Zap className="size-3.5 text-blue-500" />
                    <span>{result.lotsCreated.length} created</span>
                  </div>
                )}
                {result.lotsUpdated.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-green-500" />
                    <span>{result.lotsUpdated.length} updated</span>
                  </div>
                )}
                {result.lineageCreated > 0 && (
                  <div className="flex items-center gap-1.5">
                    <ChevronRight className="size-3.5 text-purple-500" />
                    <span>{result.lineageCreated} connection(s)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasErrors && (
        <Card>
          <CardHeader>
            <CardTitle>Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {failedSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-md bg-red-50 px-3 py-2 dark:bg-red-950/20"
                >
                  <div className="mt-0.5 shrink-0">
                    <div className="flex size-5 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40">
                      <X className="size-3" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">{step.stepName}</span>
                    {step.detail && (
                      <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                        {step.detail}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button onClick={onReset} variant="outline" className="gap-2">
          <ScanBarcode className="size-4" />
          Scan More
        </Button>
      </div>
    </div>
  );
}
