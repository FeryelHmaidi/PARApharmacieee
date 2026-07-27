// app/(admin)/components/AppSidebar.client.tsx
"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronUp, LogOut, User2 } from "lucide-react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { AdminSidebarMenu } from "./sidebar-menu";
import { createClient } from "@/lib/supabase/client";

export default function ClientSidebar({
  email,
  initials,
}: {
  email: string | null;
  initials?: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/auth/login");
      router.refresh();
    } catch (error) {
      console.error("Failed to sign out", error);
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, router, supabase]);

  const handleProfileNavigate = useCallback(() => {
    router.push("/profile");
  }, [router]);

  return (
    <Sidebar className="bg-zinc-50 w-60">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
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
                      {initials ?? "U"}
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate">
                        {email ?? "Unknown"}
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
                <DropdownMenuLabel>Session</DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    handleProfileNavigate();
                  }}
                >
                  <User2 className="size-4" /> Profil client
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={isSigningOut}
                  onSelect={(event) => {
                    event.preventDefault();
                    handleSignOut();
                  }}
                >
                  <LogOut className="size-4" />
                  {isSigningOut ? "Déconnexion…" : "Se déconnecter"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
