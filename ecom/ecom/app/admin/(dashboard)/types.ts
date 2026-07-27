import type { PublicDatabase } from "@/lib/supabase/types";

export type DashboardOrderRow = Pick<
  PublicDatabase["public"]["Tables"]["orders"]["Row"],
  | "id"
  | "status"
  | "payment_status"
  | "total_amount"
  | "currency"
  | "created_at"
  | "user_id"
  | "shipping_phone"
  | "guest_info"
> & {
  customer_profile?: Pick<
    PublicDatabase["public"]["Tables"]["profiles"]["Row"],
    "id" | "full_name" | "phone"
  > | null;
};

export type DashboardOrderItem = Pick<
  PublicDatabase["public"]["Tables"]["order_items"]["Row"],
  | "id"
  | "order_id"
  | "product_id"
  | "variant_id"
  | "quantity"
  | "price_at_purchase"
> & {
  product?: Pick<
    PublicDatabase["public"]["Tables"]["products"]["Row"],
    "id" | "name" | "sku"
  > | null;
};

export type DashboardOrder = DashboardOrderRow & {
  order_items: DashboardOrderItem[];
};

export type InventoryVariant = Pick<
  PublicDatabase["public"]["Tables"]["product_variants"]["Row"],
  | "id"
  | "stock"
  | "price"
  | "currency"
  | "size_value"
  | "size_unit"
  | "expiry_date"
>;

export type InventoryProduct = Pick<
  PublicDatabase["public"]["Tables"]["products"]["Row"],
  "id" | "name" | "sku" | "best_seller" | "status"
> & {
  variants: InventoryVariant[];
};

export type CartSession = Pick<
  PublicDatabase["public"]["Tables"]["cart_sessions"]["Row"],
  "id" | "user_id" | "status" | "subtotal" | "currency" | "updated_at"
> & {
  items_count: number;
};
