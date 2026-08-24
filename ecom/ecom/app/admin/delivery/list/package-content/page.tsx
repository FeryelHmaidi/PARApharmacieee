"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import { Package, Printer, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

type OrderItem = {
  quantity: number;
  product_name: string;
};

type OrderInfo = {
  id: string;
  created_at: string;
  total_amount: number;
  delivery_company: string | null;
  status: string;
  guest_info: any;
  items_count: number;
  items: OrderItem[];
};

export default function PackageContentPage() {
  const [orders, setOrders] = useState<OrderInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          total_amount,
          delivery_company,
          status,
          guest_info,
          order_items (
            quantity,
            product:products(name)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        toast.error("Erreur de chargement: " + error.message);
      } else {
        const processedOrders = (data || []).map((order: any) => {
          const itemsCount = (order.order_items || []).reduce(
            (sum: number, item: any) => sum + (item.quantity || 1), 
            0
          );
          
          const items: OrderItem[] = (order.order_items || []).map((item: any) => ({
            quantity: item.quantity || 1,
            product_name: item.product?.name || "Produit inconnu",
          }));
          
          return {
            id: order.id,
            created_at: order.created_at,
            total_amount: order.total_amount,
            delivery_company: order.delivery_company,
            status: order.status,
            guest_info: order.guest_info,
            items_count: itemsCount,
            items,
          };
        });
        
        setOrders(processedOrders);
      }
      setIsLoading(false);
    };

    fetchOrders();
  }, [supabase]);

  const handlePrint = (orderId: string) => {
    window.open(`/admin/delivery/list/package-content/print/${orderId}`, '_blank');
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden p-4 md:p-8">
      <section className="w-full flex flex-col gap-6 justify-start max-w-6xl mx-auto">
        <div className="flex flex-col items-start w-full gap-4">
          <h1 className="text-2xl md:text-3xl font-medium text-yellow-800">
            <Package className="inline mb-1 mr-2 size-7 md:size-8" strokeWidth={2.2} />
            Contenu des colis (Bordereaux)
          </h1>
          <p className="text-gray-600">
            Consultez la valeur et la quantité des articles pour préparer vos expéditions.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="text-center text-gray-500 py-12">Chargement des commandes...</div>
          ) : orders.length === 0 ? (
            <div className="text-center text-gray-500 py-12">Aucune commande récente.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4 font-medium text-gray-700">Commande</th>
                    <th className="p-4 font-medium text-gray-700">Client</th>
                    <th className="p-4 font-medium text-gray-700">Produits commandés</th>
                    <th className="p-4 font-medium text-gray-700">Transporteur</th>
                    <th className="p-4 font-medium text-gray-700 text-right">Valeur Déclarée</th>
                    <th className="p-4 font-medium text-gray-700 text-center w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 align-top">
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{order.id.split('-')[0].toUpperCase()}</div>
                        <div className="text-xs text-gray-500 flex items-center mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4 font-medium">
                        {order.guest_info?.full_name || "Client"}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className="bg-yellow-100 text-yellow-800 font-bold text-xs px-1.5 py-0.5 rounded">
                                x{item.quantity}
                              </span>
                              <span className="text-gray-800">{item.product_name}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {order.delivery_company || "Non assigné"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-bold text-gray-900">
                          {Number(order.total_amount || 0).toFixed(2).replace('.', ',')} DT
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrint(order.id)}
                          className="h-8 border-yellow-200 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-800"
                        >
                          <Printer className="h-4 w-4 mr-1" /> Imprimer
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
