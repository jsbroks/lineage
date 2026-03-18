"use client";

import { usePathname } from "next/navigation";

import { SidebarInset, SidebarTrigger } from "~/components/ui/sidebar";

type OrgLayoutFrameProps = {
  children: React.ReactNode;
  org: string;
};

export function OrgLayoutFrame({ children }: OrgLayoutFrameProps) {
  return <SidebarInset>{children}</SidebarInset>;
}
