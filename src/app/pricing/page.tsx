import { type Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { MarketingNav } from "../_components/MarketingNav";

export const metadata: Metadata = {
  title: "Pricing | Lineage",
  description:
    "Simple, transparent pricing for growers of every size. Start free and scale when you're ready.",
  openGraph: {
    title: "Pricing | Lineage",
    description:
      "Simple, transparent pricing for growers of every size. Start free and scale when you're ready.",
  },
};

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    description: "For hobby growers getting started with traceability.",
    cta: "Get Started Free",
    ctaHref: "/signup",
    ctaVariant: "outline" as const,
    highlighted: false,
    features: [
      "1 user",
      "Up to 500 lots",
      "All core features (scan, track, lineage)",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: "$39",
    period: "/mo",
    description: "For growing operations that need more power and flexibility.",
    cta: "Start Free Trial",
    ctaHref: "/signup",
    ctaVariant: "default" as const,
    highlighted: true,
    badge: "Most popular",
    features: [
      "Unlimited users",
      "Unlimited lots",
      "AI-powered insights",
      "Label printer support (DYMO, Rollo, Brother)",
      "Priority support",
    ],
  },
  {
    name: "Business",
    price: "$79",
    period: "/mo",
    description: "For commercial farms with compliance and integration needs.",
    cta: "Contact Us",
    ctaHref: "mailto:hello@lineage.farm",
    ctaVariant: "outline" as const,
    highlighted: false,
    features: [
      "Everything in Pro",
      "Compliance-ready export reports (FDA, FSMA)",
      "Audit log exports",
      "Dedicated support",
    ],
  },
];

const FAQS = [
  {
    question: "Can I switch plans later?",
    answer:
      "Yes — upgrade, downgrade, or cancel at any time. Changes take effect at the start of your next billing cycle.",
  },
  {
    question: "What happens when I hit 500 lots on Free?",
    answer:
      "You can still view and manage existing lots, but you won't be able to create new ones until you upgrade or archive some lots.",
  },
  {
    question: "Is there a free trial for Pro?",
    answer:
      "Yes. Pro comes with a 14-day free trial — no credit card required. You'll get full access to all Pro features.",
  },
  {
    question: "What counts as a 'lot'?",
    answer:
      "A lot is anything you track in Lineage — a substrate bag, grain jar, fruiting block, harvest batch, or package. Each gets its own QR code and lineage history.",
  },
];

export default function PricingPage() {
  return (
    <div className="bg-background min-h-screen">
      <MarketingNav />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="text-muted-foreground mx-auto mt-5 max-w-lg text-base leading-relaxed">
          Start free and scale when you&apos;re ready. No hidden fees, no
          per-scan charges, no surprises.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-8 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`border-border relative flex flex-col rounded-xl border p-8 ${
                tier.highlighted
                  ? "bg-card ring-foreground/10 ring-2"
                  : "bg-card"
              }`}
            >
              {tier.badge && (
                <Badge className="absolute -top-3 left-8">{tier.badge}</Badge>
              )}
              <div>
                <h3 className="text-lg font-semibold">{tier.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">
                    {tier.price}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {tier.period}
                  </span>
                </div>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                  {tier.description}
                </p>
              </div>
              <ul className="mt-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check className="text-foreground mt-0.5 h-4 w-4 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button
                  asChild
                  variant={tier.ctaVariant}
                  size="lg"
                  className="w-full"
                >
                  <Link href={tier.ctaHref}>{tier.cta}</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-border/50 bg-muted/40 border-y">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Frequently asked questions
            </h2>
            <p className="text-muted-foreground mx-auto mt-3 max-w-lg">
              Everything you need to know about our plans.
            </p>
          </div>
          <div className="mx-auto mt-14 grid max-w-3xl gap-10 sm:grid-cols-2">
            {FAQS.map((faq) => (
              <div key={faq.question}>
                <h3 className="font-semibold">{faq.question}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-border/50 bg-foreground text-background border-t">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to grow smarter?
          </h2>
          <p className="text-background/60 mx-auto mt-3 max-w-md">
            Free to start. No credit card required. Scan your first block in
            under 10 minutes.
          </p>
          <div className="mt-8">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-background/20 bg-background text-foreground hover:bg-background/90"
            >
              <Link href="/signup">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-border/50 border-t">
        <div className="text-muted-foreground mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-sm">
          <span className="font-display text-base italic">Lineage</span>
          <span className="hidden sm:block">
            Traceability-first inventory for growers.
          </span>
        </div>
      </footer>
    </div>
  );
}
