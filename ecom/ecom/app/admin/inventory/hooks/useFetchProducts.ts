"use client";

import { useQuery } from "@tanstack/react-query";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/supabase";
import type {
  ProductWithRelations,
  VariantRow,
  PhotoRow,
  TagRow,
} from "../types";

type ProductQueryResult = ProductWithRelations;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PRODUCT_PHOTO_BUCKET = "product-photos";

const toPublicPhotoUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!SUPABASE_URL) return null;
  const sanitizedPath = url.replace(/^\/+/, "");
  return `${SUPABASE_URL}/storage/v1/object/public/${PRODUCT_PHOTO_BUCKET}/${sanitizedPath}`;
};

const normalizePhotos = (photos: PhotoRow[]): PhotoRow[] =>
  photos.map((photo) => {
    const publicUrl = toPublicPhotoUrl(photo.url);
    return publicUrl ? { ...photo, url: publicUrl } : photo;
  });

const pickPrimaryPhoto = (photos: PhotoRow[]): string | null => {
  if (!photos.length) return null;
  const sorted = [...photos].sort((a, b) => {
    const posA = a.position ?? Number.POSITIVE_INFINITY;
    const posB = b.position ?? Number.POSITIVE_INFINITY;
    return posA - posB;
  });
  return sorted[0]?.url ?? null;
};

const computeMinPrice = (variants: VariantRow[]): number | null => {
  if (!variants.length) return null;
  const prices = variants
    .map((v) => v.price)
    .filter((price) => typeof price === "number");
  if (!prices.length) return null;
  return Math.min(...prices);
};

const computeCurrency = (variants: VariantRow[]): string | null => {
  const withCurrency = variants.find((v) => v.currency);
  return withCurrency?.currency ?? null;
};

const computeTotalStock = (variants: VariantRow[]): number =>
  variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0);

const computeNearestExpiry = (variants: VariantRow[]): string | null => {
  const validVariants = variants
    .filter(
      (v) => !!v.expiry_date && !isNaN(new Date(v.expiry_date).getTime())
    )
    .sort(
      (a, b) =>
        new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime()
    );

  if (!validVariants.length) return null;
  return validVariants[0].expiry_date ?? null;
};

export const useFetchProducts = () => {
  const supabase = createClientComponentClient<Database>();

  return useQuery({
    queryKey: ["products"],
    queryFn: async (): Promise<ProductQueryResult[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(
          `*,
           product_variants (*),
           product_photos (*),
           product_tags (
             tags (*)
           )
          `
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      return (data ?? []).map((record) => {
        const {
          product_variants = [],
          product_photos = [],
          product_tags = [],
          ...productFields
        } = record as Database["public"]["Tables"]["products"]["Row"] & {
          product_variants: VariantRow[];
          product_photos: PhotoRow[];
          product_tags?: { tags?: TagRow | null }[];
        };

        const variants = product_variants ?? [];
        const photos = normalizePhotos(product_photos ?? []);
        const tags = (product_tags ?? [])
          .map((relation) => relation?.tags)
          .filter((tag): tag is TagRow => Boolean(tag));

        const minPrice = computeMinPrice(variants);
        const currency = computeCurrency(variants);
        const totalStock = computeTotalStock(variants);
        const nearestExpiry = computeNearestExpiry(variants);

        return {
          ...productFields,
          variants,
          photos,
          tags,
          primary_photo: pickPrimaryPhoto(photos),
          min_price: minPrice,
          currency,
          total_stock: totalStock,
          nearest_expiry: nearestExpiry,
          discounted_price: null,
        } satisfies ProductWithRelations;
      });
    },
    refetchOnWindowFocus: false,
  });
};
