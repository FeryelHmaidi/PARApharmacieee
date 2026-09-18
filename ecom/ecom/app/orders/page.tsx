"use client";

import { useEffect, useMemo, useState } from "react";
import type { Database } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { TypedSupabaseClient } from "@/lib/supabase/types";
import { AccountPageHeader } from "@/components/account-page-header";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"] & {
  products?: {
    name: string;
    product_photos?: { url: string }[];
  } | null;
};

type OrderWithItems = OrderRow & {
  order_items: OrderItemRow[] | null;
  tracking_number?: string | null;
};

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: "En attente", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  tentative: { label: "En attente", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  confirmed: { label: "Confirmée", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  processing: { label: "En préparation", color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" },
  shipped: { label: "Expédiée", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  delivered: { label: "Livrée", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  cancelled: { label: "Annulée", color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200" },
  returned: { label: "Retournée", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
};

const OrdersPage = () => {
  const supabase = useMemo(
    () => createClient() as unknown as TypedSupabaseClient,
    []
  );
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const ordersSubtitle = userId
    ? orders.length
      ? `${orders.length} commande${orders.length > 1 ? "s" : ""} suivie${
          orders.length > 1 ? "s" : ""
        } en temps réel.`
      : "Passez votre première commande pour remplir votre historique."
    : "Connectez-vous pour retrouver vos achats et leur statut.";

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const user = sessionData.session?.user;

        if (!user) {
          setUserId(null);
          setOrders([]);
          return;
        }

        setUserId(user.id);

        const { data, error } = await supabase
          .from("orders")
          .select("*, order_items (*, products (name, product_photos (url)))")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setOrders(data as OrderWithItems[]);
        }
      } catch (error) {
        console.error("Impossible de récupérer les commandes", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [supabase]);

  const renderContent = () => {
    if (!userId && !loading) {
      return (
        <main className="mx-auto w-[85%] flex min-h-[60vh] flex-col gap-6 py-16">
          <div className="bg-white border rounded-2xl p-10 text-center shadow-sm">
            <h2 className="text-2xl font-semibold mb-4">
              Connectez-vous pour voir vos commandes
            </h2>
            <Button asChild>
              <Link href="/auth/login">Se connecter</Link>
            </Button>
          </div>
        </main>
      );
    }

    if (loading) {
      return (
        <main className="mx-auto w-[85%] flex min-h-[60vh] flex-col gap-6 py-16">
          <div className="bg-white border rounded-2xl p-10 text-center text-gray-500">
            Chargement de vos commandes…
          </div>
        </main>
      );
    }

    return (
      <main className="mx-auto w-[85%] flex min-h-screen flex-col gap-6 py-16">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Historique des commandes</h1>
          <Button asChild variant="outline">
            <Link href="/products">Continuer les achats</Link>
          </Button>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white border rounded-2xl p-10 text-center text-gray-500">
            Aucune commande pour le moment.
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusKey = order.status ?? "pending";
              const status = statusConfig[statusKey] ?? statusConfig.pending;
              const paymentLabel =
                order.payment_method === "online"
                  ? "En ligne"
                  : "À la livraison";
              const orderItems = order.order_items ?? [];
              const totalDisplay = Number(order.total_amount ?? 0)
                .toFixed(2)
                .replace(".", ",");
              const trackingNumber = (order as any).tracking_number as string | null | undefined;

              return (
                <div
                  key={order.id}
                  className="bg-white border rounded-2xl p-6 space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-500">
                        Commande #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="font-semibold">
                        {order.created_at
                          ? dateFormatter.format(new Date(order.created_at))
                          : "Date inconnue"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium border ${status.bg} ${status.color} ${status.border}`}
                      >
                        {status.label}
                      </span>
                      <span className="text-sm text-gray-500">
                        Paiement : {paymentLabel}
                      </span>
                      <div className="flex flex-col text-right">
                        <span className="font-semibold">
                          Total : {totalDisplay} Dt
                        </span>
                        {order.shipping_fee !== null ? (
                          <span className="text-xs text-gray-500">
                            (inclut{" "}
                            {Number(order.shipping_fee)
                              .toFixed(2)
                              .replace(".", ",")}{" "}
                            Dt de livraison)
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 italic">
                            (Frais de livraison à déterminer)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tracking number section */}
                  {trackingNumber && (
                    <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-0.5">
                          📦 Numéro de suivi
                        </p>
                        <p className="text-sm font-bold text-blue-900 font-mono">{trackingNumber}</p>
                      </div>
                      <a
                        href={`https://my.bigbossexpress.tn/track/${trackingNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                      >
                        Suivre mon colis →
                      </a>
                    </div>
                  )}

                  {orderItems.length > 0 && (
                    <div className="border rounded-xl divide-y">
                      {orderItems.map((item) => {
                        const productName =
                          item.products?.name ?? "Produit inconnu";
                        const productPhoto =
                          item.products?.product_photos?.[0]?.url ??
                          "/fallback-image.jpg";
                        const photoUrl = productPhoto.startsWith("http")
                          ? productPhoto
                          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-photos/${productPhoto.replace(/^\/+/, "")}`;

                        return (
                          <div
                            key={item.id}
                            className="p-4 flex items-center gap-4 text-sm"
                          >
                            <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 shrink-0">
                              <img
                                src={photoUrl}
                                alt={productName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 line-clamp-1">
                                {productName}
                              </p>
                              <p className="text-gray-500">
                                Quantité : {item.quantity}
                              </p>
                            </div>
                            <div className="font-bold text-right shrink-0">
                              {(item.price_at_purchase * item.quantity)
                                .toFixed(2)
                                .replace(".", ",")}{" "}
                              Dt
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    );
  };

  return (
    <>
      <AccountPageHeader
        title="Mes commandes"
        subtitle={ordersSubtitle}
        activePath="/orders"
        actions={[]}
      />
      {renderContent()}
    </>
  );
};

export default OrdersPage;
