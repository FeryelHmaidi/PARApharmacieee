"use client";

import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { PublicDatabase, TypedSupabaseClient } from "@/lib/supabase/types";
import type { CheckoutPayload } from "../types";

const formatShippingAddress = (form: CheckoutPayload["form"]) =>
  `${form.address}, ${form.postalCode}`;

type OrderInsert = PublicDatabase["public"]["Tables"]["orders"]["Insert"];
type OrderRow = PublicDatabase["public"]["Tables"]["orders"]["Row"];
type OrderItemInsert =
  PublicDatabase["public"]["Tables"]["order_items"]["Insert"];

type CheckoutErrorCode =
  | "AUTH_REQUIRED"
  | "EMPTY_CART"
  | "ORDER_CREATION_FAILED"
  | "ORDER_ITEMS_FAILED";

export class CheckoutError extends Error {
  constructor(public code: CheckoutErrorCode, message?: string) {
    super(message ?? code);
    this.name = "CheckoutError";
  }
}

export const usePlaceOrder = () => {
  const supabase = useMemo(
    () => createClient() as unknown as TypedSupabaseClient,
    []
  );

  return useMutation<string, Error, CheckoutPayload>({
    mutationFn: async ({ items, totals, form, paymentMethod }) => {
      if (!items.length) {
        throw new CheckoutError("EMPTY_CART");
      }

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const user = sessionData.session?.user;

      if (!user) {
        throw new CheckoutError("AUTH_REQUIRED");
      }

      const orderPayload: OrderInsert = {
        user_id: user.id,
        shipping_address: formatShippingAddress(form),
        shipping_city: form.city,
        shipping_phone: form.phone,
        total_amount: totals.subtotal,
        currency: "TND",
        payment_method: paymentMethod,
        payment_status:
          paymentMethod === "online" ? "pending" : "awaiting_payment",
        status: "pending",
        guest_info: {
          full_name: form.fullName,
          postal_code: form.postalCode,
        },
      };

      const { data: rawOrder, error: orderError } = await (
        supabase.from("orders") as any
      )
        .insert(orderPayload)
        .select("id")
        .single();

      const order = rawOrder as Pick<OrderRow, "id"> | null;

      if (orderError || !order) {
        throw new CheckoutError("ORDER_CREATION_FAILED", orderError?.message);
      }

      const orderItems: OrderItemInsert[] = items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        variant_id: item.variantId,
        quantity: item.quantity,
        price_at_purchase: item.unitPrice,
      }));

      const { error: itemsError } = await (
        supabase.from("order_items") as any
      ).insert(orderItems);

      if (itemsError) {
        throw new CheckoutError("ORDER_ITEMS_FAILED", itemsError.message);
      }

      return order.id;
    },
  });
};
