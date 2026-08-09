"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import type { Database } from "@/types/supabase";

type ProductStatus = Database["public"]["Enums"]["product_status"];
type SizeUnit = Database["public"]["Enums"]["size_unit"];
type VariantInsert = Database["public"]["Tables"]["product_variants"]["Insert"];

export type VariantDraft = {
  cost_price?: number | null;
  price: number;
  currency: string;
  stock: number;
  expiry_date?: string | null;
  size_value?: number | null;
  size_unit?: SizeUnit | null;
  active?: boolean | null;
};

export type UploadPayload = {
  name: string;
  sku: string;
  description?: string | null;
  best_seller?: boolean;
  status?: ProductStatus;
  brand?: string | null;
  variants: VariantDraft[];
  photos?: File[];
  tagIds?: string[];
  brandLogo?: File;
};

export function useUploadProduct() {
  const queryClient = useQueryClient();
  const supabase = createClientComponentClient();

  return useMutation({
    mutationFn: async (payload: UploadPayload) => {
      if (!payload.variants?.length) {
        throw new Error("Add at least one variant before saving");
      }

      const files = payload.photos ?? [];
      const uniqueTagIds = Array.from(new Set(payload.tagIds ?? [])).filter(
        Boolean
      );

      // 1) insert base product
      const { data: productData, error: productError } = await supabase
        .from("products")
        .insert({
          name: payload.name,
          sku: payload.sku,
          description: payload.description ?? null,
          best_seller: payload.best_seller ?? false,
          status: payload.status ?? "active",
          brand: payload.brand ?? null,
        })
        .select("id")
        .single();

      if (productError) throw new Error(productError.message);
      const productId = productData.id as string;

      // 2) insert variants for the product
      const variantPayload: VariantInsert[] = payload.variants.map(
        (variant) => ({
          product_id: productId,
          price: variant.price,
          cost_price: variant.cost_price ?? null,
          currency: variant.currency,
          stock: variant.stock,
          expiry_date: variant.expiry_date ?? null,
          size_value: variant.size_value ?? null,
          size_unit: variant.size_unit ?? null,
          active: variant.active ?? true,
        })
      );

      const { error: variantError } = await supabase
        .from("product_variants")
        .insert(variantPayload);

      if (variantError) throw new Error(variantError.message);

      if (uniqueTagIds.length) {
        const { error: tagLinkError } = await supabase
          .from("product_tags")
          .insert(
            uniqueTagIds.map((tagId) => ({
              product_id: productId,
              tag_id: tagId,
            }))
          );

        if (tagLinkError) throw new Error(tagLinkError.message);
      }

      // 3) upload images (if any)
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const fileName = f.name.replace(/\s+/g, "-");
          const path = `${productId}/${Date.now()}-${fileName}`;

          // upload to storage
          const { error: uploadErr } = await supabase.storage
            .from("product-photos")
            .upload(path, f, { upsert: false });

          if (uploadErr) throw new Error(uploadErr.message);

          // get public url (works for public buckets)
          const publicUrlResp = await supabase.storage
            .from("product-photos")
            .getPublicUrl(path);

          const publicUrl = publicUrlResp?.data?.publicUrl;
          if (!publicUrl) {
            // This should not normally happen for public buckets,
            // but protect against unexpected shapes.
            throw new Error("Failed to obtain public URL for uploaded image.");
          }

          // insert photo record
          const { error: photoInsertErr } = await supabase
            .from("product_photos")
            .insert({
              product_id: productId,
              url: publicUrl,
              position: i,
            });

          if (photoInsertErr) throw new Error(photoInsertErr.message);
        }
      }

      // 4) upload brand logo (if any)
      if (payload.brandLogo) {
        const f = payload.brandLogo;
        const fileName = f.name.replace(/\s+/g, "-");
        const path = `${productId}/brand-logo-${Date.now()}-${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from("product-photos")
          .upload(path, f, { upsert: false });

        if (!uploadErr) {
          const publicUrlResp = await supabase.storage
            .from("product-photos")
            .getPublicUrl(path);

          const publicUrl = publicUrlResp?.data?.publicUrl;
          if (publicUrl) {
            await supabase
              .from("products")
              .update({ brand_logo_url: publicUrl })
              .eq("id", productId);
          }
        }
      }

      return productId;
    },
    onSuccess: async (productId) => {
      toast.success("Product created successfully!");
      // invalidate product cache to re-fetch from Supabase (React Query)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["product_variants"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-inventory"] }),
      ]);
    },
    onError: (err: any) => {
      toast.error(`Upload failed: ${err?.message ?? String(err)}`);
    },
  });
}
