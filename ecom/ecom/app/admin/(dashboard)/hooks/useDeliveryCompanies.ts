"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { DeliveryCompanyRow } from "../types";

export const useDeliveryCompanies = () => {
  return useQuery<DeliveryCompanyRow[], Error>({
    queryKey: ["dashboard-delivery-companies"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("delivery_companies")
        .select("id, name, base_price, delivery_cost, return_fee")
        .order("name");

      if (error) {
        console.warn("Failed to fetch delivery companies:", error.message);
        return [];
      }

      return (data ?? []) as DeliveryCompanyRow[];
    },
    staleTime: 1000 * 60 * 5,
  });
};
