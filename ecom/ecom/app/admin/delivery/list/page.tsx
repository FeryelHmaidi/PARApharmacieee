"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import { Truck, TrendingUp, Package, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

type OrderDetail = {
  id: string;
  created_at: string;
  total_amount: number;
  shipping_fee: number;
  cost_of_goods: number;
  delivery_cost: number;
  profit: number;
};

type DeliveryStats = {
  name: string;
  orderCount: number;
  totalRevenue: number;
  totalProfit: number;
  orders: OrderDetail[];
};

export default function DeliveryListPage() {
  const [stats, setStats] = useState<DeliveryStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      
      const { data: companies, error: companiesError } = await supabase
        .from("delivery_companies")
        .select("name, delivery_cost");

      if (companiesError) {
        toast.error("Erreur de chargement: " + companiesError.message);
        setIsLoading(false);
        return;
      }

      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          delivery_company,
          total_amount,
          shipping_fee,
          order_items (
            quantity,
            variant:product_variants (
              cost_price
            )
          )
        `)
        .not("delivery_company", "is", null)
        .not("delivery_company", "eq", "");

      if (ordersError) {
        toast.error("Erreur de chargement: " + ordersError.message);
        setIsLoading(false);
        return;
      }

      const statsMap = new Map<string, DeliveryStats>();
      
      companies?.forEach(c => {
        statsMap.set(c.name, { name: c.name, orderCount: 0, totalRevenue: 0, totalProfit: 0, orders: [] });
      });

      orders?.forEach((order: any) => {
        const companyName = order.delivery_company as string;
        if (!statsMap.has(companyName)) {
          statsMap.set(companyName, { name: companyName, orderCount: 0, totalRevenue: 0, totalProfit: 0, orders: [] });
        }
        
        const companyData = companies?.find(c => c.name === companyName);
        const deliveryCost = companyData?.delivery_cost || 0;
        
        // Calculate cost of goods
        let costOfGoods = 0;
        if (order.order_items && Array.isArray(order.order_items)) {
          order.order_items.forEach((item: any) => {
            const variantCost = item.variant?.cost_price || 0;
            costOfGoods += (item.quantity * variantCost);
          });
        }
        
        const totalAmount = Number(order.total_amount || 0);
        const profit = totalAmount - deliveryCost - costOfGoods;
        
        const current = statsMap.get(companyName)!;
        current.orderCount += 1;
        current.totalRevenue += totalAmount;
        current.totalProfit += profit;
        
        current.orders.push({
          id: order.id,
          created_at: order.created_at,
          total_amount: totalAmount,
          shipping_fee: Number(order.shipping_fee || 0),
          cost_of_goods: costOfGoods,
          delivery_cost: deliveryCost,
          profit: profit
        });
      });

      // Sort companies by order count, and sort their internal orders by date (newest first)
      const sortedStats = Array.from(statsMap.values()).sort((a, b) => b.orderCount - a.orderCount);
      sortedStats.forEach(stat => {
        stat.orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      });

      setStats(sortedStats);
      setIsLoading(false);
    };

    fetchStats();
  }, [supabase]);

  const toggleExpand = (companyName: string) => {
    if (expandedCompany === companyName) {
      setExpandedCompany(null);
    } else {
      setExpandedCompany(companyName);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden p-4 md:p-8">
      <section className="w-full flex flex-col gap-6 justify-start max-w-6xl mx-auto">
        <div className="flex flex-col items-start w-full gap-4">
          <h1 className="text-2xl md:text-3xl font-medium text-yellow-800">
            <TrendingUp className="inline mb-1 mr-2 size-7 md:size-8" strokeWidth={2.2} />
            Statistiques de Livraison
          </h1>
          <p className="text-gray-600">
            Suivez les performances et le volume d'affaires généré par chaque transporteur.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">Chargement des statistiques...</div>
          ) : stats.length === 0 ? (
            <div className="text-center text-gray-500 py-8">Aucune donnée disponible.</div>
          ) : (
            stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Header Card (Clickable) */}
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  onClick={() => toggleExpand(stat.name)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-50 rounded-xl">
                      <Truck className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-gray-800">{stat.name}</h3>
                      <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Package className="h-4 w-4" /> {stat.orderCount} Commandes expédiées
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 md:gap-12 w-full md:w-auto">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Chiffre d'affaires</div>
                      <div className="font-bold text-lg text-gray-900">{stat.totalRevenue.toFixed(2).replace('.', ',')} DT</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Bénéfice Net</div>
                      <div className={`font-bold text-lg ${stat.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.totalProfit > 0 ? '+' : ''}{stat.totalProfit.toFixed(2).replace('.', ',')} DT
                      </div>
                    </div>
                    <div className="hidden md:flex">
                      {expandedCompany === stat.name ? <ChevronUp /> : <ChevronDown />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Table */}
                {expandedCompany === stat.name && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 md:p-6 overflow-x-auto">
                    {stat.orders.length === 0 ? (
                      <div className="text-center text-gray-500 py-4">Aucune commande pour ce transporteur.</div>
                    ) : (
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-200">
                            <th className="pb-3 font-medium">Commande</th>
                            <th className="pb-3 font-medium text-right">CA (Client)</th>
                            <th className="pb-3 font-medium text-right text-red-500">Coût Achat</th>
                            <th className="pb-3 font-medium text-right text-red-500">Coût Livr.</th>
                            <th className="pb-3 font-medium text-right text-green-600">Bénéfice</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {stat.orders.map(order => (
                            <tr key={order.id} className="hover:bg-white">
                              <td className="py-3">
                                <div className="font-medium text-gray-900">{order.id.split('-')[0].toUpperCase()}</div>
                                <div className="text-xs text-gray-500 flex items-center mt-1">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {new Date(order.created_at).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="py-3 text-right font-medium">{order.total_amount.toFixed(2).replace('.', ',')}</td>
                              <td className="py-3 text-right text-red-500">-{order.cost_of_goods.toFixed(2).replace('.', ',')}</td>
                              <td className="py-3 text-right text-red-500">-{order.delivery_cost.toFixed(2).replace('.', ',')}</td>
                              <td className="py-3 text-right font-bold">
                                <span className={order.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {order.profit > 0 ? '+' : ''}{order.profit.toFixed(2).replace('.', ',')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
