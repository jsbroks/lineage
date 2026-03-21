import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist, Inter, Instrument_Serif } from "next/font/google";

import { ChatwootWidget } from "~/components/chatwoot";
import { TRPCReactProvider } from "~/trpc/react";
import { cn } from "~/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "Lineage",
    template: "%s | Lineage",
  },
  description:
    "Traceability-first inventory tracking for growers. Scan-based workflows, full lineage, and real-time inventory.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-instrument-serif",
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
        instrumentSerif.variable,
      )}
    >
      <body>
        <TRPCReactProvider>
          <ChatwootWidget>{children}</ChatwootWidget>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
