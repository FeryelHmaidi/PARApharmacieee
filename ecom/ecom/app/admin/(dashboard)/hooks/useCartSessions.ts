"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { TypedSupabaseClient } from "@/lib/supabase/types";
import type { CartSession } from "../types";

const useSupabase = () =>
  useMemo(() => createClient() as unknown as TypedSupabaseClient, []);

export const useCartSessions = () => {
  const supabase = useSupabase();

  return useQuery<CartSession[], Error>({
    queryKey: ["dashboard-cart-sessions"],
    queryFn: async () => {
      const { data, error } = (await supabase
        .from("cart_sessions")
        .select(
          `
            id,
            user_id,
            status,
            subtotal,
            currency,
            updated_at,
            cart_session_items (quantity)
          `
        )
        .order("updated_at", { ascending: false })
        .limit(20)) as any;

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map((session: any) => {
        const items = Array.isArray(session.cart_session_items)
          ? session.cart_session_items
          : [];
        const items_count = items.reduce(
          (sum: number, item: { quantity?: number } | null) =>
            sum + (item?.quantity ?? 0),
          0
        );

        return {
          id: session.id,
          user_id: session.user_id,
          status: session.status,
          subtotal: session.subtotal,
          currency: session.currency,
          updated_at: session.updated_at,
          items_count,
        } satisfies CartSession;
      });
    },
    staleTime: 1000 * 60,
  });
};
