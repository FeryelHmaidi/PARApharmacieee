import { redirect } from "next/navigation";
import AppSidebar from "./components/AppSidebar.server";
import MainContent from "./components/MainContent";
import { createClient } from "@/lib/supabase/server";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full flex-col bg-white text-slate-900">
        {/* Admin Navigation Header */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-white px-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <span className="font-bold text-yellow-700">PharmaStore Admin</span>
          </div>
        </header>

        <div className="flex flex-1 w-full relative bg-white">
          <AppSidebar />
          <MainContent>{children}</MainContent>
        </div>
      </div>
    </SidebarProvider>
  );
}
