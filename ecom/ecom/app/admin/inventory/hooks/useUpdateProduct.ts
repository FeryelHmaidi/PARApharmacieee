"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import type { Database } from "@/types/supabase";

type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export type UpdateProductPayload = {
  id: string;
} & Partial<Omit<ProductUpdate, "id">>;

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const supabase = createClientComponentClient();

  return useMutation({
    mutationFn: async (payload: UpdateProductPayload) => {
      const { id, ...patch } = payload;
      const updates = Object.entries(patch).reduce<Record<string, any>>(
        (acc, [key, value]) => {
          if (value !== undefined) acc[key] = value;
          return acc;
        },
        {}
      );

      if (!Object.keys(updates).length) {
        throw new Error("No fields to update");
      }
      const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: async () => {
      toast.success("Product updated");
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to update product");
    },
  });
}
