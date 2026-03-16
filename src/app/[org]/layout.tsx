import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { TooltipProvider } from "~/components/ui/tooltip";

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
        <SidebarInset>
          <header className="border-b px-4 py-2">
            <SidebarTrigger />
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
