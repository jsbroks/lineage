import { format } from "date-fns";
import { Button } from "~/components/ui/button";
import { Scan } from "lucide-react";
export default function Home() {
  const now = new Date();
  const today = format(now, "EEEE, MMMM d");
  const hour = now.getHours();
  const timeGreeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="container mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <header>
          <h1 className="text-foreground mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Cedar Grove Mycology
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            {today} — {timeGreeting}
          </p>
        </header>
        <div>
          <Button variant="outline">
            <Scan /> Scan
          </Button>
        </div>
      </div>

      <div>
        <header>
          <h2 className="text-foreground text-2xl font-semibold tracking-tight">
            Today&apos;s Overview
          </h2>
        </header>

        <div></div>
      </div>
    </div>
  );
}
