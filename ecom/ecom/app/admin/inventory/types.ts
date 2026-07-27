import type { Database } from "@/types/supabase";

export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type VariantRow =
  Database["public"]["Tables"]["product_variants"]["Row"];
export type PhotoRow = Database["public"]["Tables"]["product_photos"]["Row"];
export type TagRow = Database["public"]["Tables"]["tags"]["Row"];
export type DiscountRow = Database["public"]["Tables"]["discounts"]["Row"];
export type DiscountTargetRow =
  Database["public"]["Tables"]["discount_targets"]["Row"];

export type ProductWithRelations = ProductRow & {
  variants: VariantRow[];
  photos: PhotoRow[];
  tags?: TagRow[];
  primary_photo?: string | null;
  min_price?: number | null;
  currency?: string | null;
  discounted_price?: number | null;
  total_stock?: number | null;
  nearest_expiry?: string | null;
};

export type VariantWithProduct = VariantRow & {
  product?: ProductRow;
};
