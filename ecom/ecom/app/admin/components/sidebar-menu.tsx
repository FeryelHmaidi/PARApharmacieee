"use client";

import {
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ChartArea, PackageSearch, Pill, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Menu items with proper routes
const items = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: ChartArea,
  },
  {
    title: "Orders",
    url: "/admin/orders",
    icon: PackageSearch,
  },
  {
    title: "Inventory",
    url: "/admin/inventory",
    icon: Pill,
  },
];

export function AdminSidebarMenu() {
  const pathname = usePathname();

  return (
    <SidebarMenu className="mt-8">
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            isActive={pathname === item.url}
            asChild
            className={cn(
              pathname === item.url
                ? "bg-yellow-100 text-yellow-600 hover:scale-[101%] transition-all duration-300 w-full justify-start py-5"
                : "w-full justify-start text-yellow-900 py-5 hover:scale-[101%] transition-all duration-300 hover:bg-gray-100"
            )}
          >
            <Link href={item.url}>
              <item.icon />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
