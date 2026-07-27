import { ChevronUp } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { AdminSidebarMenu } from "./sidebar-menu";

export async function AppSidebar() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }
  return (
    <Sidebar className=" bg-zinc-50 w-60">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {" "}
            <Link
              href="/"
              className="text-xl font-bold text-yellow-600 whitespace-nowrap"
            >
              PharmaStore
            </Link>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <AdminSidebarMenu />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <div className="flex items-center gap-1 w-full">
                    <div className="size-8 px-3 bg-yellow-900 text-yellow-100 uppercase rounded-full flex items-center justify-center">
                      Y
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate">
                        {data.claims.email}
                      </span>
                    </div>
                    <ChevronUp className="ml-auto" />
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem>
                  <span>Account</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>Billing</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
