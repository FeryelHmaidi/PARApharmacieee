"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Tags, Clock, CheckCircle2 } from "lucide-react";
import type { DashboardOrder } from "../types";

export function ProductCategoryStatsCard({
  orders,
  isLoading,
}: {
  orders?: DashboardOrder[];
  isLoading?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"products" | "categories">("products");

  const stats = useMemo(() => {
    if (!orders || orders.length === 0) {
      return { productStats: [], categoryStats: [] };
    }

    const productMap = new Map<
      string,
      {
        id: string;
        name: string;
        sku: string;
        receivedCount: number;
        pendingCount: number;
        totalQuantity: number;
      }
    >();

    const categoryMap = new Map<
      string,
      {
        id: string;
        name: string;
        receivedCount: number;
        pendingCount: number;
        totalQuantity: number;
      }
    >();

    for (const order of orders) {
      const isPending = order.status === "pending";
      const items = order.order_items ?? [];

      for (const item of items) {
        const prod = item.product;
        const prodId = item.product_id || prod?.id || "unknown";
        const prodName = prod?.name || `Produit #${prodId.slice(0, 6)}`;
        const prodSku = prod?.sku || "—";
        const qty = item.quantity || 1;

        // Update product stats
        const existingProd = productMap.get(prodId) ?? {
          id: prodId,
          name: prodName,
          sku: prodSku,
          receivedCount: 0,
          pendingCount: 0,
          totalQuantity: 0,
        };
        existingProd.receivedCount += 1;
        if (isPending) {
          existingProd.pendingCount += 1;
        }
        existingProd.totalQuantity += qty;
        productMap.set(prodId, existingProd);

        // Update category/tags stats
        const tagLinks = prod?.product_tags ?? [];
        if (tagLinks.length > 0) {
          for (const link of tagLinks) {
            if (link.tag) {
              const tagId = link.tag.id;
              const tagName = link.tag.name;
              const existingCat = categoryMap.get(tagId) ?? {
                id: tagId,
                name: tagName,
                receivedCount: 0,
                pendingCount: 0,
                totalQuantity: 0,
              };
              existingCat.receivedCount += 1;
              if (isPending) {
                existingCat.pendingCount += 1;
              }
              existingCat.totalQuantity += qty;
              categoryMap.set(tagId, existingCat);
            }
          }
        } else {
          // Uncategorized
          const tagId = "uncategorized";
          const tagName = "Sans catégorie";
          const existingCat = categoryMap.get(tagId) ?? {
            id: tagId,
            name: tagName,
            receivedCount: 0,
            pendingCount: 0,
            totalQuantity: 0,
          };
          existingCat.receivedCount += 1;
          if (isPending) {
            existingCat.pendingCount += 1;
          }
          existingCat.totalQuantity += qty;
          categoryMap.set(tagId, existingCat);
        }
      }
    }

    const productStats = Array.from(productMap.values()).sort(
      (a, b) => b.receivedCount - a.receivedCount
    );
    const categoryStats = Array.from(categoryMap.values()).sort(
      (a, b) => b.receivedCount - a.receivedCount
    );

    return { productStats, categoryStats };
  }, [orders]);

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-slate-800">
            Statistiques par produit & catégorie
          </CardTitle>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center text-sm text-slate-400">
          Chargement des statistiques…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-sm border rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-medium text-slate-900 flex items-center gap-2">
          {activeTab === "products" ? (
            <Package className="h-5 w-5 text-yellow-600" />
          ) : (
            <Tags className="h-5 w-5 text-yellow-600" />
          )}
          Statistiques par {activeTab === "products" ? "produit" : "catégorie"}
        </CardTitle>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "products"
                ? "bg-white text-yellow-800 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Par produit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "categories"
                ? "bg-white text-yellow-800 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Par catégorie
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {activeTab === "products" ? (
          stats.productStats.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Aucune commande trouvée pour générer les statistiques par produit.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider text-slate-500 bg-slate-50/50">
                    <th className="py-3 px-3">Produit</th>
                    <th className="py-3 px-3 text-center">Qté Vendue</th>
                    <th className="py-3 px-3 text-center">Commandes reçues</th>
                    <th className="py-3 px-3 text-center">En attente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.productStats.slice(0, 10).map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900">{prod.name}</div>
                        <div className="text-xs text-slate-400">SKU: {prod.sku}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-700">
                        {prod.totalQuantity}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          {prod.receivedCount}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                          <Clock className="h-3 w-3" />
                          {prod.pendingCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : stats.categoryStats.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Aucune catégorie trouvée pour générer les statistiques.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-slate-500 bg-slate-50/50">
                  <th className="py-3 px-3">Catégorie</th>
                  <th className="py-3 px-3 text-center">Articles vendus</th>
                  <th className="py-3 px-3 text-center">Commandes reçues</th>
                  <th className="py-3 px-3 text-center">En attente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.categoryStats.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-3 font-medium text-slate-900">
                      {cat.name}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">
                      {cat.totalQuantity}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        {cat.receivedCount}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        <Clock className="h-3 w-3" />
                        {cat.pendingCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
