"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { TypedSupabaseClient } from "@/lib/supabase/types";
import type { AdminOrder } from "../types";

const normalizeOrders = (orders: any[] | null): AdminOrder[] => {
  if (!orders || !orders.length) return [];
  return orders.map((order) => ({
    ...order,
    order_items: order?.order_items ?? [],
    customer_profile: order?.customer_profile ?? null,
  }));
};

export const useOrders = () => {
  const supabase = useMemo(
    () => createClient() as unknown as TypedSupabaseClient,
    []
  );

  return useQuery<AdminOrder[], Error>({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
            *,
            order_items (*),
            customer_profile:profiles!orders_user_id_fkey (
              id,
              full_name,
              email,
              phone
            )
          `
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return normalizeOrders(data ?? []);
    },
    staleTime: 1000 * 30,
  });
};
