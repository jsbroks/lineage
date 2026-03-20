import { type Metadata } from "next";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { AiDemo } from "./_components/ai-demo";

export const metadata: Metadata = {
  title: "Mushroom Cultivation Tracking Software | Lineage",
  description:
    "Track every block from inoculation to harvest. Lineage gives mushroom growers full traceability, scan-based workflows, and real-time inventory.",
  openGraph: {
    title: "Mushroom Cultivation Tracking Software | Lineage",
    description:
      "Track every block from inoculation to harvest with full lineage traceability.",
  },
};

function PipelineDiagram() {
  const stages = [
    { label: "Substrate", count: 120, color: "#a3a3a3" },
    { label: "Inoculated", count: 84, color: "#7dd3fc" },
    { label: "Colonizing", count: 215, color: "#86efac" },
    { label: "Fruiting", count: 67, color: "#fbbf24" },
    { label: "Harvested", count: 340, color: "#f97316" },
    { label: "Packed", count: 280, color: "#c084fc" },
  ];
  const max = Math.max(...stages.map((s) => s.count));

  return (
    <div className="flex items-end gap-3 sm:gap-4">
      {stages.map((stage, i) => {
        const height = 40 + (stage.count / max) * 120;
        return (
          <div key={stage.label} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-xs font-semibold tabular-nums">{stage.count}</span>
            <div
              className="w-full rounded-md transition-all"
              style={{ height, backgroundColor: stage.color, opacity: 0.85 }}
            />
            <span className="text-[10px] leading-tight text-muted-foreground sm:text-xs">
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LineageTree() {
  return (
    <svg viewBox="0 0 320 200" fill="none" className="w-full" aria-label="Lineage tree diagram">
      {/* Grain Spawn */}
      <rect x="110" y="8" width="100" height="32" rx="8" fill="#7dd3fc" fillOpacity="0.2" stroke="#7dd3fc" strokeWidth="1.5" />
      <text x="160" y="29" textAnchor="middle" className="fill-foreground text-[11px] font-medium">Grain Spawn #12</text>

      {/* Lines down */}
      <line x1="130" y1="40" x2="60" y2="72" stroke="#7dd3fc" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="160" y1="40" x2="160" y2="72" stroke="#7dd3fc" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="190" y1="40" x2="260" y2="72" stroke="#7dd3fc" strokeWidth="1.5" strokeDasharray="4 3" />

      {/* Blocks */}
      <rect x="10" y="72" width="100" height="32" rx="8" fill="#86efac" fillOpacity="0.2" stroke="#86efac" strokeWidth="1.5" />
      <text x="60" y="93" textAnchor="middle" className="fill-foreground text-[11px] font-medium">Block #401</text>

      <rect x="110" y="72" width="100" height="32" rx="8" fill="#86efac" fillOpacity="0.2" stroke="#86efac" strokeWidth="1.5" />
      <text x="160" y="93" textAnchor="middle" className="fill-foreground text-[11px] font-medium">Block #402</text>

      <rect x="210" y="72" width="100" height="32" rx="8" fill="#86efac" fillOpacity="0.2" stroke="#86efac" strokeWidth="1.5" />
      <text x="260" y="93" textAnchor="middle" className="fill-foreground text-[11px] font-medium">Block #403</text>

      {/* Lines to harvests */}
      <line x1="60" y1="104" x2="60" y2="136" stroke="#86efac" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="160" y1="104" x2="160" y2="136" stroke="#86efac" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="260" y1="104" x2="260" y2="136" stroke="#86efac" strokeWidth="1.5" strokeDasharray="4 3" />

      {/* Harvests */}
      <rect x="10" y="136" width="100" height="32" rx="8" fill="#fbbf24" fillOpacity="0.2" stroke="#fbbf24" strokeWidth="1.5" />
      <text x="60" y="157" textAnchor="middle" className="fill-foreground text-[11px] font-medium">1.2 kg yield</text>

      <rect x="110" y="136" width="100" height="32" rx="8" fill="#fbbf24" fillOpacity="0.2" stroke="#fbbf24" strokeWidth="1.5" />
      <text x="160" y="157" textAnchor="middle" className="fill-foreground text-[11px] font-medium">0.9 kg yield</text>

      <rect x="210" y="136" width="100" height="32" rx="8" fill="#fbbf24" fillOpacity="0.2" stroke="#fbbf24" strokeWidth="1.5" />
      <text x="260" y="157" textAnchor="middle" className="fill-foreground text-[11px] font-medium">1.4 kg yield</text>

      {/* Converge to package */}
      <line x1="60" y1="168" x2="160" y2="185" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="160" y1="168" x2="160" y2="185" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="260" y1="168" x2="160" y2="185" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 3" />

      <circle cx="160" cy="192" r="6" fill="#c084fc" fillOpacity="0.3" stroke="#c084fc" strokeWidth="1.5" />
    </svg>
  );
}

function ScanMockup() {
  return (
    <div className="mx-auto w-48 overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
      <div className="flex items-center justify-center gap-1 bg-foreground/5 px-3 py-2">
        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
      </div>
      <div className="space-y-3 p-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/50">
            <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
          </svg>
        </div>
        <div className="text-center text-[10px] text-muted-foreground">Scan QR code</div>
        <div className="space-y-1.5 rounded-lg bg-muted/60 p-2.5">
          <div className="h-1.5 w-3/4 rounded bg-foreground/80" />
          <div className="h-1.5 w-1/2 rounded bg-muted-foreground/30" />
          <div className="mt-2 flex gap-1.5">
            <div className="h-4 flex-1 rounded bg-green-500/20 border border-green-500/30" />
            <div className="h-4 flex-1 rounded bg-muted-foreground/10 border border-border" />
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
        <rect x="7" y="7" width="10" height="10" rx="1" />
      </svg>
    ),
    title: "Scan-first tracking",
    description: "Print QR labels. Scan from your phone to update status, log tasks, or look up any block.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
    description: "Trace any product back to its grain spawn, substrate batch, and growing conditions.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20V10M18 20V4M6 20v-4" />
      </svg>
    ),
    title: "Yield analytics",
    description: "See which strains and substrates perform best. Real data, not guesswork.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M12 12h.01M8 12h.01M16 12h.01" />
      </svg>
    ),
    title: "Batch operations",
    description: "Inoculated 50 bags? Create them all at once. Move a full rack in one scan.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    ),
    title: "Smart suggestions",
    description: "Scan a block and Lineage suggests the next step based on its current status.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v3m6.36-.64l-2.12 2.12M21 12h-3M18.36 18.36l-2.12-2.12M12 21v-3M7.76 18.36l2.12-2.12M3 12h3M5.64 5.64l2.12 2.12" />
      </svg>
    ),
    title: "Fits your process",
    description: "Custom item types, statuses, and attributes. Oyster, lion's mane, shiitake — your rules.",
  },
];

export default function MushroomCultivationPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Lineage
          </Link>
          <div className="flex items-center gap-4">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Features
            </Link>
            <Link href="#pipeline" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Pipeline
            </Link>
            <Button asChild size="sm">
              <Link href="/">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
              For mushroom cultivators
            </p>
            <h1 className="text-4xl leading-tight font-bold tracking-tight sm:text-5xl sm:leading-tight">
              Grow smarter,<br />not harder
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              Track inventory, trace lineage, and optimize yields — all from a
              scan on your phone.
            </p>
            <div className="mt-8 flex gap-3">
              <Button asChild size="lg">
                <Link href="/">Start Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#pipeline">How It Works</Link>
              </Button>
            </div>
          </div>
          <div className="hidden lg:block">
            <ScanMockup />
          </div>
        </div>
      </section>

      {/* Pipeline visualization */}
      <section id="pipeline" className="mx-auto max-w-5xl px-6 py-24">
        <div className="grid gap-16 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Your pipeline, at a glance
            </h2>
            <p className="mt-3 text-muted-foreground">
              See how many blocks are in each stage right now. No more counting
              racks or checking spreadsheets.
            </p>
            <div className="mt-10 rounded-xl border border-border bg-card p-6">
              <PipelineDiagram />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Trace anything back to its&nbsp;source
            </h2>
            <p className="mt-3 text-muted-foreground">
              Every block remembers where it came from. Track contamination,
              compare genetics, prove provenance.
            </p>
            <div className="mt-10 rounded-xl border border-border bg-card p-6">
              <LineageTree />
            </div>
          </div>
        </div>
      </section>

      {/* AI Demo */}
      <section className="border-t border-border/50 bg-muted/40">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-medium tracking-wide text-muted-foreground uppercase">
                AI-powered insights
              </p>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Ask your data anything
              </h2>
              <p className="mt-3 max-w-md text-muted-foreground">
                Skip the reports. Just ask — Lineage queries your harvest,
                inventory, and lineage data and answers in plain&nbsp;English.
              </p>
            </div>
            <AiDemo />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y border-border/50 bg-muted/40">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Built for the grow room
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              Everything works from your phone, with gloves on, between flushes.
            </p>
          </div>
          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-foreground">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="rounded-xl border border-border bg-muted/30 px-8 py-10 text-center sm:px-16">
          <p className="text-lg font-medium italic leading-relaxed text-foreground">
            &ldquo;We traced a contamination issue back three generations to a single
            grain jar. That would have taken us weeks with spreadsheets.&rdquo;
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            — Small-scale cultivator, 2,000 blocks/month
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 bg-foreground text-background">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Start tracking your grow today
          </h2>
          <p className="mx-auto mt-3 max-w-md text-background/60">
            Free to start. Scan your first block in under 10 minutes.
          </p>
          <div className="mt-8">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-background/20 bg-background text-foreground hover:bg-background/90"
            >
              <Link href="/">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>Lineage</span>
          <span className="hidden sm:block">Traceability-first inventory for growers.</span>
        </div>
      </footer>
    </div>
  );
}
