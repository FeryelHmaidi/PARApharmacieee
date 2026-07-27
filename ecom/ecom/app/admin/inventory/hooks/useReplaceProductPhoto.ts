"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";

const PRODUCT_PHOTO_BUCKET = "product-photos";

type ReplacePhotoPayload = {
  productId: string;
  file: File;
};

type ReplacePhotoResult = {
  productId: string;
  publicUrl: string;
};

export function useReplaceProductPhoto() {
  const supabase = createClientComponentClient();
  const queryClient = useQueryClient();

  return useMutation<ReplacePhotoResult, Error, ReplacePhotoPayload>({
    mutationFn: async ({ productId, file }) => {
      if (!productId) throw new Error("Product id is required");
      if (!file) throw new Error("Select an image to upload");

      const sanitizedName = file.name.replace(/\s+/g, "-");
      const path = `${productId}/${Date.now()}-${sanitizedName}`;

      const { error: uploadErr } = await supabase.storage
        .from(PRODUCT_PHOTO_BUCKET)
        .upload(path, file, { upsert: false });

      if (uploadErr) throw new Error(uploadErr.message);

      const publicUrlResp = await supabase.storage
        .from(PRODUCT_PHOTO_BUCKET)
        .getPublicUrl(path);

      const publicUrl = publicUrlResp?.data?.publicUrl;
      if (!publicUrl) {
        throw new Error("Could not determine public URL for uploaded image");
      }

      const { error: insertErr } = await supabase
        .from("product_photos")
        .insert({
          product_id: productId,
          url: publicUrl,
          position: 0,
        });

      if (insertErr) throw new Error(insertErr.message);

      return { productId, publicUrl };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product photo updated");
    },
    onError: (err) => {
      toast.error(err?.message ?? "Failed to update product photo");
    },
  });
}
