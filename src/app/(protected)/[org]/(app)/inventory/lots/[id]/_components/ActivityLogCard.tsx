"use client";

import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

import { type LotData } from "./types";
import { formatTimeAgo } from "./utils";

export const ActivityLogCard: React.FC<{
  events: LotData["events"];
}> = ({ events }) => (
  <Card className="lg:col-span-2">
    <CardHeader>
      <CardTitle>Activity Log</CardTitle>
    </CardHeader>
    <CardContent>
      {events.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No activity recorded yet.
        </p>
      ) : (
        <div className="relative pl-6">
          <div className="bg-border absolute top-0 bottom-0 left-3 w-px" />
          {events.map((event) => (
            <div key={event.id} className="relative pb-4 last:pb-0">
              <div className="bg-background border-border absolute top-1/2 -left-4.5 size-3 -translate-y-1/2 rounded-full border" />
              <p className="text-sm leading-6">
                <span className="text-muted-foreground text-xs">
                  {formatTimeAgo(event.recordedAt)}
                </span>{" "}
                — {event.message?.trim() || event.eventType}
              </p>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);
