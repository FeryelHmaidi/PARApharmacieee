"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCartStore, type CartItem } from "@/hooks/useCartStore";

const buildSizeLabel = (variant?: {
  size_value?: number | null;
  size_unit?: string | null;
}) => {
  if (!variant) return "Standard";
  if (variant.size_value && variant.size_unit) {
    return `${variant.size_value}${variant.size_unit}`;
  }
  return variant.size_unit ?? "Standard";
};

export function CartOwnerSync() {
  const supabase = useMemo(() => createClient(), []);
  const setOwner = useCartStore((state) => state.setOwner);
  const replaceCart = useCartStore((state) => state.replaceCart);
  const setSessionId = useCartStore((state) => state.setSessionId);
  const ownerId = useCartStore((state) => state.ownerId);
  const sessionId = useCartStore((state) => state.sessionId);
  const items = useCartStore((state) => state.items);

  const hydratingRef = useRef(false);

  const fetchServerCart = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("cart_sessions")
        .select(
          `
            id,
            cart_session_items (
              product_id,
              variant_id,
              quantity,
              unit_price
            )
          `
        )
        .eq("user_id", userId)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { sessionId: null, items: [] as CartItem[] };

      const rawItems = (data.cart_session_items ?? []) as Array<{
        product_id: string;
        variant_id: string | null;
        quantity: number;
        unit_price: number;
      }>;

      const productIds = Array.from(
        new Set(rawItems.map((item) => item.product_id).filter(Boolean))
      );
      const variantIds = Array.from(
        new Set(
          rawItems
            .map((item) => item.variant_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      const emptyResult = () => ({ data: [] as any[] });
      const [{ data: products }, { data: variants }] = await Promise.all([
        productIds.length
          ? supabase.from("products").select("id, name").in("id", productIds)
          : Promise.resolve(emptyResult()),
        variantIds.length
          ? supabase
              .from("product_variants")
              .select("id, size_value, size_unit")
              .in("id", variantIds)
          : Promise.resolve(emptyResult()),
      ]);

      const productMap = new Map(
        (products ?? []).map((product) => [product.id, product])
      );
      const variantMap = new Map(
        (variants ?? []).map((variant) => [variant.id, variant])
      );

      const normalizedItems: CartItem[] = rawItems.map((item) => {
        const fallbackVariantId = item.product_id;
        const variantId = item.variant_id ?? fallbackVariantId;
        const variant = item.variant_id
          ? variantMap.get(item.variant_id)
          : undefined;
        return {
          id: variantId,
          productId: item.product_id,
          variantId,
          title: productMap.get(item.product_id)?.name ?? "Produit",
          sizeLabel: buildSizeLabel(variant ?? undefined),
          unitPrice: item.unit_price,
          quantity: item.quantity,
          image: null,
          unit: variant?.size_unit ?? null,
        } satisfies CartItem;
      });

      return { sessionId: data.id as string, items: normalizedItems };
    },
    [supabase]
  );

  const ensureSession = useCallback(async () => {
    if (!ownerId) return null;
    if (sessionId) return sessionId;
    const { data, error } = await supabase
      .from("cart_sessions")
      .insert({
        user_id: ownerId,
        status: "active",
        currency: "TND",
        subtotal: 0,
      })
      .select("id")
      .single();

    if (error) throw error;
    setSessionId(data?.id ?? null);
    return data?.id ?? null;
  }, [ownerId, sessionId, setSessionId, supabase]);

  useEffect(() => {
    let isMounted = true;

    const handleAuthChange = async (nextUserId: string | null) => {
      if (!isMounted) return;
      setOwner(nextUserId);
      if (nextUserId) {
        try {
          const serverCart = await fetchServerCart(nextUserId);
          hydratingRef.current = true;
          replaceCart(serverCart.items, serverCart.sessionId);
          setSessionId(serverCart.sessionId);
        } catch (error) {
          console.error("Failed to hydrate cart", error);
          hydratingRef.current = true;
          replaceCart([], null);
          setSessionId(null);
        }
      } else {
        replaceCart([], null);
        setSessionId(null);
      }
    };

    const syncInitial = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id ?? null;
      handleAuthChange(userId);
    };

    syncInitial();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleAuthChange(session?.user?.id ?? null);
      }
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [fetchServerCart, replaceCart, setOwner, setSessionId, supabase]);

  useEffect(() => {
    if (!ownerId) return;
    if (hydratingRef.current) {
      hydratingRef.current = false;
      return;
    }
    if (!items.length && !sessionId) {
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const targetSessionId = await ensureSession();
        if (!targetSessionId) return;
        const subtotal = items.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0
        );

        const { error: sessionError } = await supabase
          .from("cart_sessions")
          .update({
            subtotal,
            status: "active",
          })
          .eq("id", targetSessionId);
        if (sessionError) throw sessionError;

        const { error: deleteError } = await supabase
          .from("cart_session_items")
          .delete()
          .eq("session_id", targetSessionId);
        if (deleteError) throw deleteError;

        if (items.length) {
          const payload = items.map((item) => ({
            session_id: targetSessionId,
            product_id: item.productId,
            variant_id:
              item.variantId === item.productId ? null : item.variantId,
            quantity: item.quantity,
            unit_price: item.unitPrice,
          }));

          const { error: insertError } = await supabase
            .from("cart_session_items")
            .insert(payload);
          if (insertError) throw insertError;
        }
      } catch (error) {
        console.error("Failed to sync cart", error);
      }
    }, 400);

    return () => {
      clearTimeout(timeout);
    };
  }, [ensureSession, items, ownerId, sessionId, supabase]);

  return null;
}
