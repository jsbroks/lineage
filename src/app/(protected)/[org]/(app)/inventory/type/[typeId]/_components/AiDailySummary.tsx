"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";

import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

interface AiDailySummaryProps {
  itemTypeId: string;
}

export function AiDailySummary({ itemTypeId }: AiDailySummaryProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSummary = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setText("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/inventory-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemTypeId }),
        signal: controller.signal,
      });

      if (!res.ok) {
        setError("Failed to load summary");
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("No response stream");
        setLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          setText((prev) => prev + decoder.decode(value, { stream: !done }));
        }
      }
      setLoading(false);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Failed to generate summary");
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void fetchSummary();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemTypeId]);

  if (error) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 py-3">
          <Sparkles className="text-muted-foreground size-4 shrink-0" />
          <span className="text-muted-foreground text-sm">{error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2"
            onClick={() => void fetchSummary()}
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex items-start gap-3 py-3">
        <Sparkles className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          {loading && !text ? (
            <div className="flex items-center gap-2">
              <div className="bg-muted h-4 w-full max-w-md animate-pulse rounded" />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {text}
              {loading && (
                <span className="bg-foreground ml-0.5 inline-block h-3.5 w-1 animate-pulse rounded-sm" />
              )}
            </p>
          )}
        </div>
        {!loading && text && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-0.5 h-7 shrink-0 px-2"
            onClick={() => void fetchSummary()}
          >
            <RefreshCw className="size-3.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
