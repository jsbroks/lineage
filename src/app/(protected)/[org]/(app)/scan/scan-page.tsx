"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ScanBarcode } from "lucide-react";

import { api } from "~/trpc/react";
import { ResultsView } from "./_components/ResultsView";
import { ScanInput } from "./_components/ScanInput";
import { ScannedItemsList } from "./_components/ScannedItemsList";
import { scanWorkflows } from "./_workflows";
import {
  WorkflowSelector,
  type EvaluatedWorkflow,
} from "./_workflows/WorkflowSelector";
import type { CodeInput } from "~/server/api/routers/scan";

type ExecuteResult = {
  message: string;
};

const NoItemsScanned: React.FC = () => {
  return (
    <div className="text-muted-foreground flex flex-1 items-center justify-center p-8 text-center">
      <p className="text-sm">Scan items to see available actions.</p>
    </div>
  );
};

export default function ScanPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [scanCodes, setScanCodes] = useState<CodeInput[]>([]);
  const [scanInput, setScanInput] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    null,
  );
  const [result, setResult] = useState<ExecuteResult | null>(null);

  const lookupQuery = api.scan.lookup.useQuery(
    { codes: scanCodes },
    { enabled: scanCodes.length > 0 },
  );

  // Derive items from the lookup query result
  const lookupItems = useMemo(
    () =>
      lookupQuery.data ?? {
        lots: [],
        lotTypes: [],
        locations: [],
        unknowns: [],
      },
    [lookupQuery.data],
  );

  const evaluated = useMemo(() => {
    const matches: EvaluatedWorkflow[] = [];
    for (const workflow of scanWorkflows) {
      const match = workflow.match(lookupItems);
      if (match) matches.push({ workflow, match });
    }
    matches.sort((a, b) => b.match.priority - a.match.priority);
    return matches;
  }, [lookupItems]);

  const bestWorkflowId = evaluated[0]?.workflow.id ?? null;
  const effectiveSelectedId =
    selectedWorkflowId &&
    evaluated.some((e) => e.workflow.id === selectedWorkflowId)
      ? selectedWorkflowId
      : bestWorkflowId;

  const selectedWorkflow = evaluated.find(
    (e) => e.workflow.id === effectiveSelectedId,
  );

  // --- Add a scanned code ---

  const addCode = useCallback(
    (code: string, formatName?: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;

      if (scanCodes.some((c) => c.code === trimmed)) {
        setScanError(`"${trimmed}" is already scanned`);
        setScanInput("");
        inputRef.current?.focus();
        return;
      }

      setScanError(null);
      setScanCodes((prev) => [
        ...prev,
        { code: trimmed, codeType: formatName },
      ]);
      setScanInput("");
      inputRef.current?.focus();
    },
    [scanCodes],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCode(scanInput);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted.includes("\n") || pasted.includes("\r")) {
      e.preventDefault();
      addCode(pasted);
    }
  };

  const removeItem = (code: string) => {
    setScanCodes((prev) => prev.filter((c) => c.code !== code));
    setResult(null);
  };

  const reset = () => {
    setScanCodes([]);
    setSelectedWorkflowId(null);
    setResult(null);
    setScanInput("");
    setScanError(null);
    setCameraOpen(false);
    inputRef.current?.focus();
  };

  if (result) {
    return (
      <div className="container mx-auto max-w-4xl px-6 py-8">
        <ResultsView result={result} onReset={reset} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex size-9 items-center justify-center rounded-lg">
            <ScanBarcode className="text-primary size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Smart Scan</h1>
            <p className="text-muted-foreground text-sm">
              Scan lots to auto-detect and execute operations.
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex w-1/2 flex-col border-r">
          <ScanInput
            inputRef={inputRef}
            scanInput={scanInput}
            onScanInputChange={(v) => {
              setScanInput(v);
              setScanError(null);
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            isLookingUp={lookupQuery.isFetching}
            scanError={scanError}
            cameraOpen={cameraOpen}
            onToggleCamera={() => setCameraOpen((prev) => !prev)}
            onCameraScan={(text, fmt) => addCode(text, fmt)}
          />
          <ScannedItemsList
            items={scanCodes}
            ctx={lookupItems}
            onRemove={removeItem}
          />
        </div>

        <div className="flex w-1/2 flex-col">
          {scanCodes.length === 0 && <NoItemsScanned />}

          {scanCodes.length > 0 && (
            <>
              <div className="border-b p-4">
                <label className="text-muted-foreground mb-1.5 block text-xs font-medium tracking-wide uppercase">
                  Actions
                </label>

                <WorkflowSelector
                  evaluated={evaluated}
                  selectedId={effectiveSelectedId}
                  onSelect={setSelectedWorkflowId}
                />

                {evaluated.length === 0 && (
                  <p className="text-muted-foreground py-3 text-sm">
                    No actions available for these items.
                  </p>
                )}
              </div>

              {selectedWorkflow && (
                <div className="flex min-h-0 flex-1 flex-col">
                  <selectedWorkflow.workflow.Panel
                    ctx={lookupItems}
                    onComplete={(workflowResult) => {
                      setResult(workflowResult);
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
