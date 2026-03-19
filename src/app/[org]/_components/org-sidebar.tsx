"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Home,
  MapPin,
  Package2,
  Printer,
  ScanBarcode,
  Settings2,
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

type OrgSidebarProps = {
  org: string;
};

export function OrgSidebar({ org }: OrgSidebarProps) {
  const pathname = usePathname();

  const mainNav = [
    { label: "Home", href: `/${org}`, icon: Home },
    {
      label: "Inventory",
      href: `/${org}/inventory`,
      icon: Package2,
    },
    {
      label: "Print Labels",
      href: `/${org}/inventory/print`,
      icon: Printer,
    },
    {
      label: "Scan",
      href: `/${org}/scan`,
      icon: ScanBarcode,
    },
    {
      label: "Record Task",
      href: `/${org}/operations`,
      icon: ClipboardList,
    },
  ];

  const settingsNav = [
    {
      label: "Task Types",
      href: `/${org}/tasks`,
      icon: Settings2,
    },
    {
      label: "Rooms & Areas",
      href: `/${org}/settings/locations`,
      icon: MapPin,
    },
  ];

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div className="px-2 py-1 text-sm font-semibold">LA</div>
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
                    item.href === `/${org}/inventory`
                      ? pathname === item.href ||
                        (pathname.startsWith(item.href) &&
                          !pathname.startsWith(`/${org}/inventory/print`))
                      : pathname === item.href ||
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
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarMenu>
            {settingsNav.map((item) => (
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
