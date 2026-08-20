"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import { Truck, TrendingUp, Package } from "lucide-react";

type DeliveryStats = {
  name: string;
  orderCount: number;
  totalRevenue: number;
};

export default function DeliveryListPage() {
  const [stats, setStats] = useState<DeliveryStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      
      // Fetch all companies to ensure they appear even if they have 0 orders
      const { data: companies, error: companiesError } = await supabase
        .from("delivery_companies")
        .select("name");

      if (companiesError) {
        toast.error("Erreur de chargement: " + companiesError.message);
        setIsLoading(false);
        return;
      }

      // Fetch all orders that have a delivery company assigned
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("delivery_company, total_amount, shipping_fee")
        .not("delivery_company", "is", null)
        .not("delivery_company", "eq", "");

      if (ordersError) {
        toast.error("Erreur de chargement: " + ordersError.message);
        setIsLoading(false);
        return;
      }

      // Calculate stats
      const statsMap = new Map<string, DeliveryStats>();
      
      // Initialize with 0
      companies?.forEach(c => {
        statsMap.set(c.name, { name: c.name, orderCount: 0, totalRevenue: 0 });
      });

      // Aggregate orders
      orders?.forEach(order => {
        const companyName = order.delivery_company as string;
        if (!statsMap.has(companyName)) {
          statsMap.set(companyName, { name: companyName, orderCount: 0, totalRevenue: 0 });
        }
        
        const current = statsMap.get(companyName)!;
        current.orderCount += 1;
        // The total amount usually includes the shipping fee, but we just want the gross total generated
        current.totalRevenue += Number(order.total_amount || 0);
      });

      setStats(Array.from(statsMap.values()).sort((a, b) => b.orderCount - a.orderCount));
      setIsLoading(false);
    };

    fetchStats();
  }, [supabase]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden p-4 md:p-8">
      <section className="w-full flex flex-col gap-6 justify-start max-w-5xl mx-auto">
        <div className="flex flex-col items-start w-full gap-4">
          <h1 className="text-2xl md:text-3xl font-medium text-yellow-800">
            <TrendingUp className="inline mb-1 mr-2 size-7 md:size-8" strokeWidth={2.2} />
            Statistiques de Livraison
          </h1>
          <p className="text-gray-600">
            Suivez les performances et le volume d'affaires généré par chaque transporteur.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center text-gray-500 py-8">Chargement des statistiques...</div>
          ) : stats.length === 0 ? (
            <div className="col-span-full text-center text-gray-500 py-8">Aucune donnée disponible.</div>
          ) : (
            stats.map((stat, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
                <div className="flex items-center gap-3 border-b pb-3">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <Truck className="h-5 w-5 text-yellow-600" />
                  </div>
                  <h3 className="font-semibold text-lg text-gray-800">{stat.name}</h3>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm flex items-center gap-1">
                      <Package className="h-4 w-4" /> Colis expédiés
                    </span>
                    <span className="font-semibold text-gray-900">{stat.orderCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Chiffre d'affaires lié</span>
                    <span className="font-semibold text-gray-900 text-lg">
                      {stat.totalRevenue.toFixed(2).replace('.', ',')} DT
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
