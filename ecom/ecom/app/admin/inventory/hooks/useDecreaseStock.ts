"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import type { Database } from "@/types/supabase";

type AdjustStockPayload = {
  id: string; // variant id
  delta: number; // positive integer to subtract
};

type VariantRow = Database["public"]["Tables"]["product_variants"]["Row"];
type VariantUpdate = Database["public"]["Tables"]["product_variants"]["Update"];
type VariantStockRecord = Pick<VariantRow, "stock" | "product_id">;
type VariantSummary = Pick<VariantRow, "id" | "stock" | "product_id">;

export function useDecreaseStock() {
  const supabase = createClientComponentClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, delta }: AdjustStockPayload) => {
      if (!id) throw new Error("Variant id required");
      if (delta <= 0) throw new Error("delta must be positive");

      const { data: current, error: selectErr } = await supabase
        .from("product_variants")
        .select("stock, product_id")
        .eq("id", id)
        .single();

      if (selectErr) throw selectErr;

      const variant = current as VariantStockRecord | null;
      const currentStock = Number(variant?.stock ?? 0);
      const newStock = Math.max(0, currentStock - delta);

      const updatePatch: VariantUpdate = { stock: newStock };

      const { data, error: updateErr } = await supabase
        .from("product_variants")
        .update(updatePatch)
        .eq("id", id)
        .select("id, stock, product_id")
        .single();

      if (updateErr) throw updateErr;
      return data as VariantSummary;
    },

    onSuccess: async (data) => {
      toast.success("Stock decreased");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["products"] }),
        qc.invalidateQueries({ queryKey: ["product_variants"] }),
        data?.product_id
          ? qc.invalidateQueries({ queryKey: ["product", data.product_id] })
          : Promise.resolve(),
      ]);
    },

    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to decrease stock");
    },
  });
}
