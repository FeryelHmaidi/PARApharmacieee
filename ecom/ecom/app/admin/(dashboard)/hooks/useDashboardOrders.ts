"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { TypedSupabaseClient } from "@/lib/supabase/types";
import type { DashboardOrder, DashboardOrderItem } from "../types";

const useSupabase = () =>
  useMemo(() => createClient() as unknown as TypedSupabaseClient, []);

const monthsToDate = (months: number) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const from = new Date(now);
  from.setMonth(now.getMonth() - (months - 1));
  return from.toISOString();
};

export const useDashboardOrders = (months = 12) => {
  const supabase = useSupabase();

  return useQuery<DashboardOrder[], Error>({
    queryKey: ["dashboard-orders", months],
    queryFn: async () => {
      const since = monthsToDate(months);

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
            id,
            status,
            payment_status,
            total_amount,
            currency,
            created_at,
            user_id,
            shipping_phone,
            guest_info,
            customer_profile:profiles!orders_user_id_fkey (
              id,
              full_name,
              phone
            ),
            order_items (
              id,
              order_id,
              product_id,
              variant_id,
              quantity,
              price_at_purchase,
              product:products (
                id,
                name,
                sku
              )
            )
          `
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map((record) => ({
        ...record,
        order_items: (record.order_items ?? []).map((item) => ({
          ...(item as DashboardOrderItem),
          product: (item as DashboardOrderItem).product ?? null,
        })),
      })) as DashboardOrder[];
    },
    staleTime: 1000 * 60,
  });
};
