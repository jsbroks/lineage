"use client";

import React from "react";
import QRCode from "react-qr-code";
import Barcode from "react-barcode";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

import { type ItemData } from "./types";

export const LabelsCard: React.FC<{
  itemId: string;
  code: string;
  typeName?: string | null;
  identifiers: ItemData["identifiers"];
}> = ({ itemId, code, typeName, identifiers }) => {
  const nonQrIdentifiers = identifiers.filter(
    (i) => i.identifierType.toLowerCase() !== "qr code",
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Labels &amp; Codes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <p className="mb-2 text-xs font-medium">QR Code</p>
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-white p-2">
              <QRCode
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/l/${itemId}`}
                size={100}
              />
            </div>
            <div className="flex flex-col break-all">
              <span className="font-mono font-medium">{code}</span>
              {typeName && (
                <span className="text-muted-foreground text-sm">
                  {typeName}
                </span>
              )}
              <span className="text-muted-foreground mt-2 text-[0.5rem]">
                {itemId}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <p className="mb-2 text-xs font-medium">Barcode</p>
          <Barcode
            value={code}
            height={50}
            width={2}
            text={code}
            fontSize={12}
          />
        </div>

        {nonQrIdentifiers.length > 0 && (
          <div className="space-y-2">
            {nonQrIdentifiers.map((identifier) => (
              <div
                key={identifier.id}
                className="rounded-md border p-2 text-sm"
              >
                <p className="font-medium">
                  {identifier.identifierType}: {identifier.identifierValue}
                </p>
                <p className="text-muted-foreground text-xs">
                  Active: {identifier.isActive ? "yes" : "no"}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
