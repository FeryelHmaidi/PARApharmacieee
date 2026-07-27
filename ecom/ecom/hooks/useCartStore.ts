"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  id: string; // variant-based identifier
  productId: string;
  variantId: string;
  title: string;
  sizeLabel: string;
  unitPrice: number;
  quantity: number;
  image?: string | null;
  unit?: string | null;
};

export type CartTotals = {
  itemCount: number;
  subtotal: number;
};

type CartState = {
  ownerId: string | null;
  sessionId: string | null;
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  replaceCart: (items: CartItem[], sessionId?: string | null) => void;
  setOwner: (ownerId: string | null) => void;
  setSessionId: (sessionId: string | null) => void;
};

const STORAGE_KEY = "ecom-cart";

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      ownerId: null,
      sessionId: null,
      items: [],
      addItem: (incoming) =>
        set((state) => {
          const id = incoming.variantId;
          const existing = state.items.find((item) => item.id === id);

          if (existing) {
            return {
              items: state.items.map((item) =>
                item.id === id
                  ? { ...item, quantity: item.quantity + incoming.quantity }
                  : item
              ),
            };
          }

          return {
            items: [
              ...state.items,
              {
                ...incoming,
                id,
              },
            ],
          };
        }),
      updateQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === variantId ? { ...item, quantity } : item
          ),
        })),
      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== variantId),
        })),
      clearCart: () =>
        set((state) => ({
          items: [],
          ownerId: state.ownerId,
          sessionId: state.sessionId,
        })),
      replaceCart: (items, sessionId) =>
        set((state) => ({
          items,
          sessionId: sessionId ?? state.sessionId,
        })),
      setOwner: (ownerId) =>
        set((state) => ({
          ownerId,
          sessionId:
            ownerId && ownerId === state.ownerId ? state.sessionId : null,
        })),
      setSessionId: (sessionId) => set(() => ({ sessionId })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const selectCartTotals = (items: CartItem[]): CartTotals => {
  return items.reduce(
    (acc, item) => {
      acc.itemCount += item.quantity;
      acc.subtotal += item.quantity * item.unitPrice;
      return acc;
    },
    { itemCount: 0, subtotal: 0 }
  );
};
