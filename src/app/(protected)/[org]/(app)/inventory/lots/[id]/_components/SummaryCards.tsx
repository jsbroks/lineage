"use client";

import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export const QuantityCard: React.FC<{
  quantity: string | number;
  unit?: string | null;
}> = ({ quantity, unit }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-muted-foreground text-sm font-medium">
        Quantity
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold tabular-nums">
        {Number(quantity).toLocaleString()}
        {unit && (
          <span className="text-muted-foreground ml-1.5 text-base font-medium">
            {unit}
          </span>
        )}
      </div>
    </CardContent>
  </Card>
);

export const CostCard: React.FC<{
  unitCost: number;
  quantity: string | number;
  currency?: string | null;
}> = ({ unitCost, quantity, currency }) => {
  const totalCents = unitCost * Number(quantity);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          Cost
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">
          {totalCents
            ? `$${(totalCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            : "—"}
        </div>
        {currency && (
          <p className="text-muted-foreground text-xs">{currency}</p>
        )}
      </CardContent>
    </Card>
  );
};

export const LocationCard: React.FC<{ name: string }> = ({ name }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-muted-foreground text-sm font-medium">
        Location
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-lg font-semibold">{name}</div>
    </CardContent>
  </Card>
);
