"use client";

import { useState, useRef, useCallback } from "react";

const DEMO_RESPONSE = `Based on harvest data from **Mar 13 – Mar 19**, you grew:

• **12.4 lbs** of Blue Oyster (18 blocks)
• **8.7 lbs** of Lion's Mane (11 blocks)
• **5.2 lbs** of Shiitake (9 blocks)

**Total: 26.3 lbs** this week — up 14% from last week.`;

const SUGGESTED_QUESTIONS = [
  "How many pounds of mushrooms did I grow this week?",
  "Which strain has the best yield this month?",
  "Show me blocks ready to fruit",
];

export function AiDemo() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [visibleChars, setVisibleChars] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runDemo = useCallback((q: string) => {
    if (isTyping) return;
    setSubmittedQuery(q);
    setQuery("");
    setVisibleChars(0);
    setIsTyping(true);

    let i = 0;
    intervalRef.current = setInterval(() => {
      i += 1;
      setVisibleChars(i);
      if (i >= DEMO_RESPONSE.length) {
        clearInterval(intervalRef.current!);
        setIsTyping(false);
      }
    }, 12);
  }, [isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    runDemo(query.trim());
  };

  const renderedResponse = DEMO_RESPONSE.slice(0, visibleChars);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-background">
            <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" fill="currentColor" />
          </svg>
        </div>
        <span className="text-sm font-medium">Ask Lineage</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          AI
        </span>
      </div>

      {/* Chat area */}
      <div className="min-h-[260px] px-4 py-4 sm:px-6">
        {!submittedQuery && !isTyping && (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">
              Ask a question about your grow operation
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => runDemo(q)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {submittedQuery && (
          <div className="space-y-4">
            {/* User message */}
            <div className="flex justify-end">
              <div className="rounded-xl rounded-br-sm bg-foreground px-3.5 py-2 text-sm text-background">
                {submittedQuery}
              </div>
            </div>

            {/* AI response */}
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-foreground/10">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-foreground">
                  <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" fill="currentColor" />
                </svg>
              </div>
              <div className="text-sm leading-relaxed text-foreground min-w-0">
                <FormattedResponse text={renderedResponse} />
                {isTyping && (
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border px-4 py-3 sm:px-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about your harvest, inventory, yields…"
            className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <button
            type="submit"
            disabled={!query.trim() || isTyping}
            className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-3 text-sm font-medium text-background transition-colors hover:bg-foreground/80 disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

function FormattedResponse({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <>
      {lines.map((line, i) => {
        const formatted = line
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/^• /, "");

        const isBullet = line.startsWith("• ");

        if (line.trim() === "") {
          return <br key={i} />;
        }

        if (isBullet) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-muted-foreground">•</span>
              <span dangerouslySetInnerHTML={{ __html: formatted }} />
            </div>
          );
        }

        return (
          <div key={i}>
            <span dangerouslySetInnerHTML={{ __html: formatted }} />
          </div>
        );
      })}
    </>
  );
}
