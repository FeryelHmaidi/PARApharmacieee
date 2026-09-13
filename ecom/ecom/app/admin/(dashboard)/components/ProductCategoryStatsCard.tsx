"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Package,
  Tags,
  Layers,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  DollarSign,
} from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { startOfDay, endOfDay } from "date-fns";
import type { DashboardOrder } from "../types";

type CategoryRow = { id: string; name: string };
type SubcategoryRow = { id: string; name: string; category_id: string | null };

type StatItem = {
  id: string;
  name: string;
  sku?: string;
  parentCategory?: string;
  soldQuantity: number; // SEULEMENT les articles livrés
  revenue: number;      // Chiffre d'affaires livré
  receivedCount: number;
  pendingCount: number;
  confirmedCount: number;
  cancelledCount: number;
  returnedCount: number;
};

type SortField =
  | "name"
  | "parent"
  | "soldQuantity"
  | "revenue"
  | "receivedCount"
  | "pendingCount"
  | "confirmedCount"
  | "cancelledCount"
  | "returnedCount";

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

  // Date range filters
  const [datePreset, setDatePreset] = useState<"all" | "today" | "7d" | "30d" | "custom">("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Sort state
  const [sortField, setSortField] = useState<SortField>("soldQuantity");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

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

  // Reset pagination on tab or filter change
  useEffect(() => {
    setPageIndex(0);
  }, [activeTab, datePreset, customFrom, customTo]);

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    const list = orders ?? [];
    if (datePreset === "all") return list;

    const now = new Date();
    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    if (datePreset === "today") {
      fromDate = startOfDay(now);
      toDate = endOfDay(now);
    } else if (datePreset === "7d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      fromDate = startOfDay(d);
      toDate = endOfDay(now);
    } else if (datePreset === "30d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      fromDate = startOfDay(d);
      toDate = endOfDay(now);
    } else if (datePreset === "custom") {
      if (customFrom) fromDate = startOfDay(new Date(customFrom));
      if (customTo) toDate = endOfDay(new Date(customTo));
    }

    return list.filter((order) => {
      if (!order.created_at) return true;
      const orderDate = new Date(order.created_at);
      if (fromDate && orderDate < fromDate) return false;
      if (toDate && orderDate > toDate) return false;
      return true;
    });
  }, [orders, datePreset, customFrom, customTo]);

  const stats = useMemo(() => {
    const list = filteredOrders;

    // 1. PRODUCT STATS
    const productMap = new Map<string, StatItem>();

    // 2. CATEGORY STATS (Dynamic based on DB categories)
    const categoryMap = new Map<string, StatItem>();
    dbCategories.forEach((cat) => {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        soldQuantity: 0,
        revenue: 0,
        receivedCount: 0,
        pendingCount: 0,
        confirmedCount: 0,
        cancelledCount: 0,
        returnedCount: 0,
      });
    });

    const categoryToKeywords = new Map<string, string[]>();
    dbCategories.forEach((cat) => {
      const subcatsOfCat = dbSubcategories
        .filter((sub) => sub.category_id === cat.id)
        .map((sub) => sub.name.trim().toLowerCase());
      categoryToKeywords.set(cat.id, [cat.name.trim().toLowerCase(), ...subcatsOfCat]);
    });

    // 3. SUBCATEGORY STATS (Dynamic based on DB subcategories)
    const subcategoryMap = new Map<string, StatItem>();
    dbSubcategories.forEach((sub) => {
      const parentCat = dbCategories.find((c) => c.id === sub.category_id);
      subcategoryMap.set(sub.id, {
        id: sub.id,
        name: sub.name,
        parentCategory: parentCat?.name ?? "—",
        soldQuantity: 0,
        revenue: 0,
        receivedCount: 0,
        pendingCount: 0,
        confirmedCount: 0,
        cancelledCount: 0,
        returnedCount: 0,
      });
    });

    for (const order of list) {
      const st = order.status;
      const isDelivered = st === "delivered";
      const isPending = st === "pending" || (st as string) === "tentative";
      const isConfirmed = st === "confirmed" || st === "processing" || st === "shipped";
      const isCancelled = st === "cancelled";
      const isReturned = st === "returned";

      const items = order.order_items ?? [];

      for (const item of items) {
        const prod = item.product;
        const prodId = item.product_id || prod?.id || "unknown";
        const prodName = prod?.name || `Produit #${prodId.slice(0, 6)}`;
        const prodSku = prod?.sku || "—";
        const qty = item.quantity || 1;
        const itemPrice = item.price_at_purchase || 0;
        const itemRevenue = isDelivered ? qty * itemPrice : 0;

        // Update Product Map
        const existingProd = productMap.get(prodId) ?? {
          id: prodId,
          name: prodName,
          sku: prodSku,
          soldQuantity: 0,
          revenue: 0,
          receivedCount: 0,
          pendingCount: 0,
          confirmedCount: 0,
          cancelledCount: 0,
          returnedCount: 0,
        };

        existingProd.receivedCount += 1;
        if (isDelivered) {
          existingProd.soldQuantity += qty;
          existingProd.revenue += itemRevenue;
        }
        if (isPending) existingProd.pendingCount += 1;
        if (isConfirmed) existingProd.confirmedCount += 1;
        if (isCancelled) existingProd.cancelledCount += 1;
        if (isReturned) existingProd.returnedCount += 1;
        productMap.set(prodId, existingProd);

        // Update Category Map
        const tagNames = (prod?.product_tags ?? [])
          .map((link) => link.tag?.name?.trim().toLowerCase())
          .filter((name): name is string => Boolean(name));

        dbCategories.forEach((cat) => {
          const keywords = categoryToKeywords.get(cat.id) ?? [cat.name.trim().toLowerCase()];
          const hasMatch = tagNames.some((tagName) => keywords.includes(tagName));

          if (hasMatch) {
            const entry = categoryMap.get(cat.id)!;
            entry.receivedCount += 1;
            if (isDelivered) {
              entry.soldQuantity += qty;
              entry.revenue += itemRevenue;
            }
            if (isPending) entry.pendingCount += 1;
            if (isConfirmed) entry.confirmedCount += 1;
            if (isCancelled) entry.cancelledCount += 1;
            if (isReturned) entry.returnedCount += 1;
          }
        });

        // Update Subcategory Map
        dbSubcategories.forEach((sub) => {
          const subNameLower = sub.name.trim().toLowerCase();
          if (tagNames.includes(subNameLower)) {
            const entry = subcategoryMap.get(sub.id)!;
            entry.receivedCount += 1;
            if (isDelivered) {
              entry.soldQuantity += qty;
              entry.revenue += itemRevenue;
            }
            if (isPending) entry.pendingCount += 1;
            if (isConfirmed) entry.confirmedCount += 1;
            if (isCancelled) entry.cancelledCount += 1;
            if (isReturned) entry.returnedCount += 1;
          }
        });
      }
    }

    return {
      products: Array.from(productMap.values()),
      categories: Array.from(categoryMap.values()),
      subcategories: Array.from(subcategoryMap.values()),
    };
  }, [filteredOrders, dbCategories, dbSubcategories]);

  const rawList =
    activeTab === "products"
      ? stats.products
      : activeTab === "categories"
      ? stats.categories
      : stats.subcategories;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder(field === "name" || field === "parent" ? "asc" : "desc");
    }
  };

  const sortedList = useMemo(() => {
    const list = [...rawList];
    list.sort((a, b) => {
      let valA: any = a[sortField as keyof StatItem] ?? "";
      let valB: any = b[sortField as keyof StatItem] ?? "";

      if (typeof valA === "string") {
        const comp = valA.localeCompare(valB, "fr");
        return sortOrder === "asc" ? comp : -comp;
      }
      return sortOrder === "asc" ? valA - valB : valB - valA;
    });
    return list;
  }, [rawList, sortField, sortOrder]);

  const totalPages = Math.ceil(
    sortedList.length / (pageSize >= 9999 ? sortedList.length || 1 : pageSize)
  );

  const paginatedList = useMemo(() => {
    if (pageSize >= 9999) return sortedList;
    const start = pageIndex * pageSize;
    return sortedList.slice(start, start + pageSize);
  }, [sortedList, pageIndex, pageSize]);

  // Overall totals for period
  const totals = useMemo(() => {
    return rawList.reduce(
      (acc, it) => ({
        sold: acc.sold + it.soldQuantity,
        revenue: acc.revenue + it.revenue,
        received: acc.received + it.receivedCount,
        pending: acc.pending + it.pendingCount,
        confirmed: acc.confirmed + it.confirmedCount,
        cancelled: acc.cancelled + it.cancelledCount,
        returned: acc.returned + it.returnedCount,
      }),
      { sold: 0, revenue: 0, received: 0, pending: 0, confirmed: 0, cancelled: 0, returned: 0 }
    );
  }, [rawList]);

  const SortHeader = ({
    title,
    field,
    align = "left",
  }: {
    title: string;
    field: SortField;
    align?: "left" | "center" | "right";
  }) => {
    const isCurrent = sortField === field;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className={`inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors group font-semibold text-xs ${
          align === "center"
            ? "justify-center w-full"
            : align === "right"
            ? "justify-end w-full"
            : ""
        }`}
      >
        <span>{title}</span>
        {isCurrent ? (
          sortOrder === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-yellow-600" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-yellow-600" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>
    );
  };

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
      <CardHeader className="flex flex-col gap-4 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
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
            <p className="text-xs text-muted-foreground mt-0.5">
              Articles vendus comptabilisés <strong>uniquement si commande livrée</strong>
            </p>
          </div>

          {/* Onglets */}
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
        </div>

        {/* Barre de filtrage par Date (chiffre d'affaires par date) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Période :
            </span>
            {[
              { id: "all", label: "Tout" },
              { id: "today", label: "Aujourd'hui" },
              { id: "7d", label: "7 jours" },
              { id: "30d", label: "30 jours" },
              { id: "custom", label: "Personnalisé" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id as any)}
                className={`px-2.5 py-1 rounded-md transition font-medium ${
                  datePreset === p.id
                    ? "bg-yellow-100 text-yellow-900 font-bold border border-yellow-300"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}

            {datePreset === "custom" && (
              <div className="flex items-center gap-1 ml-2">
                <span className="text-slate-500">Du:</span>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-7 w-[125px] text-xs px-1.5"
                />
                <span className="text-slate-500">Au:</span>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-7 w-[125px] text-xs px-1.5"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-600">
              CA Livré Période :{" "}
              <span className="font-bold text-emerald-700">
                {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "TND" }).format(
                  totals.revenue
                )}
              </span>
            </div>
            <div className="text-xs text-slate-600">
              Articles vendus : <span className="font-bold text-slate-900">{totals.sold}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b text-xs text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3">
                  <SortHeader
                    title={
                      activeTab === "products"
                        ? "Produit"
                        : activeTab === "categories"
                        ? "Catégorie"
                        : "Sous-catégorie"
                    }
                    field="name"
                  />
                </th>

                {activeTab === "subcategories" && (
                  <th className="py-3 px-3">
                    <SortHeader title="Catégorie parente" field="parent" />
                  </th>
                )}

                <th className="py-3 px-3 text-center">
                  <SortHeader title="Articles vendus (Livrés)" field="soldQuantity" align="center" />
                </th>

                <th className="py-3 px-3 text-right">
                  <SortHeader title="Chiffre d'affaires" field="revenue" align="right" />
                </th>

                <th className="py-3 px-3 text-center">
                  <SortHeader title="Commandes reçues" field="receivedCount" align="center" />
                </th>

                <th className="py-3 px-3 text-center">
                  <SortHeader title="En attente" field="pendingCount" align="center" />
                </th>

                <th className="py-3 px-3 text-center">
                  <SortHeader title="Confirmé" field="confirmedCount" align="center" />
                </th>

                <th className="py-3 px-3 text-center">
                  <SortHeader title="Rejeté / Annulé" field="cancelledCount" align="center" />
                </th>

                <th className="py-3 px-3 text-center">
                  <SortHeader title="Retourné" field="returnedCount" align="center" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedList.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === "subcategories" ? 9 : 8}
                    className="py-10 text-center text-xs text-slate-400"
                  >
                    Aucune statistique disponible pour la sélection choisie.
                  </td>
                </tr>
              ) : (
                paginatedList.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-xs text-slate-900">{row.name}</div>
                      {row.sku && row.sku !== "—" && (
                        <div className="text-[11px] text-slate-400">SKU: {row.sku}</div>
                      )}
                    </td>

                    {activeTab === "subcategories" && (
                      <td className="py-3 px-3 text-xs text-slate-600 font-medium">
                        {row.parentCategory}
                      </td>
                    )}

                    <td className="py-3 px-3 text-center font-bold text-xs text-emerald-800">
                      {row.soldQuantity > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-xs">
                          {row.soldQuantity}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-xs text-emerald-700">
                      {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "TND" }).format(
                        row.revenue
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800">
                        {row.receivedCount}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      {row.pendingCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          <Clock className="h-3 w-3" />
                          {row.pendingCount}
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {row.confirmedCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          <CheckCircle2 className="h-3 w-3" />
                          {row.confirmedCount}
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {row.cancelledCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-xs font-semibold text-rose-700">
                          <XCircle className="h-3 w-3" />
                          {row.cancelledCount}
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {row.returnedCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-300 px-2 py-0.5 text-xs font-semibold text-gray-700">
                          <RotateCcw className="h-3 w-3" />
                          {row.returnedCount}
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination & Total (Identique à Photo 2) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100">
          <div className="text-xs sm:text-sm text-slate-600 font-medium">
            Total :{" "}
            <span className="font-bold text-slate-900">{rawList.length}</span>{" "}
            {activeTab === "products"
              ? "produit(s)"
              : activeTab === "categories"
              ? "catégorie(s)"
              : "sous-catégorie(s)"}
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
              <span>Lignes par page :</span>
              <select
                value={pageSize >= 9999 ? 9999 : pageSize}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPageSize(val);
                  setPageIndex(0);
                }}
                className="h-8 border border-slate-200 rounded-lg px-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500 font-medium text-slate-700 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={9999}>Tout</option>
              </select>
            </div>

            <div className="text-xs sm:text-sm text-slate-600 font-medium">
              Page{" "}
              <span className="font-bold text-slate-900">
                {totalPages > 0 ? pageIndex + 1 : 0}
              </span>{" "}
              sur{" "}
              <span className="font-bold text-slate-900">{totalPages || 1}</span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-xs rounded-lg"
                onClick={() => setPageIndex(0)}
                disabled={pageIndex === 0}
                title="Première page"
              >
                «
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-xs rounded-lg"
                onClick={() => setPageIndex((p) => p - 1)}
                disabled={pageIndex === 0}
                title="Page précédente"
              >
                ‹
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-xs rounded-lg"
                onClick={() => setPageIndex((p) => p + 1)}
                disabled={pageIndex >= totalPages - 1}
                title="Page suivante"
              >
                ›
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-xs rounded-lg"
                onClick={() => setPageIndex(totalPages - 1)}
                disabled={pageIndex >= totalPages - 1}
                title="Dernière page"
              >
                »
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
