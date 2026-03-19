"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "react-qr-code";
import { Badge } from "~/components/ui/badge";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "~/trpc/react";
import Barcode from "react-barcode";

function formatTimeAgo(timestamp: Date | string) {
  const nowMs = Date.now();
  const eventMs = new Date(timestamp).getTime();
  const diffMs = Math.max(0, nowMs - eventMs);

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ago`;
  }

  if (totalHours > 0) {
    return `${totalHours}h ${minutes}m ago`;
  }

  if (totalMinutes > 0) {
    return `${totalMinutes}m ago`;
  }

  return "just now";
}

export default function ItemDetailPage() {
  const params = useParams<{ itemId: string; org: string }>();
  const itemId = params.itemId;
  const org = params.org;

  const { data, isLoading, error } = api.item.getById.useQuery(
    { itemId },
    { enabled: !!itemId },
  );

  if (isLoading) {
    return (
      <div className="text-muted-foreground p-6 text-sm">
        Loading item details...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-destructive p-6 text-sm">
        Unable to load item details.
      </div>
    );
  }

  const qrIdentifier = data.identifiers.find((identifier) => {
    const type = identifier.identifierType.toLowerCase();
    return type === "qr" || type === "qr code";
  });

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <Badge variant="outline">{data.itemType?.name}</Badge>
          <h1 className="text-2xl font-semibold tracking-tight">
            {data.item.code}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Status: {data.item.statusId}
          </p>
        </div>
        <Link
          href={`/${org}/items/new`}
          className="text-sm underline underline-offset-4"
        >
          Back to items
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Category:</span>{" "}
              {data.itemType?.name ?? data.item.itemTypeId}
            </p>
            <p>
              <span className="font-medium">Created:</span>{" "}
              {new Date(data.item.createdAt).toLocaleString()}
            </p>
            <p>
              <span className="font-medium">Updated:</span>{" "}
              {new Date(data.item.updatedAt).toLocaleString()}
            </p>
            <div>
              <p className="mb-1 font-medium">Attributes</p>
              <pre className="bg-muted overflow-auto rounded-md p-2 text-xs">
                {JSON.stringify(data.item.attributes ?? {}, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Labels &amp; Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 rounded-md">
              <p className="mb-2 text-xs font-medium">QR Code</p>
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-white p-2">
                  <QRCode
                    value={`${window.location.origin}/l/${data.item.id}`}
                    size={100}
                  />
                </div>
                <div className="flex h-full flex-col break-all">
                  <div className="font-mono font-medium">
                    <div>{data.item.code}</div>
                  </div>
                  <span className="text-muted-foreground mb-6">
                    {data.itemType?.name}
                  </span>
                  <span className="text-muted-foreground text-[0.5rem]">
                    {data.item.id}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <p className="mb-2 text-xs font-medium">Barcode</p>

              <div>
                <Barcode
                  value={data.item.code}
                  height={50}
                  width={2}
                  text={data.item.code}
                  fontSize={12}
                />
              </div>
            </div>

            {data.identifiers.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No identifiers linked.
              </p>
            ) : (
              <div className="space-y-2">
                {data.identifiers
                  .filter((i) => i.identifierType.toLowerCase() !== "qr code")
                  .map((identifier) => (
                    <div
                      key={identifier.id}
                      className="border-border rounded-md border p-2 text-sm"
                    >
                      <p className="font-medium">
                        {identifier.identifierType}:{" "}
                        {identifier.identifierValue}
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

        <Card>
          <CardHeader>
            <CardTitle>Came From</CardTitle>
          </CardHeader>
          <CardContent>
            {data.parentLineage.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No source items recorded.
              </p>
            ) : (
              <div className="space-y-2">
                {data.parentLineage.map(({ link, item: parentItem }) => (
                  <div
                    key={link.id}
                    className="border-border rounded-md border p-2 text-sm"
                  >
                    <p className="font-medium">
                      {parentItem?.code ?? link.parentItemId}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Relation: {link.relationship}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Used to Make</CardTitle>
          </CardHeader>
          <CardContent>
            {data.childLineage.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Not yet used in another step.
              </p>
            ) : (
              <div className="space-y-2">
                {data.childLineage.map(({ link, item: childItem }) => (
                  <div
                    key={link.id}
                    className="border-border rounded-md border p-2 text-sm"
                  >
                    <p className="font-medium">
                      {childItem?.code ?? link.childItemId}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Relation: {link.relationship}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            {data.events.length === 0 ? (
              <p className="text-muted-foreground text-sm">No activity recorded yet.</p>
            ) : (
              <div className="relative pl-6">
                <div className="bg-border absolute top-0 bottom-0 left-3 w-px" />
                {data.events.map((event) => (
                  <div key={event.id} className="relative pb-4 last:pb-0">
                    <div className="bg-background border-border absolute top-1/2 -left-4.5 h-3 w-3 -translate-y-1/2 rounded-full border" />
                    <p className="text-sm leading-6">
                      <span className="text-muted-foreground text-xs">
                        {formatTimeAgo(event.recordedAt)}
                      </span>{" "}
                      - {event.message?.trim() || event.eventType}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
