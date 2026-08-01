"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import type { Database } from "@/types/supabase";
import type { VariantDraft } from "./useUploadProduct";

const PRODUCT_PHOTO_BUCKET = "product-photos";
type PhotoRowLite = Pick<
  Database["public"]["Tables"]["product_photos"]["Row"],
  "id" | "url"
>;

const extractStoragePath = (value?: string | null): string | null => {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    const match = parsed.pathname.match(
      new RegExp(
        `/storage/v1/object/(?:public|sign)/${PRODUCT_PHOTO_BUCKET}/(.+)`,
        "i"
      )
    );
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // not an absolute URL, treat as relative path
  }

  const cleaned = value.replace(/^\/+/, "");
  if (cleaned.startsWith(`${PRODUCT_PHOTO_BUCKET}/`)) {
    return cleaned.slice(PRODUCT_PHOTO_BUCKET.length + 1);
  }
  return cleaned;
};

type ProductStatus = Database["public"]["Enums"]["product_status"];
type VariantInput = VariantDraft & { id?: string };

type EditProductPayload = {
  productId: string;
  name: string;
  sku: string;
  description?: string | null;
  best_seller?: boolean;
  status?: ProductStatus;
  variants: VariantInput[];
  removedVariantIds: string[];
  newPhotos: File[];
  removedPhotoIds: string[];
  nextPhotoPositionStart: number;
  tagIds: string[];
  previousTagIds: string[];
};

type EditProductResult = { productId: string };

export function useEditProductFull() {
  const supabase = createClientComponentClient();
  const queryClient = useQueryClient();

  return useMutation<EditProductResult, Error, EditProductPayload>({
    mutationFn: async (payload) => {
      const {
        productId,
        name,
        sku,
        description,
        best_seller,
        status,
        variants,
        removedVariantIds,
        newPhotos,
        removedPhotoIds,
        nextPhotoPositionStart,
        tagIds,
        previousTagIds,
      } = payload;

      const { error: productError } = await supabase
        .from("products")
        .update({
          name,
          sku,
          description: description ?? null,
          best_seller: best_seller ?? false,
          status: status ?? "active",
        })
        .eq("id", productId);

      if (productError) throw new Error(productError.message);

      if (variants.length) {
        const upsertPayload = variants.map((variant) => ({
          id: variant.id,
          product_id: productId,
          price: variant.price,
          cost_price: variant.cost_price ?? null,
          currency: variant.currency,
          stock: variant.stock,
          expiry_date: variant.expiry_date ?? null,
          size_value: variant.size_value ?? null,
          size_unit: variant.size_unit ?? null,
          active: variant.active ?? true,
        }));

        const { error: variantError } = await supabase
          .from("product_variants")
          .upsert(upsertPayload);

        if (variantError) throw new Error(variantError.message);
      }

      if (removedVariantIds.length) {
        const { error: deleteVariantError } = await supabase
          .from("product_variants")
          .delete()
          .in("id", removedVariantIds);

        if (deleteVariantError) throw new Error(deleteVariantError.message);
      }

      if (removedPhotoIds.length) {
        const { data: removedRows, error: removedRowsError } = await supabase
          .from("product_photos")
          .select("id, url")
          .in("id", removedPhotoIds);

        if (removedRowsError) throw new Error(removedRowsError.message);

        const photoRows: PhotoRowLite[] = (removedRows ?? []) as PhotoRowLite[];
        const storagePaths = Array.from(
          new Set(
            photoRows
              .map((row) => extractStoragePath(row.url))
              .filter((path): path is string => Boolean(path))
          )
        );

        if (storagePaths.length) {
          const { data: storageData, error: storageDeleteErr } =
            await supabase.storage
              .from(PRODUCT_PHOTO_BUCKET)
              .remove(storagePaths);
          const storageItemError = Array.isArray(storageData)
            ? (storageData as Array<{ error?: string | null }>).find(
                (item) => item && "error" in item && item.error
              )
            : null;
          if (storageItemError && storageItemError.error) {
            throw new Error(String(storageItemError.error));
          }
          if (storageDeleteErr) throw new Error(storageDeleteErr.message);
        }

        const { error: deletePhotosError } = await supabase
          .from("product_photos")
          .delete()
          .in("id", removedPhotoIds);

        if (deletePhotosError) throw new Error(deletePhotosError.message);
      }

      if (newPhotos.length) {
        for (let i = 0; i < newPhotos.length; i += 1) {
          const file = newPhotos[i];
          const sanitizedName = file.name.replace(/\s+/g, "-");
          const path = `${productId}/${Date.now()}-${i}-${sanitizedName}`;

          const { error: uploadErr } = await supabase.storage
            .from(PRODUCT_PHOTO_BUCKET)
            .upload(path, file, { upsert: false });

          if (uploadErr) throw new Error(uploadErr.message);

          const publicUrlResp = await supabase.storage
            .from(PRODUCT_PHOTO_BUCKET)
            .getPublicUrl(path);

          const publicUrl = publicUrlResp?.data?.publicUrl;
          if (!publicUrl) {
            throw new Error("Failed to obtain public URL for uploaded photo");
          }

          const { error: insertPhotoErr } = await supabase
            .from("product_photos")
            .insert({
              product_id: productId,
              url: publicUrl,
              position: nextPhotoPositionStart + i,
            });

          if (insertPhotoErr) throw new Error(insertPhotoErr.message);
        }
      }

      const uniqueNextTagIds = Array.from(new Set(tagIds ?? [])).filter(
        Boolean
      );
      const uniquePrevTagIds = Array.from(new Set(previousTagIds ?? []));

      const tagsToAdd = uniqueNextTagIds.filter(
        (id) => !uniquePrevTagIds.includes(id)
      );
      const tagsToRemove = uniquePrevTagIds.filter(
        (id) => !uniqueNextTagIds.includes(id)
      );

      if (tagsToAdd.length) {
        const { error: addTagError } = await supabase
          .from("product_tags")
          .insert(
            tagsToAdd.map((tagId) => ({
              product_id: productId,
              tag_id: tagId,
            }))
          );
        if (addTagError) throw new Error(addTagError.message);
      }

      if (tagsToRemove.length) {
        const { error: removeTagError } = await supabase
          .from("product_tags")
          .delete()
          .eq("product_id", productId)
          .in("tag_id", tagsToRemove);
        if (removeTagError) throw new Error(removeTagError.message);
      }

      return { productId };
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["product"] }),
        queryClient.invalidateQueries({ queryKey: ["product_variants"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-inventory"] }),
      ]);
      toast.success("Product updated");
    },
    onError: (err) => {
      toast.error(err?.message ?? "Failed to update product");
    },
  });
}
