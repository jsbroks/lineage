"use client";

import type React from "react";

import { AlertCircle, Camera, Loader2, ScanBarcode } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { CameraScanner } from "./CameraScanner";

interface ScanInputProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  scanInput: string;
  onScanInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  isLookingUp: boolean;
  scanError: string | null;
  cameraOpen: boolean;
  onToggleCamera: () => void;
  onCameraScan: (text: string, formatName?: string) => void;
}

export function ScanInput({
  inputRef,
  scanInput,
  onScanInputChange,
  onKeyDown,
  onPaste,
  isLookingUp,
  scanError,
  cameraOpen,
  onToggleCamera,
  onCameraScan,
}: ScanInputProps) {
  return (
    <div className="p-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanBarcode className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
          <Input
            ref={inputRef}
            autoFocus
            placeholder="Scan or type lot code..."
            value={scanInput}
            onChange={(e) => onScanInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            className="pl-9"
            disabled={isLookingUp}
          />
          {isLookingUp && (
            <Loader2 className="text-muted-foreground absolute top-2.5 right-2.5 size-4 animate-spin" />
          )}
        </div>
        <Button
          type="button"
          variant={cameraOpen ? "default" : "outline"}
          size="icon"
          onClick={onToggleCamera}
          title={cameraOpen ? "Close camera" : "Open camera scanner"}
        >
          <Camera className="size-4" />
        </Button>
      </div>
      {scanError && (
        <p className="mt-1.5 flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="size-3.5 shrink-0" />
          {scanError}
        </p>
      )}
      {cameraOpen && (
        <div className="mt-3">
          <CameraScanner onResult={onCameraScan} onClose={onToggleCamera} />
        </div>
      )}
    </div>
  );
}
