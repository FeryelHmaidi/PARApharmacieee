"use client";

import { useQuery } from "@tanstack/react-query";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { AdminOrder, OrderStatus } from "../types";

export type OrderHistoryItem = {
  id: string;
  order_id: string;
  action: string;
  old_status?: string | null;
  new_status?: string | null;
  details?: string | null;
  created_at: string;
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  tentative: "Tentative (Sans réponse)",
  confirmed: "Confirmé",
  processing: "Téléchargé",
  shipped: "Emballé / Expédié",
  delivered: "Livré",
  cancelled: "Annulé",
  returned: "Retourné",
  retour_recu: "Retour Reçu ✅",
};

export function formatStatusName(status?: string | null): string {
  if (!status) return "—";
  return STATUS_LABELS[status] || status;
}

/**
 * Extracts the exact physical reception date for a returned order
 */
export function getOrderReceptionDate(order: AdminOrder): Date | null {
  if (order.status !== "retour_recu") return null;

  // 1. Try parsing explicit [RETOUR_RECU: ISO] tag in notes
  if (order.notes) {
    const match = order.notes.match(/\[RETOUR_RECU:\s*([^\]]+)\]/);
    if (match && match[1]) {
      const parsed = new Date(match[1].trim());
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  // 2. Fallback to order updated_at
  if (order.updated_at) {
    const parsed = new Date(order.updated_at);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // 3. Fallback to created_at
  if (order.created_at) {
    const parsed = new Date(order.created_at);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

/**
 * Records an order history event into Supabase table `order_history`.
 * If the table does not exist or fails, it gracefully handles it.
 */
export async function recordOrderHistory(
  supabase: any,
  params: {
    orderId: string;
    action: string;
    oldStatus?: string | null;
    newStatus?: string | null;
    details?: string | null;
  }
): Promise<void> {
  try {
    const nowIso = new Date().toISOString();
    await (supabase.from("order_history") as any).insert({
      order_id: params.orderId,
      action: params.action,
      old_status: params.oldStatus ?? null,
      new_status: params.newStatus ?? null,
      details: params.details ?? null,
      created_at: nowIso,
    });
  } catch (err) {
    // Non-blocking error if table is not created yet
    console.warn("recordOrderHistory warning:", err);
  }
}

/**
 * Hook to fetch full modification history of an order.
 * Blends Supabase order_history table entries with synthesized timeline events.
 */
export function useOrderHistory(order?: AdminOrder | null) {
  const supabase = createClientComponentClient();
  const orderId = order?.id;

  return useQuery<OrderHistoryItem[]>({
    queryKey: ["order-history", orderId],
    enabled: Boolean(orderId),
    queryFn: async () => {
      if (!orderId) return [];

      let dbItems: OrderHistoryItem[] = [];

      try {
        const { data, error } = await (supabase.from("order_history") as any)
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          dbItems = data;
        }
      } catch {
        // Table might not exist yet
      }

      // If we don't have DB entries or want complementary timeline items:
      const synthesized: OrderHistoryItem[] = [];

      // Check if order was marked as retour_recu
      if (order?.status === "retour_recu") {
        const recDate = getOrderReceptionDate(order);
        const hasRetourRecuDb = dbItems.some(
          (it) => it.action === "RETOUR_RECU" || it.new_status === "retour_recu"
        );
        if (!hasRetourRecuDb && recDate) {
          synthesized.push({
            id: `synth-retour-${order.id}`,
            order_id: order.id,
            action: "RETOUR_RECU",
            old_status: "returned",
            new_status: "retour_recu",
            details: "Colis retourné réceptionné en main propre par l'administrateur. Stock restauré automatiquement.",
            created_at: recDate.toISOString(),
          });
        }
      }

      // Check current status if different from pending
      if (order?.status && order.status !== "pending") {
        const hasStatusInDb = dbItems.some(
          (it) => it.new_status === order.status
        );
        if (!hasStatusInDb && order.updated_at) {
          synthesized.push({
            id: `synth-status-${order.id}`,
            order_id: order.id,
            action: "STATUT_CHANGE",
            old_status: null,
            new_status: order.status,
            details: `Statut actuel : ${formatStatusName(order.status)}${
              order.delivery_company ? ` (Transporteur : ${order.delivery_company})` : ""
            }`,
            created_at: order.updated_at,
          });
        }
      }

      // Tracking number record
      if ((order as any)?.tracking_number) {
        const hasTrackingInDb = dbItems.some((it) =>
          it.details?.includes((order as any).tracking_number)
        );
        if (!hasTrackingInDb && order?.updated_at) {
          synthesized.push({
            id: `synth-tracking-${order.id}`,
            order_id: order.id,
            action: "TRACKING_UPDATE",
            details: `Numéro de suivi enregistré : ${(order as any).tracking_number}`,
            created_at: order.updated_at,
          });
        }
      }

      // Initial creation event
      if (order?.created_at) {
        const hasCreationInDb = dbItems.some(
          (it) => it.action === "CREATION"
        );
        if (!hasCreationInDb) {
          synthesized.push({
            id: `synth-created-${order.id}`,
            order_id: order.id,
            action: "CREATION",
            new_status: "pending",
            details: `Commande créée avec ${
              order.order_items?.length || 0
            } article(s) pour un montant total de ${order.total_amount ?? 0} ${
              order.currency ?? "TND"
            }.`,
            created_at: order.created_at,
          });
        }
      }

      // Combine and sort by date descending
      const allItems = [...dbItems, ...synthesized];
      allItems.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return allItems;
    },
  });
}
