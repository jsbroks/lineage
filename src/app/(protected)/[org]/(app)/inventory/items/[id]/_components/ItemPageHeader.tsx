"use client";

import React from "react";
import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { Icon } from "~/app/_components/IconPicker";

export const ItemPageHeader: React.FC<{
  org: string;
  code: string;
  itemType?: { id: string; name: string; icon: string | null } | null;
}> = ({ org, code, itemType }) => (
  <header className="flex items-center gap-2 border-b px-4 py-2">
    <SidebarTrigger />
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={`/${org}/inventory`}>Inventory</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {itemType && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  href={`/${org}/inventory/type/${itemType.id}`}
                  className="flex items-center gap-2"
                >
                  <Icon icon={itemType.icon} className="size-3.5" />
                  {itemType.name}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="font-mono">{code}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  </header>
);
