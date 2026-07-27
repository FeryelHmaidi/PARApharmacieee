"use client";

import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { TypedSupabaseClient } from "@/lib/supabase/types";
import type { OrderFormValues, OrderStatus } from "../types";

const useSupabaseClient = () =>
  useMemo(() => createClient() as unknown as TypedSupabaseClient, []);

const calculateItemsTotal = (items: OrderFormValues["items"]) =>
  (items ?? []).reduce(
    (sum, item) =>
      sum + Math.max(0, item.quantity) * Math.max(0, item.unitPrice),
    0
  );

const mapFormToDatabase = (values: OrderFormValues) => {
  const paymentStatus =
    values.status === "delivered" ? "paid" : values.paymentStatus ?? null;
  const itemsSubtotal = calculateItemsTotal(values.items ?? []);
  const totalAmount =
    itemsSubtotal > 0 ? itemsSubtotal : Number(values.totalAmount) || 0;

  return {
    user_id: values.userId ?? null,
    shipping_address: values.address,
    shipping_city: values.city,
    shipping_phone: values.phone,
    total_amount: totalAmount,
    currency: values.currency,
    payment_method: values.paymentMethod ?? null,
    payment_status: paymentStatus,
    status: values.status,
    notes: values.notes ?? null,
    guest_info: {
      full_name: values.customerName,
      postal_code: values.postalCode,
    },
  };
};

export const useUpsertOrder = () => {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  const buildOrderItemsPayload = (
    orderId: string,
    items: OrderFormValues["items"]
  ) => {
    const sanitized = (items ?? []).filter(
      (item) => item.productId && item.quantity > 0 && item.unitPrice >= 0
    );

    if (!sanitized.length) {
      throw new Error("An order must contain at least one product");
    }

    return sanitized.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      variant_id: item.variantId,
      quantity: item.quantity,
      price_at_purchase: item.unitPrice,
    }));
  };

  const syncOrderItems = async (
    orderId: string,
    items: OrderFormValues["items"]
  ) => {
    const payload = buildOrderItemsPayload(orderId, items);

    const { error: deleteError } = await (supabase.from("order_items") as any)
      .delete()
      .eq("order_id", orderId);
    if (deleteError) throw new Error(deleteError.message);

    const { error: insertError } = await (
      supabase.from("order_items") as any
    ).insert(payload);
    if (insertError) throw new Error(insertError.message);
  };

  return useMutation({
    mutationFn: async (values: OrderFormValues) => {
      const payload = mapFormToDatabase(values);
      const items = values.items ?? [];
      let orderId: string;

      if (values.id) {
        const { data, error } = await (supabase.from("orders") as any)
          .update(payload)
          .eq("id", values.id)
          .limit(1)
          .select("id")
          .maybeSingle();

        if (error) throw new Error(error.message);
        if (!data) throw new Error("Order not found");
        orderId = data.id;
      } else {
        const { data, error } = await (supabase.from("orders") as any)
          .insert(payload)
          .select("id")
          .maybeSingle();

        if (error) throw new Error(error.message);
        if (!data?.id) throw new Error("Unable to create order");
        orderId = data.id;
      }

      await syncOrderItems(orderId, items);
      return { id: orderId };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => {
      const updatePayload =
        status === "delivered"
          ? { status, payment_status: "paid" }
          : { status };

      const { data, error } = await (supabase.from("orders") as any)
        .update(updatePayload)
        .eq("id", orderId)
        .limit(1)
        .select("id, status")
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("Order not found");
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });
};

export const useCancelOrder = () => {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      notes,
    }: {
      orderId: string;
      notes?: string;
    }) => {
      const { data, error } = await (supabase.from("orders") as any)
        .update({ status: "cancelled", notes: notes ?? null })
        .eq("id", orderId)
        .limit(1)
        .select("id, status, notes")
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("Order not found");
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });
};
