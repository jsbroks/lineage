"use client";

import { Check, CreditCard, FileText, Receipt } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/react";

const PLANS = {
  free: {
    name: "Free",
    price: "$0",
    period: "/mo",
    description: "For hobby growers getting started with traceability.",
    limits: { lots: 500, members: 1 },
    features: [
      "1 user",
      "Up to 500 lots",
      "All core features (scan, track, lineage)",
      "Community support",
    ],
  },
  pro: {
    name: "Pro",
    price: "$39",
    period: "/mo",
    description:
      "For growing operations that need more power and flexibility.",
    limits: { lots: Infinity, members: Infinity },
    features: [
      "Unlimited users",
      "Unlimited lots",
      "AI-powered insights",
      "Shopify integration",
      "QuickBooks & Xero sync",
      "Label printer support (DYMO, Rollo, Brother)",
      "Webhook & Zapier automation",
      "Priority support",
    ],
  },
  business: {
    name: "Business",
    price: "$79",
    period: "/mo",
    description:
      "For commercial farms with compliance and integration needs.",
    limits: { lots: Infinity, members: Infinity },
    features: [
      "Everything in Pro",
      "Compliance-ready export reports (FDA, FSMA)",
      "Audit log exports",
      "Custom integrations",
      "Dedicated support",
    ],
  },
} as const;

type PlanKey = keyof typeof PLANS;

const CURRENT_PLAN: PlanKey = "free";

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const capped = Math.min(used, limit);
  const pct = limit === Infinity ? 0 : (capped / limit) * 100;
  const isNearLimit = limit !== Infinity && pct >= 80;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {used.toLocaleString()} /{" "}
          {limit === Infinity ? "Unlimited" : limit.toLocaleString()}
        </span>
        {limit !== Infinity && (
          <span
            className={
              isNearLimit ? "text-destructive font-medium" : "text-muted-foreground"
            }
          >
            {Math.round(pct)}%
          </span>
        )}
      </div>
      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all ${
            isNearLimit ? "bg-destructive" : "bg-foreground"
          }`}
          style={{ width: `${limit === Infinity ? 0 : pct}%` }}
        />
      </div>
    </div>
  );
}

export default function BillingSettingsPage() {
  const plan = PLANS[CURRENT_PLAN];

  const { data: members = [] } = api.team.listMembers.useQuery();
  const { data: lots = [] } = api.lot.list.useQuery();

  const memberCount = members.length;
  const lotCount = lots.length;

  return (
    <div className="container mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your plan, usage, and payment details.
        </p>
      </div>

      <div className="space-y-6">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle>Current Plan</CardTitle>
                  <Badge variant="secondary">{plan.name}</Badge>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </div>
              <div className="text-right">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {plan.period}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <div className="grid gap-2 sm:grid-cols-2">
              {plan.features.map((feature) => (
                <div
                  key={feature}
                  className="flex items-start gap-2 text-sm"
                >
                  <Check className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Button disabled>Change Plan</Button>
            </div>
          </CardContent>
        </Card>

        {/* Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>
              Current resource usage for this billing period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-medium">Lots</p>
                <UsageBar used={lotCount} limit={plan.limits.lots} />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Team Members</p>
                <UsageBar used={memberCount} limit={plan.limits.members} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>
                  Manage how you pay for your subscription.
                </CardDescription>
              </div>
              <Button variant="outline" disabled>
                <CreditCard className="mr-2 size-4" />
                Add Payment Method
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-6 text-center">
              <CreditCard className="size-8 opacity-40" />
              <p className="text-sm">
                No payment method on file. Add one to upgrade to a paid plan.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>
              Download past invoices and receipts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground h-24 text-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="size-8 opacity-40" />
                      <p className="text-sm">
                        No invoices yet. Invoices will appear here once you
                        upgrade to a paid plan.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
