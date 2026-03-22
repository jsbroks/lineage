"use client";

import React from "react";
import QRCode from "react-qr-code";
import Barcode from "react-barcode";

import type { LabelContent, LabelTemplate, PrintItem } from "../_lib/templates";

interface SingleLabelProps {
  item: PrintItem;
  template: LabelTemplate;
  content: LabelContent;
  origin: string;
}

export const SingleLabel: React.FC<SingleLabelProps> = ({
  item,
  template,
  content,
  origin,
}) => {
  const w = template.labelWidth;
  const h = template.labelHeight;
  const isLandscape = w > h;
  const dpi = 96;
  const pxW = w * dpi;
  const pxH = h * dpi;

  const hasQr = content.showQrCode;
  const hasBarcode = content.showBarcode;
  const hasText =
    content.showItemCode ||
    content.showTypeName ||
    content.showVariantName ||
    content.customText;

  const qrSize = Math.min(pxH * 0.7, pxW * (isLandscape ? 0.3 : 0.5));
  const barcodeHeight = Math.max(20, pxH * 0.25);
  const barcodeWidth = Math.max(1, Math.min(2, pxW / 200));
  const fontSize = Math.max(7, Math.min(12, pxH * 0.08));

  return (
    <div
      className="flex items-center justify-center overflow-hidden"
      style={{
        width: `${w}in`,
        height: `${h}in`,
        padding: `${Math.max(2, pxH * 0.04)}px`,
        boxSizing: "border-box",
      }}
    >
      <div
        className={`flex h-full w-full items-center gap-1 ${isLandscape ? "flex-row" : "flex-col justify-center"}`}
      >
        {hasQr && (
          <div className="flex shrink-0 items-center justify-center">
            <QRCode
              value={`${origin}/l/${item.id}`}
              size={Math.round(qrSize)}
              level="M"
            />
          </div>
        )}

        <div
          className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 ${isLandscape ? "items-start" : "items-center"}`}
        >
          {hasBarcode && (
            <div className="flex shrink-0 justify-center">
              <Barcode
                value={item.code}
                height={Math.round(barcodeHeight)}
                width={barcodeWidth}
                displayValue={false}
                margin={0}
              />
            </div>
          )}

          {hasText && (
            <div
              className={`flex flex-col gap-px ${isLandscape ? "items-start" : "items-center"}`}
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.2 }}
            >
              {content.showItemCode && (
                <span className="font-mono font-semibold">{item.code}</span>
              )}
              {content.showTypeName && (
                <span className="text-gray-700">{item.typeName}</span>
              )}
              {content.showVariantName && item.variantName && (
                <span className="text-gray-500">{item.variantName}</span>
              )}
              {content.customText && (
                <span className="text-gray-600">{content.customText}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
