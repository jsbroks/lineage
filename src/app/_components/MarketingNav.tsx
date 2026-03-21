"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  QrCodeScanIcon,
  WorkflowSquare03Icon,
  Settings05Icon,
  Layers01Icon,
  SparklesIcon,
  ChartBarIncreasingIcon,
  MushroomIcon,
  OrganicFoodIcon,
  EcoLabIcon,
  CannabisIcon,
  BarrelIcon,
  Factory02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "~/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "~/components/ui/navigation-menu";

type NavItem = {
  icon: typeof QrCodeScanIcon;
  title: string;
  description: string;
  href: string;
};

const FEATURES: NavItem[] = [
  {
    icon: QrCodeScanIcon,
    title: "Scan-first Tracking",
    description: "QR and barcode scanning from your phone.",
    href: "/#features",
  },
  {
    icon: WorkflowSquare03Icon,
    title: "Full Lineage",
    description: "Trace any item back to its source materials.",
    href: "/#features",
  },
  {
    icon: Settings05Icon,
    title: "Configurable Workflows",
    description: "Custom types, statuses, and operation steps.",
    href: "/#features",
  },
  {
    icon: Layers01Icon,
    title: "Batch Operations",
    description: "Create and update items in bulk.",
    href: "/#features",
  },
  {
    icon: SparklesIcon,
    title: "Smart Suggestions",
    description: "Auto-suggest the next operation from a scan.",
    href: "/#features",
  },
  {
    icon: ChartBarIncreasingIcon,
    title: "Real-time Inventory",
    description: "Dashboards, quick reports, and aggregations.",
    href: "/#features",
  },
];

const WHO_ITS_FOR: NavItem[] = [
  {
    icon: MushroomIcon,
    title: "Mushroom Cultivators",
    description: "Track blocks from inoculation to harvest.",
    href: "/mushroom-cultivation",
  },
  {
    icon: OrganicFoodIcon,
    title: "Craft Food Producers",
    description: "Lot traceability for small-batch food and beverage.",
    href: "/mushroom-cultivation",
  },
  {
    icon: EcoLabIcon,
    title: "Labs & R&D Teams",
    description: "Sample lineage, experiments, and test batches.",
    href: "/mushroom-cultivation",
  },
  {
    icon: CannabisIcon,
    title: "Cannabis & Hemp Growers",
    description: "Seed-to-sale tracking and compliance.",
    href: "/mushroom-cultivation",
  },
  {
    icon: BarrelIcon,
    title: "Craft Beverage Makers",
    description: "Batch tracking for breweries, distilleries, and wineries.",
    href: "/mushroom-cultivation",
  },
  {
    icon: Factory02Icon,
    title: "Small-batch Manufacturers",
    description: "From raw materials to finished goods for makers.",
    href: "/mushroom-cultivation",
  },
];

const triggerStyles =
  "text-muted-foreground hover:text-foreground h-auto bg-transparent px-2 py-1.5 text-sm font-normal hover:bg-transparent focus:bg-transparent data-open:bg-transparent data-popup-open:bg-transparent";

const dropdownContentStyles = "right-0 left-auto md:w-[460px]";

const dropdownListStyles = "grid w-[460px] grid-cols-2 gap-0.5 p-1.5";

function DropdownItem({
  icon,
  title,
  description,
  href,
}: {
  icon: typeof QrCodeScanIcon;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          href={href}
          className="hover:bg-accent flex items-start gap-3 rounded-md px-3 py-2.5 no-underline transition-colors select-none"
        >
          <div className="text-muted-foreground mt-0.5 shrink-0">
            <HugeiconsIcon icon={icon} size={16} strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-foreground text-[13px] font-medium">
              {title}
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
              {description}
            </p>
          </div>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}

export function MarketingNav() {
  return (
    <nav className="border-border/50 border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            className="text-foreground"
          >
            <circle cx="12" cy="4" r="2.5" fill="currentColor" />
            <circle cx="5" cy="14" r="2.5" fill="currentColor" />
            <circle cx="19" cy="14" r="2.5" fill="currentColor" />
            <circle cx="12" cy="22" r="2.5" fill="currentColor" opacity="0.4" />
            <line
              x1="12"
              y1="6.5"
              x2="5"
              y2="11.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <line
              x1="12"
              y1="6.5"
              x2="19"
              y2="11.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <line
              x1="5"
              y1="16.5"
              x2="12"
              y2="19.5"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.4"
            />
            <line
              x1="19"
              y1="16.5"
              x2="12"
              y2="19.5"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.4"
            />
          </svg>
          <span className="font-display text-xl font-bold tracking-normal">
            Lineage
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <NavigationMenu viewport={false} className="hidden sm:flex">
            <NavigationMenuList className="gap-1">
              <NavigationMenuItem className="relative">
                <NavigationMenuTrigger className={triggerStyles}>
                  Features
                </NavigationMenuTrigger>
                <NavigationMenuContent className={dropdownContentStyles}>
                  <ul className={dropdownListStyles}>
                    {FEATURES.map((f) => (
                      <DropdownItem key={f.title} {...f} />
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem className="relative">
                <NavigationMenuTrigger className={triggerStyles}>
                  Who It&apos;s For
                </NavigationMenuTrigger>
                <NavigationMenuContent className={dropdownContentStyles}>
                  <ul className={dropdownListStyles}>
                    {WHO_ITS_FOR.map((w) => (
                      <DropdownItem key={w.title} {...w} />
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link
                  href="/pricing"
                  className="text-muted-foreground hover:text-foreground px-2 py-1.5 text-sm transition-colors"
                >
                  Pricing
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          <Button asChild size="sm">
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
