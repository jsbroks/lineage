"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ScanBarcode } from "lucide-react";

import { api } from "~/trpc/react";
import { ResultsView } from "./_components/ResultsView";
import { ScanInput } from "./_components/ScanInput";
import { ScannedItemsList } from "./_components/ScannedItemsList";
import { scanWorkflows } from "./_workflows";
import { parseLotIdFromQrUrl } from "./_workflows/parse-scanned-value";
import type { ScannedItem, ExecuteResult } from "./_workflows/types";
import { buildScanContext } from "./_workflows/types";
import {
  WorkflowSelector,
  type EvaluatedWorkflow,
} from "./_workflows/WorkflowSelector";

export default function ScanPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<ScannedItem[]>([]);
  const [scanInput, setScanInput] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    null,
  );
  const [result, setResult] = useState<ExecuteResult | null>(null);

  const utils = api.useUtils();

  // --- Derive scan context from items ---

  const ctx = useMemo(() => buildScanContext(items), [items]);

  // --- Evaluate workflows against current context ---

  const evaluated = useMemo(() => {
    const matches: EvaluatedWorkflow[] = [];
    for (const workflow of scanWorkflows) {
      const match = workflow.match(ctx);
      if (match) matches.push({ workflow, match });
    }
    matches.sort((a, b) => b.match.priority - a.match.priority);
    return matches;
  }, [ctx]);

  // Auto-select highest priority workflow when evaluation changes
  const bestWorkflowId = evaluated[0]?.workflow.id ?? null;
  const effectiveSelectedId =
    selectedWorkflowId &&
    evaluated.some((e) => e.workflow.id === selectedWorkflowId)
      ? selectedWorkflowId
      : bestWorkflowId;

  const selectedWorkflow = evaluated.find(
    (e) => e.workflow.id === effectiveSelectedId,
  );

  // --- Resolve chain: QR URL → lot code → location → unknown ---

  const handleScan = useCallback(
    async (code: string, formatName?: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;

      // Check duplicates by raw code
      if (items.some((i) => i.rawCode === trimmed)) {
        setScanError(`"${trimmed}" is already scanned`);
        setScanInput("");
        inputRef.current?.focus();
        return;
      }

      setIsLookingUp(true);
      setScanError(null);

      // Step 1: Parse QR URL
      const lotIdFromQr = parseLotIdFromQrUrl(trimmed);
      if (lotIdFromQr) {
        try {
          const data = await utils.lot.getByCode.fetch({ code: lotIdFromQr });
          if (
            items.some((i) => i.kind === "lot" && i.lot.lot.id === data.lot.id)
          ) {
            setScanError(`"${trimmed}" is already scanned`);
          } else {
            setItems((prev) => [
              ...prev,
              { kind: "lot", lot: data, rawCode: trimmed, formatName },
            ]);
            setResult(null);
          }
          setScanInput("");
          setIsLookingUp(false);
          inputRef.current?.focus();
          return;
        } catch {
          // QR URL parse succeeded but lot not found by that ID — try resolveIdentifier
          try {
            const resolved = await utils.lot.resolveIdentifier.fetch({
              identifierValue: trimmed,
            });
            if (resolved) {
              setItems((prev) => [
                ...prev,
                { kind: "lot", lot: resolved, rawCode: trimmed, formatName },
              ]);
              setResult(null);
              setScanInput("");
              setIsLookingUp(false);
              inputRef.current?.focus();
              return;
            }
          } catch {
            // fall through
          }
        }
      }

      // Step 2: Try lot code
      try {
        const data = await utils.lot.getByCode.fetch({ code: trimmed });
        if (
          items.some((i) => i.kind === "lot" && i.lot.lot.id === data.lot.id)
        ) {
          setScanError(`"${trimmed}" is already scanned`);
        } else {
          setItems((prev) => [
            ...prev,
            { kind: "lot", lot: data, rawCode: trimmed, formatName },
          ]);
          setResult(null);
        }
        setScanInput("");
        setIsLookingUp(false);
        inputRef.current?.focus();
        return;
      } catch {
        // Not a lot — continue
      }

      // Step 3: Try identifier table
      try {
        const resolved = await utils.lot.resolveIdentifier.fetch({
          identifierValue: trimmed,
        });
        if (resolved) {
          if (
            items.some(
              (i) => i.kind === "lot" && i.lot.lot.id === resolved.lot.id,
            )
          ) {
            setScanError(`"${trimmed}" is already scanned`);
          } else {
            setItems((prev) => [
              ...prev,
              { kind: "lot", lot: resolved, rawCode: trimmed, formatName },
            ]);
            setResult(null);
          }
          setScanInput("");
          setIsLookingUp(false);
          inputRef.current?.focus();
          return;
        }
      } catch {
        // Not in identifier table — continue
      }

      // Step 4: Try location
      try {
        const loc = await utils.location.getByName.fetch({ name: trimmed });
        if (loc) {
          if (
            items.some((i) => i.kind === "location" && i.location.id === loc.id)
          ) {
            setScanError(`"${loc.name}" is already scanned`);
          } else {
            setItems((prev) => [
              ...prev,
              { kind: "location", location: loc, rawCode: trimmed, formatName },
            ]);
            setResult(null);
          }
          setScanInput("");
          setIsLookingUp(false);
          inputRef.current?.focus();
          return;
        }
      } catch {
        // fall through
      }

      // Step 5: Unknown — add as unrecognized item
      setItems((prev) => [
        ...prev,
        { kind: "unknown", rawCode: trimmed, formatName },
      ]);
      setResult(null);
      setScanInput("");
      setIsLookingUp(false);
      inputRef.current?.focus();
    },
    [
      items,
      utils.lot.getByCode,
      utils.lot.resolveIdentifier,
      utils.location.getByName,
    ],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleScan(scanInput);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted.includes("\n") || pasted.includes("\r")) {
      e.preventDefault();
      void handleScan(pasted);
    }
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
  };

  const reset = () => {
    setItems([]);
    setSelectedWorkflowId(null);
    setResult(null);
    setScanInput("");
    setScanError(null);
    setCameraOpen(false);
    inputRef.current?.focus();
  };

  // --- Results screen ---

  if (result) {
    return (
      <div className="container mx-auto max-w-4xl px-6 py-8">
        <ResultsView result={result} onReset={reset} />
      </div>
    );
  }

  // --- Main scan UI ---

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
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

      {/* Split layout */}
      <div className="flex min-h-0 flex-1">
        {/* Left panel — scan input + scanned items */}
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
            isLookingUp={isLookingUp}
            scanError={scanError}
            cameraOpen={cameraOpen}
            onToggleCamera={() => setCameraOpen((prev) => !prev)}
            onCameraScan={(text, fmt) => void handleScan(text, fmt)}
          />
          <ScannedItemsList items={items} onRemove={removeItem} />
        </div>

        {/* Right panel — workflow selector + active workflow panel */}
        <div className="flex w-1/2 flex-col">
          {items.length === 0 && (
            <div className="text-muted-foreground flex flex-1 items-center justify-center p-8 text-center">
              <p className="text-sm">Scan items to see available actions.</p>
            </div>
          )}

          {items.length > 0 && (
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
                    ctx={ctx}
                    onComplete={(workflowResult) => {
                      if (workflowResult.updatedItems) {
                        setItems(workflowResult.updatedItems);
                      } else {
                        setResult({
                          operationId: "",
                          steps: [
                            {
                              stepName: workflowResult.message,
                              action: "workflow",
                              skipped: false,
                              success: true,
                            },
                          ],
                          lotsCreated: [],
                          lotsUpdated: [],
                          lineageCreated: 0,
                        });
                      }
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
