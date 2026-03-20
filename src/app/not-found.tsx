import Link from "next/link";
import { Button } from "~/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 py-16">
      <p className="text-muted-foreground text-sm font-medium tracking-widest uppercase">
        404
      </p>
      <h1 className="text-foreground mt-3 text-3xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="text-muted-foreground mt-2 text-center text-base">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button asChild className="mt-8" variant="outline">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
