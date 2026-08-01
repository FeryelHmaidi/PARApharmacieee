"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import type { Database } from "@/types/supabase";

type ProductStatus = Database["public"]["Enums"]["product_status"];

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const supabase = createClientComponentClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // soft-delete: set status to inactive and stock to 0 (optional)
      const inactiveStatus: ProductStatus = "inactive";
      const { error } = await supabase
        .from("products")
        .update({ status: inactiveStatus })
        .eq("id", id);

      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: async () => {
      toast.success("Product removed");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["product"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-inventory"] }),
      ]);
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to delete product");
    },
  });
}
