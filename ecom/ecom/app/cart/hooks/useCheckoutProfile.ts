"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { PublicDatabase, TypedSupabaseClient } from "@/lib/supabase/types";

type ProfileRow = PublicDatabase["public"]["Tables"]["profiles"]["Row"];
export type ProfileSelect = Pick<
  ProfileRow,
  "full_name" | "phone" | "address" | "city" | "postal_code"
>;

export type CheckoutProfileData = {
  userId: string | null;
  profile: ProfileSelect | null;
};

export const useCheckoutProfile = () => {
  const supabase = useMemo(
    () => createClient() as unknown as TypedSupabaseClient,
    []
  );

  return useQuery<CheckoutProfileData>({
    queryKey: ["checkout-profile"],
    queryFn: async () => {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const user = sessionData.session?.user;

      if (!user) {
        return { userId: null, profile: null };
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, address, city, postal_code")
        .eq("id", user.id)
        .maybeSingle<ProfileSelect>();

      if (error) {
        throw error;
      }

      return { userId: user.id, profile: data ?? null };
    },
    staleTime: 1000 * 60, // cache for 1 minute
  });
};
