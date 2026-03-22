import { SidebarProvider } from "~/components/ui/sidebar";
import { TooltipProvider } from "~/components/ui/tooltip";

import { ChatPanelProvider } from "./_components/chat-panel-context";
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
      <ChatPanelProvider>
        <SidebarProvider>
          <OrgSidebar org={org} />
          <OrgLayoutFrame org={org}>{children}</OrgLayoutFrame>
        </SidebarProvider>
      </ChatPanelProvider>
    </TooltipProvider>
  );
}
