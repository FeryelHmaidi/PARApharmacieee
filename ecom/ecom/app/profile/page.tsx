import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountPageHeader } from "@/components/account-page-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import ProfileClient, {
  type OrderWithItems,
  type ProfileRow,
} from "./ProfileClient";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [{ data: profile }, { data: orders }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>(),
    supabase
      .from("orders")
      .select("*, order_items (*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <>
      <AccountPageHeader
        title="Mon profil"
        subtitle="Gérez vos informations personnelles et suivez vos dernières commandes."
        activePath="/profile"
        actions={[]}
      />
      <ProfileClient
        userId={user.id}
        userEmail={user.email ?? null}
        initialProfile={profile ?? null}
        initialOrders={(orders ?? []) as OrderWithItems[]}
      />
    </>
  );
}
