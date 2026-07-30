"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { TypedSupabaseClient } from "@/lib/supabase/types";
import type { InventoryProduct, InventoryVariant } from "../types";

const useSupabase = () =>
  useMemo(() => createClient() as unknown as TypedSupabaseClient, []);

export const useInventorySnapshot = () => {
  const supabase = useSupabase();

  return useQuery<InventoryProduct[], Error>({
    queryKey: ["dashboard-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
            id,
            name,
            sku,
            best_seller,
            status,
            deleted_at,
            product_variants (
              id,
              stock,
              price,
              cost_price,
              currency,
              expiry_date,
              size_value,
              size_unit
            )
          `
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map((record) => ({
        id: record.id,
        name: record.name,
        sku: record.sku,
        best_seller: record.best_seller,
        status: record.status,
        variants: (record.product_variants ?? []) as unknown as InventoryVariant[],
      }));
    },
    staleTime: 1000 * 60 * 5,
  });
};
