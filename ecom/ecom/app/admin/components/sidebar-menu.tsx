"use client";

import {
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
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
    isActive: true, // For collapsible
    items: [
      {
        title: "Produits",
        url: "/admin/inventory",
      },
      {
        title: "Catégories",
        url: "/admin/inventory/categories",
      },
      {
        title: "Sous-catégories",
        url: "/admin/inventory/subcategories",
      },
      {
        title: "Marques",
        url: "/admin/inventory/brands",
      },
    ],
  },
];

export function AdminSidebarMenu() {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarMenu className="mt-8">
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            isActive={pathname === item.url && !item.items}
            asChild={!item.items}
            onClick={item.items ? undefined : handleLinkClick}
            tooltip={item.title}
            className={cn(
              (pathname === item.url && !item.items)
                ? "bg-yellow-100 text-yellow-600 hover:scale-[101%] transition-all duration-300 w-full justify-start py-5"
                : "w-full justify-start text-yellow-900 py-5 hover:scale-[101%] transition-all duration-300 hover:bg-gray-100"
            )}
          >
            {item.items ? (
              <div className="flex w-full items-center">
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
              </div>
            ) : (
              <Link href={item.url}>
                <item.icon />
                <span>{item.title}</span>
              </Link>
            )}
          </SidebarMenuButton>
          
          {item.items && (
            <SidebarMenuSub>
              {item.items.map((subItem) => (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton 
                    asChild 
                    isActive={pathname === subItem.url}
                    onClick={handleLinkClick}
                    className={cn(
                      pathname === subItem.url 
                        ? "bg-yellow-50 text-yellow-700 font-medium" 
                        : "text-gray-600 hover:text-yellow-700 hover:bg-gray-50"
                    )}
                  >
                    <Link href={subItem.url}>
                      <span>{subItem.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
