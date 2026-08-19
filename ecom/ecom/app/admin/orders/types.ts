import type { PublicDatabase } from "@/lib/supabase/types";

export type OrderRow = PublicDatabase["public"]["Tables"]["orders"]["Row"];
export type OrderInsert =
  PublicDatabase["public"]["Tables"]["orders"]["Insert"];
export type OrderUpdate =
  PublicDatabase["public"]["Tables"]["orders"]["Update"];
export type OrderItemRow =
  PublicDatabase["public"]["Tables"]["order_items"]["Row"];
export type ProfileRow = PublicDatabase["public"]["Tables"]["profiles"]["Row"];
export type OrderStatus = PublicDatabase["public"]["Enums"]["order_status"];

export type OrderGuestInfo = {
  full_name?: string;
  postal_code?: string;
  email?: string;
  notes?: string;
};

export type AdminOrder = OrderRow & {
  order_items: OrderItemRow[];
  customer_profile?: Pick<
    ProfileRow,
    "id" | "full_name" | "email" | "phone"
  > | null;
};

export type OrderItemInput = {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantLabel?: string | null;
  unitPrice: number;
  quantity: number;
};

export type OrderFormValues = {
  id?: string;
  userId?: string | null;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  status: OrderStatus;
  paymentStatus: OrderRow["payment_status"];
  paymentMethod: OrderRow["payment_method"];
  totalAmount: number;
  currency: NonNullable<OrderRow["currency"]>;
  deliveryCompany?: string | null;
  notes?: string;
  items: OrderItemInput[];
};
