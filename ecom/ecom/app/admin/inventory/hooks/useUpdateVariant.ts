// useUpdateVariant.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import type { Database } from "@/types/supabase";

type VariantUpdate = Database["public"]["Tables"]["product_variants"]["Update"];

export type UpdateVariantPayload = {
  id: string;
} & Partial<Omit<VariantUpdate, "id">>;

export function useUpdateVariant() {
  const supabase = createClientComponentClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateVariantPayload) => {
      const { id, ...updates } = payload;
      if (!id) throw new Error("Variant id is required");

      // Only include keys that are explicitly present to avoid sending undefined
      const cleaned: Record<string, any> = {};
      Object.entries(updates).forEach(([k, v]) => {
        // allow explicit null (for expiry_date or currency), but skip undefined
        if (v !== undefined) cleaned[k] = v;
      });

      if (Object.keys(cleaned).length === 0) {
        throw new Error("No fields to update");
      }

      const { data, error } = await supabase
        .from("product_variants")
        .update(cleaned)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onSuccess: async (data) => {
      toast.success("Variant updated");
      // Invalidate caches so UI refreshes
      // Invalidate list of products and variants and product-specific queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["product_variants"] }),
        queryClient.invalidateQueries({
          queryKey: ["product", data.product_id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["product", "variants", data.product_id],
        }),
      ]);
    },

    onError: (err: any) => {
      // supabase error shape often includes message
      const msg = err?.message ?? String(err);
      toast.error(`Update failed: ${msg}`);
      throw err;
    },
  });
}

export default useUpdateVariant;
