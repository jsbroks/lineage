"use client";

import { env } from "~/env";
import { ChatwootProvider } from "./chatwoot-provider";
import type { ChatwootSettings } from "./types";

type ChatwootWidgetProps = {
  children: React.ReactNode;
  settings?: ChatwootSettings;
};

/**
 * Drop-in wrapper that initializes Chatwoot and provides the `useChatwoot`
 * hook to all descendants. Reads token/url from environment variables.
 *
 * Renders nothing extra in the DOM — the Chatwoot SDK injects its own bubble.
 */
export function ChatwootWidget({ children, settings }: ChatwootWidgetProps) {
  const token = env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN;

  if (!token) return <>{children}</>;

  return (
    <ChatwootProvider
      websiteToken={token}
      baseUrl={env.NEXT_PUBLIC_CHATWOOT_BASE_URL}
      settings={settings}
    >
      {children}
    </ChatwootProvider>
  );
}
