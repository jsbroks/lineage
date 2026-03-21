export type ChatwootPosition = "left" | "right";
export type ChatwootType = "standard" | "expanded_bubble";

export type ChatwootSettings = {
  hideMessageBubble?: boolean;
  position?: ChatwootPosition;
  locale?: string;
  useBrowserLanguage?: boolean;
  type?: ChatwootType;
  darkMode?: "auto" | "light";
  launcherTitle?: string;
  showPopoutButton?: boolean;
};

export type ChatwootUser = {
  name?: string;
  email?: string;
  avatar_url?: string;
  phone_number?: string;
  identifier_hash?: string;
};

export type ChatwootCustomAttributes = Record<
  string,
  string | number | boolean
>;

export type ChatwootSDK = {
  run: (config: { websiteToken: string; baseUrl: string }) => void;
};

export type ChatwootInstance = {
  toggle: (state?: "open" | "close") => void;
  setUser: (identifier: string, user: ChatwootUser) => void;
  setCustomAttributes: (attributes: ChatwootCustomAttributes) => void;
  deleteCustomAttribute: (key: string) => void;
  setConversationCustomAttributes: (
    attributes: ChatwootCustomAttributes,
  ) => void;
  deleteConversationCustomAttribute: (key: string) => void;
  setLabel: (label: string) => void;
  removeLabel: (label: string) => void;
  setLocale: (locale: string) => void;
  reset: () => void;
  popoutChatWindow: () => void;
  isOpen: boolean;
  hasLoaded: boolean;
};

declare global {
  interface Window {
    chatwootSettings?: ChatwootSettings;
    chatwootSDK?: ChatwootSDK;
    $chatwoot?: ChatwootInstance;
  }
}
