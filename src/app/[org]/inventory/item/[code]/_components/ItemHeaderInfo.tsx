"use client";

import React from "react";
import { Circle } from "lucide-react";

import { Badge } from "~/components/ui/badge";

export const ItemHeaderInfo: React.FC<{
  code: string;
  status: string;
  typeName?: string | null;
  variantName?: string | null;
}> = ({ code, status, typeName, variantName }) => (
  <div>
    <div className="mb-1 flex flex-wrap items-center gap-2">
      {typeName && <Badge variant="outline">{typeName}</Badge>}
      {variantName && <Badge variant="secondary">{variantName}</Badge>}
    </div>
    <h1 className="text-2xl font-semibold tracking-tight">{code}</h1>
    <div className="text-muted-foreground mt-1 flex items-center gap-3 text-sm">
      <span className="flex items-center gap-1.5">
        <Circle className="size-2" fill="currentColor" stroke="currentColor" />
        {status}
      </span>
    </div>
  </div>
);
