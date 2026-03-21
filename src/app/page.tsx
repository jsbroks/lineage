import { type Metadata } from "next";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { MarketingNav } from "./_components/MarketingNav";

export const metadata: Metadata = {
  title: "Lineage — Traceability-first inventory tracking",
  description:
    "Track what you make, from source to shelf. Scan-based workflows, full lineage traceability, and real-time inventory for physical operations.",
  openGraph: {
    title: "Lineage — Traceability-first inventory tracking",
    description:
      "Track what you make, from source to shelf. Scan-based workflows, full lineage traceability, and real-time inventory for physical operations.",
  },
};

function LineageGraph() {
  const nodeW = 88;
  const nodeH = 30;
  const nodeR = 10;

  function Node({
    cx,
    cy,
    label,
    color,
  }: {
    cx: number;
    cy: number;
    label: string;
    color: string;
  }) {
    return (
      <>
        <rect
          x={cx - nodeW / 2}
          y={cy - nodeH / 2}
          width={nodeW}
          height={nodeH}
          rx={nodeR}
          fill={color}
          fillOpacity="0.15"
          stroke={color}
          strokeWidth="1.5"
        />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          className="fill-foreground text-[11px] font-medium"
        >
          {label}
        </text>
      </>
    );
  }

  function Edge({
    x1,
    y1,
    x2,
    y2,
    color,
  }: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
  }) {
    return (
      <line
        x1={x1}
        y1={y1 + nodeH / 2}
        x2={x2}
        y2={y2 - nodeH / 2}
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
    );
  }

  const r1y = 30;
  const r2y = 130;
  const r3y = 230;

  const n1 = { x: 120, y: r1y };
  const n2 = { x: 300, y: r1y };
  const n3 = { x: 60, y: r2y };
  const n4 = { x: 210, y: r2y };
  const n5 = { x: 360, y: r2y };
  const n6 = { x: 210, y: r3y };

  return (
    <svg
      viewBox="0 0 420 270"
      fill="none"
      className="w-full"
      aria-label="Lineage graph showing parent-child relationships between items"
    >
      {/* Edges: top → middle */}
      <Edge x1={n1.x} y1={n1.y} x2={n3.x} y2={n3.y} color="#7dd3fc" />
      <Edge x1={n1.x} y1={n1.y} x2={n4.x} y2={n4.y} color="#7dd3fc" />
      <Edge x1={n2.x} y1={n2.y} x2={n4.x} y2={n4.y} color="#7dd3fc" />
      <Edge x1={n2.x} y1={n2.y} x2={n5.x} y2={n5.y} color="#7dd3fc" />

      {/* Edges: middle → bottom */}
      <Edge x1={n3.x} y1={n3.y} x2={n6.x} y2={n6.y} color="#86efac" />
      <Edge x1={n4.x} y1={n4.y} x2={n6.x} y2={n6.y} color="#86efac" />
      <Edge x1={n5.x} y1={n5.y} x2={n6.x} y2={n6.y} color="#86efac" />

      {/* Top row */}
      <Node cx={n1.x} cy={n1.y} label="ITM-012" color="#7dd3fc" />
      <Node cx={n2.x} cy={n2.y} label="ITM-019" color="#7dd3fc" />

      {/* Middle row */}
      <Node cx={n3.x} cy={n3.y} label="ITM-041" color="#86efac" />
      <Node cx={n4.x} cy={n4.y} label="ITM-042" color="#c4b5fd" />
      <Node cx={n5.x} cy={n5.y} label="ITM-043" color="#86efac" />

      {/* Bottom row */}
      <Node cx={n6.x} cy={n6.y} label="ITM-108" color="#fbbf24" />
    </svg>
  );
}

const STEPS = [
  {
    number: "01",
    title: "Define your items",
    description:
      "Create custom item types with their own statuses, variants, and attributes. Model your exact process.",
  },
  {
    number: "02",
    title: "Scan and track",
    description:
      "Print QR labels and scan from your phone to update status, log operations, or look up any item.",
  },
  {
    number: "03",
    title: "See the full picture",
    description:
      "Trace any product back to its source. View inventory in real time. Know what's working.",
  },
];

const FEATURES = [
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
        <rect x="7" y="7" width="10" height="10" rx="1" />
      </svg>
    ),
    title: "Scan-first tracking",
    description:
      "Print QR or barcode labels. Scan from your phone to update status, log tasks, or look up any item instantly.",
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="5" r="2" />
        <circle cx="6" cy="12" r="2" />
        <circle cx="18" cy="12" r="2" />
        <circle cx="12" cy="19" r="2" />
        <line x1="12" y1="7" x2="6" y2="10" />
        <line x1="12" y1="7" x2="18" y2="10" />
        <line x1="6" y1="14" x2="12" y2="17" />
        <line x1="18" y1="14" x2="12" y2="17" />
      </svg>
    ),
    title: "Full lineage",
    description:
      "Trace any finished product back to its raw materials, batches, and processing conditions.",
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20V10M18 20V4M6 20v-4" />
      </svg>
    ),
    title: "Real-time inventory",
    description:
      "See what you have, where it is, and what stage it's in. Aggregated dashboards and quick reports.",
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M12 12h.01M8 12h.01M16 12h.01" />
      </svg>
    ),
    title: "Batch operations",
    description:
      "Create 50 items at once. Move a full rack in one scan. Bulk update statuses or attributes.",
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    ),
    title: "Smart suggestions",
    description:
      "Scan an item and Lineage suggests the next operation based on its current status and type.",
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3v3m6.36-.64l-2.12 2.12M21 12h-3M18.36 18.36l-2.12-2.12M12 21v-3M7.76 18.36l2.12-2.12M3 12h3M5.64 5.64l2.12 2.12" />
      </svg>
    ),
    title: "Configurable workflows",
    description:
      "Custom item types, statuses, and operation steps. Your process, your rules — no code required.",
  },
];

const USE_CASES = [
  {
    title: "Mushroom cultivation",
    description:
      "Track blocks from inoculation to harvest. Trace contamination, compare strains, optimize yields.",
    examples: ["Substrate bags", "Fruiting blocks", "Harvest batches"],
    href: "/mushroom-cultivation",
  },
  {
    title: "Craft food production",
    description:
      "Lot traceability for small-batch food. Know exactly what went into every product.",
    examples: ["Hot sauce batches", "Fermentation jars", "Packaged goods"],
    href: null,
  },
  {
    title: "Lab & R&D",
    description:
      "Track samples, experiments, and results. Full lineage from parent sample to derivative.",
    examples: ["Tissue cultures", "Seed banks", "Test batches"],
    href: null,
  },
  {
    title: "Small-batch manufacturing",
    description:
      "Inventory and workflow tracking for makers. From raw materials to finished products.",
    examples: ["Cosmetics", "Candles & soap", "Craft beverages"],
    href: null,
  },
];

export default async function Home() {
  return (
    <div className="bg-background min-h-screen">
      <MarketingNav />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl leading-tight font-bold tracking-tight sm:text-5xl sm:leading-tight">
              Track what you make,
              <br />
              from source to&nbsp;shelf
            </h1>
            <p className="text-muted-foreground mt-5 max-w-md text-base leading-relaxed">
              Scan-based workflows, full lineage traceability, and real-time
              inventory for teams that grow, make, and produce physical goods.
            </p>
            <div className="mt-8 flex gap-3">
              <Button asChild size="lg">
                <Link href="/signup">Get Started Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#how-it-works">See How It Works</Link>
              </Button>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="border-border bg-card rounded-xl border p-6">
              <LineageGraph />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Up and running in minutes
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-lg">
            Define your process, print labels, and start scanning. No
            complicated setup.
          </p>
        </div>
        <div className="mt-14 grid gap-10 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number} className="text-center">
              <div className="text-muted-foreground/40 text-4xl font-bold tabular-nums">
                {step.number}
              </div>
              <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-border/50 bg-muted/40 border-y">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Everything you need to track your operation
            </h2>
            <p className="text-muted-foreground mx-auto mt-3 max-w-lg">
              Built for the floor, not the back office. Every feature works from
              your phone.
            </p>
          </div>
          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="bg-foreground/5 text-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="mx-auto max-w-5xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Built for teams that make things
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-lg">
            If your operation transforms raw materials into products and needs
            traceability, Lineage fits.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {USE_CASES.map((uc) => {
            const inner = (
              <>
                <h3 className="font-semibold">{uc.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {uc.description}
                </p>
                <ul className="mt-4 space-y-1">
                  {uc.examples.map((ex) => (
                    <li
                      key={ex}
                      className="text-muted-foreground text-xs before:mr-1.5 before:content-['·']"
                    >
                      {ex}
                    </li>
                  ))}
                </ul>
              </>
            );

            if (uc.href) {
              return (
                <Link
                  key={uc.title}
                  href={uc.href}
                  className="border-border bg-card hover:bg-muted/50 flex flex-col rounded-xl border p-6 transition-colors"
                >
                  {inner}
                  <span className="text-foreground mt-4 text-xs font-medium">
                    Learn more &rarr;
                  </span>
                </Link>
              );
            }

            return (
              <div
                key={uc.title}
                className="border-border bg-card flex flex-col rounded-xl border p-6"
              >
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-border/50 bg-muted/40 border-y">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="border-border bg-background rounded-xl border px-8 py-10 text-center sm:px-16">
            <p className="text-foreground text-lg leading-relaxed font-medium italic">
              &ldquo;We traced a contamination issue back three generations to a
              single grain jar. That would have taken us weeks with
              spreadsheets.&rdquo;
            </p>
            <p className="text-muted-foreground mt-4 text-sm">
              — Small-scale cultivator, 2,000 blocks/month
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-border/50 bg-foreground text-background border-t">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to track smarter?
          </h2>
          <p className="text-background/60 mx-auto mt-3 max-w-md">
            Free to start. No credit card required. Set up your first item type
            in under 5 minutes.
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
            Traceability-first inventory for makers and growers.
          </span>
        </div>
      </footer>
    </div>
  );
}
