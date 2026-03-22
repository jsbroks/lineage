import { type Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "~/components/ui/button";
import { Scan } from "lucide-react";
import { DashboardPage } from "./_components/dashboard-page";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function Home({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  const now = new Date();
  const today = format(now, "EEEE, MMMM d");
  const hour = now.getHours();
  const timeGreeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="container mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <header>
          <h1 className="text-foreground mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Cedar Grove Mycology
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            {today} &mdash; {timeGreeting}
          </p>
        </header>
        <div>
          <Button variant="outline" asChild>
            <Link href={`/${org}/scan`}>
              <Scan /> Scan
            </Link>
          </Button>
        </div>
      </div>

      <DashboardPage org={org} />
    </div>
  );
}
