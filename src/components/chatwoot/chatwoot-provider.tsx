"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  ChatwootCustomAttributes,
  ChatwootSettings,
  ChatwootUser,
} from "./types";

type ChatwootContextValue = {
  isReady: boolean;
  isOpen: boolean;
  toggle: (state?: "open" | "close") => void;
  open: () => void;
  close: () => void;
  setUser: (identifier: string, user: ChatwootUser) => void;
  setCustomAttributes: (attributes: ChatwootCustomAttributes) => void;
  deleteCustomAttribute: (key: string) => void;
  setLabel: (label: string) => void;
  removeLabel: (label: string) => void;
  setLocale: (locale: string) => void;
  reset: () => void;
  popoutChatWindow: () => void;
};

export const ChatwootContext = createContext<ChatwootContextValue | null>(null);

type ChatwootProviderProps = {
  children: ReactNode;
  websiteToken: string;
  baseUrl?: string;
  settings?: ChatwootSettings;
};

export function ChatwootProvider({
  children,
  websiteToken,
  baseUrl = "https://app.chatwoot.com",
  settings,
}: ChatwootProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current || typeof window === "undefined") return;
    scriptLoaded.current = true;

    window.chatwootSettings = {
      hideMessageBubble: false,
      position: "right",
      locale: "en",
      type: "standard",
      ...settings,
    };

    const script = document.createElement("script");
    script.src = `${baseUrl}/packs/js/sdk.js`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      window.chatwootSDK?.run({ websiteToken, baseUrl });
    };

    document.head.appendChild(script);

    const onReady = () => setIsReady(true);
    window.addEventListener("chatwoot:ready", onReady);

    const onMessage = () => {
      if (window.$chatwoot) {
        setIsOpen(window.$chatwoot.isOpen);
      }
    };
    window.addEventListener("chatwoot:on-message", onMessage);

    return () => {
      window.removeEventListener("chatwoot:ready", onReady);
      window.removeEventListener("chatwoot:on-message", onMessage);
    };
  }, [websiteToken, baseUrl, settings]);

  const toggle = useCallback(
    (state?: "open" | "close") => {
      if (!isReady || !window.$chatwoot) return;
      window.$chatwoot.toggle(state);
      setIsOpen(state === "open" ? true : state === "close" ? false : !isOpen);
    },
    [isReady, isOpen],
  );

  const open = useCallback(() => toggle("open"), [toggle]);
  const close = useCallback(() => toggle("close"), [toggle]);

  const setUser = useCallback(
    (identifier: string, user: ChatwootUser) => {
      if (!isReady || !window.$chatwoot) return;
      window.$chatwoot.setUser(identifier, user);
    },
    [isReady],
  );

  const setCustomAttributes = useCallback(
    (attributes: ChatwootCustomAttributes) => {
      if (!isReady || !window.$chatwoot) return;
      window.$chatwoot.setCustomAttributes(attributes);
    },
    [isReady],
  );

  const deleteCustomAttribute = useCallback(
    (key: string) => {
      if (!isReady || !window.$chatwoot) return;
      window.$chatwoot.deleteCustomAttribute(key);
    },
    [isReady],
  );

  const setLabel = useCallback(
    (label: string) => {
      if (!isReady || !window.$chatwoot) return;
      window.$chatwoot.setLabel(label);
    },
    [isReady],
  );

  const removeLabel = useCallback(
    (label: string) => {
      if (!isReady || !window.$chatwoot) return;
      window.$chatwoot.removeLabel(label);
    },
    [isReady],
  );

  const setLocale = useCallback(
    (locale: string) => {
      if (!isReady || !window.$chatwoot) return;
      window.$chatwoot.setLocale(locale);
    },
    [isReady],
  );

  const reset = useCallback(() => {
    if (!isReady || !window.$chatwoot) return;
    window.$chatwoot.reset();
  }, [isReady]);

  const popoutChatWindow = useCallback(() => {
    if (!isReady || !window.$chatwoot) return;
    window.$chatwoot.popoutChatWindow();
  }, [isReady]);

  return (
    <ChatwootContext.Provider
      value={{
        isReady,
        isOpen,
        toggle,
        open,
        close,
        setUser,
        setCustomAttributes,
        deleteCustomAttribute,
        setLabel,
        removeLabel,
        setLocale,
        reset,
        popoutChatWindow,
      }}
    >
      {children}
    </ChatwootContext.Provider>
  );
}
