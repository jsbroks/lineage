"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Cog,
  Factory,
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
  SidebarRail,
} from "~/components/ui/sidebar";

type OrgSidebarProps = {
  org: string;
};

const getNavItems = (org: string) => [
  { label: "Home", href: `/${org}`, icon: Home },
  { label: "Item Types", href: `/${org}/settings/item-types`, icon: Boxes },
  {
    label: "Operation Types",
    href: `/${org}/settings/operations`,
    icon: Settings2,
  },
  { label: "Locations", href: `/${org}/settings/locations`, icon: MapPin },
  { label: "Operations", href: `/${org}/operations`, icon: Factory },
  { label: "Lots", href: `/${org}/lots/new`, icon: Package2 },
];

export function OrgSidebar({ org }: OrgSidebarProps) {
  const pathname = usePathname();
  const navItems = getNavItems(org);

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div className="px-2 py-1 text-sm font-semibold">LA</div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={pathname === item.href}>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === `/${org}/settings`}
                tooltip="Settings"
              >
                <Link href={`/${org}/settings`}>
                  <Cog />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
