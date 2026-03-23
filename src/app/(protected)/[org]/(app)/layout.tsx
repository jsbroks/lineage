import { redirect } from "next/navigation";
import { SidebarProvider } from "~/components/ui/sidebar";
import { TooltipProvider } from "~/components/ui/tooltip";
import { getSession } from "~/server/better-auth/server";

import { ChatPanelProvider } from "./_components/chat-panel-context";
import { OrgLayoutFrame } from "./_components/org-layout-frame";
import { OrgSidebar } from "./_components/org-sidebar";
import { getOrgBySlug } from "./_lib/org-helpers";

type OrgLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ org: string }>;
};

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { org } = await params;

  const [orgData, session] = await Promise.all([
    getOrgBySlug(org),
    getSession(),
  ]);

  if (session?.session.activeOrganizationId !== orgData.id) {
    redirect("/login");
  }

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
