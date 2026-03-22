"use client";

import { SidebarInset } from "~/components/ui/sidebar";
import { ChatPanel } from "./chat-panel";

type OrgLayoutFrameProps = {
  children: React.ReactNode;
  org: string;
};

export function OrgLayoutFrame({ children }: OrgLayoutFrameProps) {
  return (
    <>
      <SidebarInset className="min-w-0 flex-1">{children}</SidebarInset>
      <ChatPanel />
    </>
  );
}
