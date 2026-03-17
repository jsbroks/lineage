import { SidebarProvider } from "~/components/ui/sidebar";
import { TooltipProvider } from "~/components/ui/tooltip";

import { OrgLayoutFrame } from "./_components/org-layout-frame";
import { OrgSidebar } from "./_components/org-sidebar";

type OrgLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ org: string }>;
};

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { org } = await params;

  return (
    <TooltipProvider>
      <SidebarProvider>
        <OrgSidebar org={org} />
        <OrgLayoutFrame org={org}>{children}</OrgLayoutFrame>
      </SidebarProvider>
    </TooltipProvider>
  );
}
