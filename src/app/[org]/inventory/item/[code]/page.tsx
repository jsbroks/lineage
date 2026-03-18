"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "react-qr-code";
import Barcode from "react-barcode";
import { Check, Circle, Pencil } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { api } from "~/trpc/react";
import { Icon } from "~/app/_components/IconPicker";

function formatTimeAgo(timestamp: Date | string) {
  const diffMs = Math.max(0, Date.now() - new Date(timestamp).getTime());
  const totalMinutes = Math.floor(diffMs / 60_000);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h ago`;
  if (totalHours > 0) return `${totalHours}h ${minutes}m ago`;
  if (totalMinutes > 0) return `${totalMinutes}m ago`;
  return "just now";
}

export default function ItemDetailPage() {
  const params = useParams<{ org: string; code: string }>();
  const code = decodeURIComponent(params.code);

  const { data: lookup, isLoading: lookupLoading } =
    api.item.getByCode.useQuery({ code }, { enabled: !!code });

  const { data, isLoading: detailLoading } = api.item.getById.useQuery(
    { itemId: lookup?.item.id ?? "" },
    { enabled: !!lookup?.item.id },
  );

  const { data: typeData } = api.itemType.getById.useQuery(
    { id: data?.item.itemTypeId ?? "" },
    { enabled: !!data?.item.itemTypeId },
  );

  const attrDefs = typeData?.attributeDefinitions ?? [];
  const currentAttrs = (data?.item.attributes as Record<string, unknown>) ?? {};

  const [editingAttrs, setEditingAttrs] = useState(false);
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data) return;
    const attrs = (data.item.attributes as Record<string, unknown>) ?? {};
    const vals: Record<string, string> = {};
    for (const d of attrDefs) {
      vals[d.attrKey] = String(attrs[d.attrKey] ?? "");
    }
    setAttrValues(vals);
  }, [data, attrDefs]);

  const utils = api.useUtils();
  const updateAttributes = api.item.updateAttributes.useMutation({
    onSuccess: () => {
      void utils.item.getById.invalidate({ itemId: data?.item.id ?? "" });
      setEditingAttrs(false);
    },
  });

  const handleSaveAttributes = () => {
    if (!data) return;
    const merged: Record<string, unknown> = { ...currentAttrs };
    for (const d of attrDefs) {
      const raw = attrValues[d.attrKey] ?? "";
      if (!raw && !d.isRequired) {
        delete merged[d.attrKey];
        continue;
      }
      switch (d.dataType) {
        case "number":
          merged[d.attrKey] = raw ? Number(raw) : null;
          break;
        case "boolean":
          merged[d.attrKey] = raw === "true";
          break;
        default:
          merged[d.attrKey] = raw;
      }
    }
    updateAttributes.mutate({ itemId: data.item.id, attributes: merged });
  };

  const isLoading = lookupLoading || detailLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-full flex-col">
        <header className="flex items-center gap-2 border-b px-4 py-2">
          <SidebarTrigger />
          <div className="bg-muted h-5 w-32 animate-pulse rounded" />
        </header>
        <div className="text-muted-foreground px-6 py-12 text-center text-sm">
          Loading item...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-full flex-col">
        <header className="flex items-center gap-2 border-b px-4 py-2">
          <SidebarTrigger />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/${params.org}/inventory`}>Inventory</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{code}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="text-destructive px-6 py-12 text-center text-sm">
          Item not found.
        </div>
      </div>
    );
  }

  const { item: currentItem, itemType: currentItemType } = data;

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center gap-2 border-b px-4 py-2">
        <SidebarTrigger />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/${params.org}/inventory`}>Inventory</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {currentItemType && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link
                      href={`/${params.org}/inventory/type/${currentItemType.id}`}
                      className="flex items-center gap-2"
                    >
                      <Icon icon={currentItemType.icon} className="size-3.5" />
                      {currentItemType.name}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-mono">
                {currentItem.code}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl space-y-6 px-6 py-6">
          {/* Header info */}
          <div>
            {currentItemType && (
              <Badge variant="outline" className="mb-1">
                {currentItemType.name}
              </Badge>
            )}
            <h1 className="text-2xl font-semibold tracking-tight">
              {currentItem.code}
            </h1>
            <div className="text-muted-foreground mt-1 flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5">
                <Circle
                  className="size-2"
                  fill="currentColor"
                  stroke="currentColor"
                />
                {currentItem.status}
              </span>
              <span>
                Qty: {currentItem.quantity} {currentItem.quantityUnit}
              </span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Type:</span>{" "}
                  {currentItemType?.name ?? currentItem.itemTypeId}
                </p>
                {currentItem.notes && (
                  <p>
                    <span className="font-medium">Notes:</span>{" "}
                    {currentItem.notes}
                  </p>
                )}
                <p>
                  <span className="font-medium">Created:</span>{" "}
                  {new Date(currentItem.createdAt).toLocaleString()}
                </p>
                <p>
                  <span className="font-medium">Updated:</span>{" "}
                  {new Date(currentItem.updatedAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            {/* Properties / Attributes */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Properties</CardTitle>
                {attrDefs.length > 0 && !editingAttrs && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingAttrs(true)}
                  >
                    <Pencil className="mr-1 size-3.5" /> Edit
                  </Button>
                )}
                {editingAttrs && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingAttrs(false);
                        const attrs = currentAttrs;
                        const vals: Record<string, string> = {};
                        for (const d of attrDefs) {
                          vals[d.attrKey] = String(attrs[d.attrKey] ?? "");
                        }
                        setAttrValues(vals);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveAttributes}
                      disabled={updateAttributes.isPending}
                    >
                      <Check className="mr-1 size-3.5" />
                      {updateAttributes.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {attrDefs.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No custom attributes defined for this item type.
                    {Object.keys(currentAttrs).length > 0 && (
                      <span className="mt-2 block">
                        <span className="font-medium">Raw data:</span>
                        <pre className="bg-muted mt-1 overflow-auto rounded-md p-2 text-xs">
                          {JSON.stringify(currentAttrs, null, 2)}
                        </pre>
                      </span>
                    )}
                  </p>
                ) : editingAttrs ? (
                  <div className="space-y-3">
                    {attrDefs.map((d) => (
                      <div key={d.id} className="space-y-1">
                        <Label className="text-xs">
                          {d.attrKey}
                          {d.unit ? ` (${d.unit})` : ""}
                          {d.isRequired && (
                            <span className="text-destructive ml-0.5">*</span>
                          )}
                        </Label>
                        {d.dataType === "boolean" ? (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={attrValues[d.attrKey] === "true"}
                              onCheckedChange={(val) =>
                                setAttrValues((prev) => ({
                                  ...prev,
                                  [d.attrKey]: val ? "true" : "false",
                                }))
                              }
                            />
                            <span className="text-muted-foreground text-xs">
                              {attrValues[d.attrKey] === "true" ? "Yes" : "No"}
                            </span>
                          </div>
                        ) : d.dataType === "select" &&
                          Array.isArray(d.options) ? (
                          <Select
                            value={attrValues[d.attrKey] ?? ""}
                            onValueChange={(val) =>
                              setAttrValues((prev) => ({
                                ...prev,
                                [d.attrKey]: val,
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {(d.options as string[]).map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={
                              d.dataType === "number"
                                ? "number"
                                : d.dataType === "date"
                                  ? "date"
                                  : "text"
                            }
                            value={attrValues[d.attrKey] ?? ""}
                            onChange={(e) =>
                              setAttrValues((prev) => ({
                                ...prev,
                                [d.attrKey]: e.target.value,
                              }))
                            }
                            className="h-8 text-sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {attrDefs.map((d) => {
                      const val = currentAttrs[d.attrKey];
                      return (
                        <div key={d.id} className="flex items-baseline gap-2">
                          <span className="text-muted-foreground min-w-[80px] text-xs font-medium">
                            {d.attrKey}
                            {d.unit ? ` (${d.unit})` : ""}
                          </span>
                          <span className="text-sm">
                            {val === undefined || val === null || val === ""
                              ? "—"
                              : d.dataType === "boolean"
                                ? val
                                  ? "Yes"
                                  : "No"
                                : String(val)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Labels & Codes */}
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
                        value={`${typeof window !== "undefined" ? window.location.origin : ""}/l/${currentItem.id}`}
                        size={100}
                      />
                    </div>
                    <div className="flex flex-col break-all">
                      <span className="font-mono font-medium">
                        {currentItem.code}
                      </span>
                      {currentItemType && (
                        <span className="text-muted-foreground text-sm">
                          {currentItemType.name}
                        </span>
                      )}
                      <span className="text-muted-foreground mt-2 text-[0.5rem]">
                        {currentItem.id}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="mb-2 text-xs font-medium">Barcode</p>
                  <Barcode
                    value={currentItem.code}
                    height={50}
                    width={2}
                    text={currentItem.code}
                    fontSize={12}
                  />
                </div>

                {data.identifiers.filter(
                  (i) => i.identifierType.toLowerCase() !== "qr code",
                ).length > 0 && (
                  <div className="space-y-2">
                    {data.identifiers
                      .filter(
                        (i) => i.identifierType.toLowerCase() !== "qr code",
                      )
                      .map((identifier) => (
                        <div
                          key={identifier.id}
                          className="rounded-md border p-2 text-sm"
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

            {/* Came From (parents) */}
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
                      <Link
                        key={link.id}
                        href={`/${params.org}/inventory/item/${encodeURIComponent(parentItem?.code ?? link.parentItemId)}`}
                        className="hover:bg-muted block rounded-md border p-2 text-sm transition-colors"
                      >
                        <p className="font-mono font-medium">
                          {parentItem?.code ?? link.parentItemId}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Relation: {link.relationship}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Used to Make (children) */}
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
                      <Link
                        key={link.id}
                        href={`/${params.org}/inventory/item/${encodeURIComponent(childItem?.code ?? link.childItemId)}`}
                        className="hover:bg-muted block rounded-md border p-2 text-sm transition-colors"
                      >
                        <p className="font-mono font-medium">
                          {childItem?.code ?? link.childItemId}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Relation: {link.relationship}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Log */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                {data.events.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No activity recorded yet.
                  </p>
                ) : (
                  <div className="relative pl-6">
                    <div className="bg-border absolute top-0 bottom-0 left-3 w-px" />
                    {data.events.map((event) => (
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
          </div>
        </div>
      </div>
    </div>
  );
}
