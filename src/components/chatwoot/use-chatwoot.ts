"use client";

import { useContext } from "react";
import { ChatwootContext } from "./chatwoot-provider";

export function useChatwoot() {
  const context = useContext(ChatwootContext);
  if (!context) {
    throw new Error("useChatwoot must be used within a <ChatwootProvider>");
  }
  return context;
}
