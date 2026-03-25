import "~/styles/globals.css";

import { type Metadata } from "next";
import { DM_Serif_Display, Geist, Inter } from "next/font/google";

import { ChatwootWidget } from "~/components/chatwoot";
import { PostHogProvider } from "~/components/posthog";
import { TRPCReactProvider } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { NuqsAdapter } from "nuqs/adapters/next/app";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://lineage.farm"),
  title: {
    default: "Lineage",
    template: "%s | Lineage",
  },
  description:
    "Traceability-first inventory tracking for growers. Scan-based workflows, full lineage, and real-time inventory.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  openGraph: {
    type: "website",
    siteName: "Lineage",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn(
        geist.variable,
        "font-sans",
        inter.variable,
        dmSerifDisplay.variable,
      )}
    >
      <body>
        <TRPCReactProvider>
          <PostHogProvider>
            <ChatwootWidget>
              <NuqsAdapter>{children}</NuqsAdapter>
            </ChatwootWidget>
          </PostHogProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
