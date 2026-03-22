"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
  type Html5QrcodeCameraScanConfig,
} from "html5-qrcode";
import { Camera, CameraOff, SwitchCamera, X } from "lucide-react";
import { Button } from "~/components/ui/button";

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
];

const SCAN_CONFIG: Html5QrcodeCameraScanConfig = {
  fps: 10,
  qrbox: { width: 350, height: 260 },
  aspectRatio: 1.5,
  // formatsToSupport: SUPPORTED_FORMATS,
};

const DEBOUNCE_MS = 1000;

interface CameraScannerProps {
  onResult: (decodedText: string, formatName?: string) => void;
  onError?: (message: string) => void;
  onClose: () => void;
}

export function CameraScanner({
  onResult,
  onError,
  onClose,
}: CameraScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastResultRef = useRef<{
    text: string;
    time: number;
    type?: string;
  } | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const handleFlip = useCallback(() => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, []);

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => setHasMultipleCameras(devices.length > 1))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const containerId = "camera-scanner-region";
    let cancelled = false;

    const scanner = new Html5Qrcode(containerId, {
      formatsToSupport: SUPPORTED_FORMATS,
      verbose: false,
    });
    scannerRef.current = scanner;
    let running = false;

    setIsStarting(true);
    setCameraError(null);

    const mediaConfig: MediaTrackConstraints = {
      facingMode,
    };

    scanner
      .start(
        mediaConfig,
        SCAN_CONFIG,
        (_, { decodedText, result }) => {
          console.log(result);
          const now = Date.now();
          const last = lastResultRef.current;
          if (
            last &&
            last.text === decodedText &&
            now - last.time < DEBOUNCE_MS
          ) {
            return;
          }
          const formatName = result.format?.formatName;
          lastResultRef.current = {
            text: decodedText,
            time: now,
            type: formatName,
          };
          onResultRef.current(decodedText, formatName);
        },
        () => {},
      )
      .then(() => {
        running = true;
        if (cancelled) {
          scanner
            .stop()
            .then(() => scanner.clear())
            .catch(() => {});
        } else {
          setIsStarting(false);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setIsStarting(false);
        const msg =
          err instanceof Error
            ? err.message
            : "Could not access camera. Check permissions.";
        setCameraError(msg);
        onErrorRef.current?.(msg);
      });

    return () => {
      cancelled = true;
      if (running) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      }
      scannerRef.current = null;
    };
  }, [facingMode]);

  return (
    <div className="bg-muted/30 border-border relative overflow-hidden rounded-lg border">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Camera className="text-primary size-4" />
          Camera Scanner
        </div>
        <div className="flex items-center gap-1">
          {hasMultipleCameras && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleFlip}
              disabled={isStarting}
              title="Switch camera"
            >
              <SwitchCamera className="size-3.5" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            title="Close camera"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Scanner viewport */}
      <div className="relative aspect-3/2 w-full overflow-hidden">
        <div
          id="camera-scanner-region"
          ref={containerRef}
          className="size-full"
        />

        {/* Viewfinder overlay — sits on top of the video feed */}
        {!cameraError && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative size-[60%]">
              {/* Corner brackets */}
              <span className="border-primary/70 absolute top-0 left-0 size-5 rounded-tl border-t-2 border-l-2" />
              <span className="border-primary/70 absolute top-0 right-0 size-5 rounded-tr border-t-2 border-r-2" />
              <span className="border-primary/70 absolute bottom-0 left-0 size-5 rounded-bl border-b-2 border-l-2" />
              <span className="border-primary/70 absolute right-0 bottom-0 size-5 rounded-br border-r-2 border-b-2" />

              {/* Scan line animation */}
              <span className="bg-primary/40 absolute top-0 left-[10%] h-0.5 w-[80%] animate-pulse" />
            </div>
          </div>
        )}

        {/* Loading state */}
        {isStarting && !cameraError && (
          <div className="bg-background/60 absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Camera className="text-muted-foreground size-8 animate-pulse" />
            <p className="text-muted-foreground text-xs">Starting camera...</p>
          </div>
        )}

        {/* Error state */}
        {cameraError && (
          <div className="bg-background/80 absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <CameraOff className="text-muted-foreground size-8" />
            <p className="text-sm font-medium">Camera unavailable</p>
            <p className="text-muted-foreground text-xs">{cameraError}</p>
          </div>
        )}
      </div>

      {/* Helper text */}
      <div className="px-3 py-2 text-center">
        <p className="text-muted-foreground text-xs">
          Point at a barcode or QR code to scan
        </p>
      </div>
    </div>
  );
}
