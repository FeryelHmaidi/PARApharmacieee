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
};

const statusLabels: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  processing: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  returned: "Retournée",
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
              const statusLabel = statusLabels[statusKey] ?? "En attente";
              const paymentLabel =
                order.payment_method === "online"
                  ? "En ligne"
                  : "À la livraison";
              const orderItems = order.order_items ?? [];
              const totalDisplay = Number(order.total_amount ?? 0).toFixed(2).replace('.', ',');

              return (
                <div
                  key={order.id}
                  className="bg-white border rounded-2xl p-6 space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-500">
                        Commande #{order.id.slice(0, 8)}
                      </p>
                      <p className="font-semibold">
                        {order.created_at
                          ? dateFormatter.format(new Date(order.created_at))
                          : "Date inconnue"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                      <span className="px-3 py-1 rounded-full text-sm bg-gray-100">
                        {statusLabel}
                      </span>
                      <span className="text-sm text-gray-500">
                        Paiement : {paymentLabel}
                      </span>
                      <span className="font-semibold">
                        Total : {totalDisplay} Dt
                      </span>
                    </div>
                  </div>

                  {orderItems.length > 0 && (
                    <div className="border rounded-xl divide-y">
                      {orderItems.map((item) => {
                        const productName = item.products?.name ?? "Produit inconnu";
                        const productPhoto = item.products?.product_photos?.[0]?.url ?? "/fallback-image.jpg";
                        // Construct public URL if necessary, or assume it's already public
                        const photoUrl = productPhoto.startsWith("http") 
                          ? productPhoto 
                          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-photos/${productPhoto.replace(/^\/+/, "")}`;

                        return (
                          <div
                            key={item.id}
                            className="p-4 flex items-center gap-4 text-sm"
                          >
                            <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 shrink-0">
                              <img src={photoUrl} alt={productName} className="w-full h-full object-cover" />
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
                              {(item.price_at_purchase * item.quantity).toFixed(2).replace('.', ',')} Dt
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
