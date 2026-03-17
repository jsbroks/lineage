"use client";

import { usePathname } from "next/navigation";

import { SidebarInset, SidebarTrigger } from "~/components/ui/sidebar";

type OrgLayoutFrameProps = {
  children: React.ReactNode;
  org: string;
};

export function OrgLayoutFrame({ children, org }: OrgLayoutFrameProps) {
  const pathname = usePathname();
  const hideHeader = pathname === `/${org}/operations`;

  return (
    <SidebarInset>
      {!hideHeader && (
        <header className="border-b px-4 py-2">
          <SidebarTrigger />
        </header>
      )}
      {children}
    </SidebarInset>
  );
}
