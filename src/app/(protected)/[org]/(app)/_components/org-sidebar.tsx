"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  CreditCard,
  Home,
  MapPin,
  MessageCircle,
  Package2,
  ScanBarcode,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "~/components/ui/sidebar";
import { Button } from "~/components/ui/button";
import { useChatPanel } from "./chat-panel-context";

type OrgSidebarProps = {
  org: string;
};

export function OrgSidebar({ org }: OrgSidebarProps) {
  const pathname = usePathname();
  const { toggle } = useChatPanel();

  const mainNav = [
    { label: "Home", href: `/${org}`, icon: Home },
    {
      label: "Inventory",
      href: `/${org}/inventory`,
      icon: Package2,
    },
    {
      label: "Scan",
      href: `/${org}/scan`,
      icon: ScanBarcode,
    },
  ];

  const setupNav = [
    {
      label: "Activities",
      href: `/${org}/tasks`,
      icon: ClipboardList,
    },
    {
      label: "Locations",
      href: `/${org}/settings/locations`,
      icon: MapPin,
    },
  ];

  const accountNav = [
    {
      label: "Team",
      href: `/${org}/settings/team`,
      icon: Users,
    },
    {
      label: "Billing",
      href: `/${org}/settings/billing`,
      icon: CreditCard,
    },
  ];

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-sm font-semibold">LA</span>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Ask Inventory"
            onClick={toggle}
          >
            <MessageCircle className="size-4" />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {mainNav.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/")
                  }
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Setup</SidebarGroupLabel>
          <SidebarMenu>
            {setupNav.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarMenu>
            {accountNav.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
