"use client";

import React from "react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

import { type ItemData } from "./types";

export const LineageCard: React.FC<{
  title: string;
  emptyMessage: string;
  org: string;
  entries: ItemData["parentLineage"];
  direction: "parent" | "child";
}> = ({ title, emptyMessage, org, entries, direction }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {entries.map(({ link, item: lineageItem }) => {
            const linkedId =
              direction === "parent" ? link.parentItemId : link.childItemId;
            const code = lineageItem?.code ?? linkedId;
            return (
              <Link
                key={link.id}
                href={`/${org}/inventory/items/${linkedId}`}
                className="hover:bg-muted block rounded-md border p-2 text-sm transition-colors"
              >
                <p className="font-mono font-medium">{code}</p>
                <p className="text-muted-foreground text-xs">
                  Relation: {link.relationship}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
);
