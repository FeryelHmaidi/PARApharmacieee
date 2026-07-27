// app/(admin)/components/AppSidebar.server.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server"; // your server supabase factory
import ClientSidebar from "./AppSidebar.client";

export default async function AppSidebar() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    // not authenticated — redirect on server
    redirect("/auth/login");
  }

  // extract only plain serializable fields we need
  const email = data.claims.email ?? null;
  const initials = (email && email[0]?.toUpperCase()) ?? "U";

  // pass plain props to the client component
  return <ClientSidebar email={email} initials={initials} />;
}
