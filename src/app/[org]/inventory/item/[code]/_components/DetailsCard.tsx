"use client";

import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export const DetailsCard: React.FC<{
  typeName: string;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}> = ({ typeName, notes, createdAt, updatedAt }) => (
  <Card>
    <CardHeader>
      <CardTitle>Details</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2 text-sm">
      <p>
        <span className="font-medium">Type:</span> {typeName}
      </p>
      {notes && (
        <p>
          <span className="font-medium">Notes:</span> {notes}
        </p>
      )}
      <p>
        <span className="font-medium">Created:</span>{" "}
        {new Date(createdAt).toLocaleString()}
      </p>
      <p>
        <span className="font-medium">Updated:</span>{" "}
        {new Date(updatedAt).toLocaleString()}
      </p>
    </CardContent>
  </Card>
);
