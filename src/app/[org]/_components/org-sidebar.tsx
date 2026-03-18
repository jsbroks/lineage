"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  Cog,
  Home,
  MapPin,
  Package2,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "~/components/ui/sidebar";

type OrgSidebarProps = {
  org: string;
};

export function OrgSidebar({ org }: OrgSidebarProps) {
  const pathname = usePathname();

  const mainNav = [
    { label: "Home", href: `/${org}`, icon: Home },
    { label: "Inventory", href: `/${org}/items/new`, icon: Package2 },
    {
      label: "Record Task",
      href: `/${org}/operations`,
      icon: ClipboardList,
    },
  ];

  const setupSubItems = [
    { label: "Categories", href: `/${org}/settings/item-types`, icon: Boxes },
    {
      label: "Task Types",
      href: `/${org}/settings/operations`,
      icon: Settings2,
    },
    { label: "Rooms & Areas", href: `/${org}/settings/locations`, icon: MapPin },
  ];

  const isSetupActive = pathname.startsWith(`/${org}/settings`);

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
                <SidebarMenuButton asChild isActive={pathname === item.href}>
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
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === `/${org}/settings`}
                tooltip="Setup"
              >
                <Link href={`/${org}/settings`}>
                  <Cog />
                  <span>Setup</span>
                </Link>
              </SidebarMenuButton>
              {isSetupActive && (
                <SidebarMenuSub>
                  {setupSubItems.map((item) => (
                    <SidebarMenuSubItem key={item.href}>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.startsWith(item.href)}
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
