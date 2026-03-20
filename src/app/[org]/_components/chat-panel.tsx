"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  MessageCircle,
  Send,
  X,
  Loader2,
  Check,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "~/components/ui/table";
import { useChatPanel } from "./chat-panel-context";

const WRITE_TOOL_NAMES = new Set([
  "updateItemStatus",
  "moveItems",
  "executeOperation",
  "bulkUpdateStatus",
  "updateAttributes",
]);

type ActionState =
  | { status: "pending" }
  | { status: "executing" }
  | { status: "confirmed"; updated: number }
  | { status: "rejected" }
  | { status: "error"; error: string };

type PendingActionResult = {
  type: string;
  description: string;
  affectedItems: Array<{
    id: string;
    code: string;
    currentStatus?: string;
    currentLocation?: string;
  }>;
  changes: Record<string, string>;
  payload: Record<string, unknown>;
  requiresConfirmation: true;
};

function isPendingAction(result: unknown): result is PendingActionResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "requiresConfirmation" in result &&
    (result as Record<string, unknown>).requiresConfirmation === true
  );
}

function ConfirmationCard({
  action,
  state,
  onConfirm,
  onReject,
}: {
  action: PendingActionResult;
  state: ActionState;
  onConfirm: () => void;
  onReject: () => void;
}) {
  if (state.status === "rejected") {
    return (
      <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
        <p className="text-xs text-gray-500">Action cancelled</p>
      </div>
    );
  }

  if (state.status === "confirmed") {
    return (
      <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Check className="size-3.5 text-emerald-600" />
          <p className="text-xs font-medium text-emerald-700">
            Done — {state.updated} item(s) updated
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
        <p className="text-xs text-red-700">Error: {state.error}</p>
      </div>
    );
  }

  const isExecuting = state.status === "executing";
  const items = action.affectedItems;
  const displayItems = items.slice(0, 5);
  const remaining = items.length - displayItems.length;

  return (
    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-center gap-1.5 text-amber-800">
        <AlertTriangle className="size-3.5 shrink-0" />
        <span className="text-xs font-medium">Proposed Action</span>
      </div>

      <div className="mt-1.5 space-y-1">
        {Object.entries(action.changes).map(([key, value]) => (
          <div
            key={key}
            className="flex items-center gap-1.5 text-xs text-amber-700"
          >
            <ArrowRight className="size-3 shrink-0" />
            <span>
              <span className="font-medium">{key}:</span> {value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-1.5 text-xs text-amber-600">
        {displayItems.map((it) => it.code).join(", ")}
        {remaining > 0 && ` +${remaining} more`}
      </div>

      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={onConfirm}
          disabled={isExecuting}
        >
          {isExecuting ? (
            <>
              <Loader2 className="mr-1 size-3 animate-spin" />
              Applying...
            </>
          ) : (
            "Apply"
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-3 text-xs"
          onClick={onReject}
          disabled={isExecuting}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function useSuggestions() {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fetched = useRef(false);

  const load = useCallback(() => {
    if (fetched.current) return;
    fetched.current = true;
    setLoading(true);
    fetch("/api/ai/suggestions")
      .then((r) => r.json() as Promise<{ suggestions: string[] }>)
      .then((data) => setSuggestions(data.suggestions))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { suggestions, loading, load };
}

const transport = new DefaultChatTransport({ api: "/api/ai/chat" });

export function ChatPanel() {
  const { open, close } = useChatPanel();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const {
    suggestions,
    loading: suggestionsLoading,
    load: loadSuggestions,
  } = useSuggestions();

  const { messages, sendMessage, status } = useChat({ transport });

  const isLoading = status === "submitted" || status === "streaming";

  const [actionStates, setActionStates] = useState<Record<string, ActionState>>(
    {},
  );

  const executeAction = useCallback(
    async (toolCallId: string, action: PendingActionResult) => {
      setActionStates((prev) => ({
        ...prev,
        [toolCallId]: { status: "executing" },
      }));
      try {
        const res = await fetch("/api/ai/execute-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: action.type,
            payload: action.payload,
          }),
        });
        const data = (await res.json()) as {
          success?: boolean;
          updated?: number;
          result?: { itemsUpdated?: string[]; itemsCreated?: string[] };
          error?: string;
        };
        if (!res.ok || !data.success) {
          setActionStates((prev) => ({
            ...prev,
            [toolCallId]: {
              status: "error",
              error: data.error ?? "Action failed",
            },
          }));
          return;
        }
        const updatedCount =
          data.updated ??
          (data.result?.itemsUpdated?.length ?? 0) +
            (data.result?.itemsCreated?.length ?? 0);
        setActionStates((prev) => ({
          ...prev,
          [toolCallId]: { status: "confirmed", updated: updatedCount },
        }));
      } catch {
        setActionStates((prev) => ({
          ...prev,
          [toolCallId]: {
            status: "error",
            error: "Network error",
          },
        }));
      }
    },
    [],
  );

  const rejectAction = useCallback((toolCallId: string) => {
    setActionStates((prev) => ({
      ...prev,
      [toolCallId]: { status: "rejected" },
    }));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      loadSuggestions();
    }
  }, [open, loadSuggestions]);

  const [input, setInput] = useState("");

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <aside
      className={cn(
        "sticky top-0 right-0 flex h-screen flex-col transition-[width,opacity] duration-200 ease-in-out",
        open ? "w-[380px] opacity-100" : "w-0 overflow-hidden opacity-0",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="text-muted-foreground size-4" />
          <span className="text-sm">Ask Inventory</span>
        </div>
        <Button variant="ghost" size="icon-xs" onClick={close}>
          <X className="size-3.5" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="grow space-y-4 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-center text-sm">
            <MessageCircle className="text-muted-foreground/50 size-8" />
            <button
              type="button"
              className="hover:text-foreground transition-colors"
              onClick={() =>
                sendMessage({ text: "Tell me about my inventory." })
              }
            >
              Ask anything about your inventory.
            </button>
            <div className="mt-2 space-y-1 text-xs">
              {suggestionsLoading ? (
                <Loader2 className="text-muted-foreground/50 mx-auto size-4 animate-spin" />
              ) : (
                suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="text-muted-foreground/70 hover:text-foreground block w-full transition-colors"
                    onClick={() => sendMessage({ text: suggestion })}
                  >
                    &ldquo;{suggestion}&rdquo;
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                message.role === "user"
                  ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                  : "text-foreground border bg-white",
              )}
            >
              {message.parts.map((part, i) => {
                if (part.type === "text") {
                  if (message.role === "assistant") {
                    return (
                      <ReactMarkdown
                        key={i}
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0">{children}</p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold">
                              {children}
                            </strong>
                          ),
                          ul: ({ children }) => (
                            <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => <li>{children}</li>,
                          code: ({ children }) => (
                            <code className="bg-foreground/10 rounded px-1 py-0.5 text-xs">
                              {children}
                            </code>
                          ),
                          pre: ({ children }) => (
                            <pre className="bg-foreground/10 mb-2 overflow-x-auto rounded p-2 text-xs last:mb-0">
                              {children}
                            </pre>
                          ),
                          table: ({ children }) => (
                            <div className="my-2 last:mb-0">
                              <Table className="text-xs">{children}</Table>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <TableHeader>{children}</TableHeader>
                          ),
                          tbody: ({ children }) => (
                            <TableBody>{children}</TableBody>
                          ),
                          tr: ({ children }) => <TableRow>{children}</TableRow>,
                          th: ({ children }) => (
                            <TableHead className="h-8 px-2 text-xs">
                              {children}
                            </TableHead>
                          ),
                          td: ({ children }) => (
                            <TableCell className="px-2 py-1.5">
                              {children}
                            </TableCell>
                          ),
                        }}
                      >
                        {part.text}
                      </ReactMarkdown>
                    );
                  }
                  return <span key={i}>{part.text}</span>;
                }
                if (
                  part.type.startsWith("tool-") &&
                  "state" in part &&
                  part.state === "output-available" &&
                  "output" in part &&
                  WRITE_TOOL_NAMES.has(part.type.slice(5)) &&
                  isPendingAction(part.output)
                ) {
                  const toolCallId = (part as { toolCallId: string })
                    .toolCallId;
                  const result = part.output as PendingActionResult;
                  const state: ActionState = actionStates[toolCallId] ?? {
                    status: "pending",
                  };
                  return (
                    <ConfirmationCard
                      key={i}
                      action={result}
                      state={state}
                      onConfirm={() => executeAction(toolCallId, result)}
                      onReject={() => rejectAction(toolCallId)}
                    />
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}

        {isLoading &&
          (() => {
            const last = messages[messages.length - 1];
            const hasVisibleText =
              last?.role === "assistant" &&
              last.parts.some(
                (p) => p.type === "text" && p.text.trim().length > 0,
              );
            if (hasVisibleText) return null;
            return (
              <div className="flex justify-start">
                <div className="text-muted-foreground flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Thinking&hellip;</span>
                </div>
              </div>
            );
          })()}
      </div>

      {/* Input */}
      <div className="px-4 py-3">
        <div className="flex items-end gap-2 rounded-lg border bg-white px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your inventory..."
            rows={1}
            className="placeholder:text-muted-foreground flex-1 resize-none bg-transparent text-sm outline-none"
            disabled={isLoading}
          />
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
