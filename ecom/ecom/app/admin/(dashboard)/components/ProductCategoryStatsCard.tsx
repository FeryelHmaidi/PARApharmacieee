"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Tags, Layers, Clock, CheckCircle2 } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { DashboardOrder } from "../types";

type CategoryRow = { id: string; name: string };
type SubcategoryRow = { id: string; name: string; category_id: string | null };

export function ProductCategoryStatsCard({
  orders,
  isLoading: ordersLoading,
}: {
  orders?: DashboardOrder[];
  isLoading?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"products" | "categories" | "subcategories">("categories");
  const [dbCategories, setDbCategories] = useState<CategoryRow[]>([]);
  const [dbSubcategories, setDbSubcategories] = useState<SubcategoryRow[]>([]);
  const [isDictLoading, setIsDictLoading] = useState(true);

  const supabase = useMemo(() => createClientComponentClient(), []);

  useEffect(() => {
    async function loadDictionaries() {
      setIsDictLoading(true);
      try {
        const [catsRes, subcatsRes] = await Promise.all([
          supabase.from("categories").select("id, name").order("name"),
          supabase.from("subcategories").select("id, name, category_id").order("name"),
        ]);
        if (catsRes.data) setDbCategories(catsRes.data);
        if (subcatsRes.data) setDbSubcategories(subcatsRes.data);
      } catch (err) {
        console.error("Error loading categories/subcategories for stats:", err);
      } finally {
        setIsDictLoading(false);
      }
    }
    loadDictionaries();
  }, [supabase]);

  const stats = useMemo(() => {
    const list = orders ?? [];

    // 1. PRODUCT STATS
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

    for (const order of list) {
      const isPending = order.status === "pending";
      const items = order.order_items ?? [];

      for (const item of items) {
        const prod = item.product;
        const prodId = item.product_id || prod?.id || "unknown";
        const prodName = prod?.name || `Produit #${prodId.slice(0, 6)}`;
        const prodSku = prod?.sku || "—";
        const qty = item.quantity || 1;

        const existingProd = productMap.get(prodId) ?? {
          id: prodId,
          name: prodName,
          sku: prodSku,
          receivedCount: 0,
          pendingCount: 0,
          totalQuantity: 0,
        };
        existingProd.receivedCount += 1;
        if (isPending) existingProd.pendingCount += 1;
        existingProd.totalQuantity += qty;
        productMap.set(prodId, existingProd);
      }
    }

    // 2. CATEGORY STATS (Dynamic based on DB categories)
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

    // Initialize all registered categories from DB
    dbCategories.forEach((cat) => {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        receivedCount: 0,
        pendingCount: 0,
        totalQuantity: 0,
      });
    });

    // Map each category to its associated subcategory names (case-insensitive)
    const categoryToKeywords = new Map<string, string[]>();
    dbCategories.forEach((cat) => {
      const subcatsOfCat = dbSubcategories
        .filter((sub) => sub.category_id === cat.id)
        .map((sub) => sub.name.trim().toLowerCase());
      categoryToKeywords.set(cat.id, [cat.name.trim().toLowerCase(), ...subcatsOfCat]);
    });

    for (const order of list) {
      const isPending = order.status === "pending";
      const items = order.order_items ?? [];

      for (const item of items) {
        const prod = item.product;
        const qty = item.quantity || 1;
        const tagNames = (prod?.product_tags ?? [])
          .map((link) => link.tag?.name?.trim().toLowerCase())
          .filter((name): name is string => Boolean(name));

        // Track which categories this item matched to avoid double counting for same category
        const matchedCatIds = new Set<string>();

        dbCategories.forEach((cat) => {
          const keywords = categoryToKeywords.get(cat.id) ?? [cat.name.trim().toLowerCase()];
          const hasMatch = tagNames.some((tagName) => keywords.includes(tagName));

          if (hasMatch) {
            matchedCatIds.add(cat.id);
            const entry = categoryMap.get(cat.id)!;
            entry.receivedCount += 1;
            if (isPending) entry.pendingCount += 1;
            entry.totalQuantity += qty;
          }
        });
      }
    }

    // 3. SUBCATEGORY STATS (Dynamic based on DB subcategories)
    const subcategoryMap = new Map<
      string,
      {
        id: string;
        name: string;
        categoryName: string;
        receivedCount: number;
        pendingCount: number;
        totalQuantity: number;
      }
    >();

    dbSubcategories.forEach((sub) => {
      const parentCat = dbCategories.find((c) => c.id === sub.category_id);
      subcategoryMap.set(sub.id, {
        id: sub.id,
        name: sub.name,
        categoryName: parentCat?.name ?? "—",
        receivedCount: 0,
        pendingCount: 0,
        totalQuantity: 0,
      });
    });

    for (const order of list) {
      const isPending = order.status === "pending";
      const items = order.order_items ?? [];

      for (const item of items) {
        const prod = item.product;
        const qty = item.quantity || 1;
        const tagNames = (prod?.product_tags ?? [])
          .map((link) => link.tag?.name?.trim().toLowerCase())
          .filter((name): name is string => Boolean(name));

        dbSubcategories.forEach((sub) => {
          const subNameLower = sub.name.trim().toLowerCase();
          if (tagNames.includes(subNameLower)) {
            const entry = subcategoryMap.get(sub.id)!;
            entry.receivedCount += 1;
            if (isPending) entry.pendingCount += 1;
            entry.totalQuantity += qty;
          }
        });
      }
    }

    const productStats = Array.from(productMap.values()).sort(
      (a, b) => b.totalQuantity - a.totalQuantity || b.receivedCount - a.receivedCount
    );

    const categoryStats = Array.from(categoryMap.values()).sort(
      (a, b) => b.totalQuantity - a.totalQuantity || b.receivedCount - a.receivedCount
    );

    const subcategoryStats = Array.from(subcategoryMap.values()).sort(
      (a, b) => b.totalQuantity - a.totalQuantity || b.receivedCount - a.receivedCount
    );

    return { productStats, categoryStats, subcategoryStats };
  }, [orders, dbCategories, dbSubcategories]);

  const isLoading = ordersLoading || isDictLoading;

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
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
        <CardTitle className="text-lg font-medium text-slate-900 flex items-center gap-2">
          {activeTab === "products" ? (
            <Package className="h-5 w-5 text-yellow-600" />
          ) : activeTab === "categories" ? (
            <Tags className="h-5 w-5 text-yellow-600" />
          ) : (
            <Layers className="h-5 w-5 text-yellow-600" />
          )}
          Statistiques par{" "}
          {activeTab === "products"
            ? "produit"
            : activeTab === "categories"
            ? "catégorie"
            : "sous-catégorie"}
        </CardTitle>

        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
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
          <button
            type="button"
            onClick={() => setActiveTab("subcategories")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "subcategories"
                ? "bg-white text-yellow-800 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Par sous-catégorie
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
                  {stats.productStats.slice(0, 15).map((prod) => (
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
        ) : activeTab === "categories" ? (
          stats.categoryStats.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Aucune catégorie trouvée dans la base de données.
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
          )
        ) : (
          stats.subcategoryStats.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Aucune sous-catégorie trouvée dans la base de données.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider text-slate-500 bg-slate-50/50">
                    <th className="py-3 px-3">Sous-catégorie</th>
                    <th className="py-3 px-3">Catégorie parente</th>
                    <th className="py-3 px-3 text-center">Articles vendus</th>
                    <th className="py-3 px-3 text-center">Commandes reçues</th>
                    <th className="py-3 px-3 text-center">En attente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.subcategoryStats.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-3 font-medium text-slate-900">
                        {sub.name}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500">
                        {sub.categoryName}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-700">
                        {sub.totalQuantity}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          {sub.receivedCount}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                          <Clock className="h-3 w-3" />
                          {sub.pendingCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}

