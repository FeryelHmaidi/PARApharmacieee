"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { InventoryProduct } from "../types";

const LOW_STOCK_THRESHOLD = 12;
const EXPIRY_WINDOW_DAYS = 60;

type InventoryHealthProps = {
  inventory?: InventoryProduct[] | null;
  isLoading: boolean;
};

type InventoryRow = {
  id: string;
  name: string;
  sku: string;
  variantLabel: string;
  stock: number;
  expiryDateStr?: string | null;
  expiryFormatted?: string;
  diffDays?: number;
  isExpired?: boolean;
};

const toSizeLabel = (variant: InventoryProduct["variants"][number]) => {
  if (variant.size_value && variant.size_unit) {
    return `${variant.size_value}${variant.size_unit}`;
  }
  return "Standard";
};

const formatFrenchDate = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    const clean = iso.split("T")[0];
    const parts = clean.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      const [year, month, day] = parts;
      return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
    }
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR");
  } catch {
    return iso;
  }
};

const daysBetween = (target: Date, now: Date) =>
  Math.round((target.getTime() - now.getTime()) / 86400000);

export function InventoryHealth({
  inventory,
  isLoading,
}: InventoryHealthProps) {
  const [activeTab, setActiveTab] = useState<"lowStock" | "expiry">("lowStock");
  const [sortKey, setSortKey] = useState<"name" | "value">("value");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { allLowStock, allExpiring } = useMemo(() => {
    if (!inventory?.length) {
      return { allLowStock: [], allExpiring: [] };
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const lowStockList: InventoryRow[] = [];
    const expiringList: InventoryRow[] = [];

    inventory.forEach((product) => {
      product.variants.forEach((variant) => {
        const stock = variant.stock ?? 0;
        const vLabel = toSizeLabel(variant);

        // Low stock check
        if (stock <= LOW_STOCK_THRESHOLD) {
          lowStockList.push({
            id: `${product.id}-${variant.id}-low`,
            name: product.name,
            sku: product.sku,
            variantLabel: vLabel,
            stock,
          });
        }

        // Expiry check
        if (variant.expiry_date) {
          const cleanDateStr = variant.expiry_date.split("T")[0];
          const parts = cleanDateStr.split("-");
          let expiryDate: Date;
          if (parts.length === 3) {
            expiryDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          } else {
            expiryDate = new Date(variant.expiry_date);
          }

          if (!Number.isNaN(expiryDate.getTime())) {
            const diffDays = daysBetween(expiryDate, now);
            if (diffDays <= EXPIRY_WINDOW_DAYS) {
              expiringList.push({
                id: `${product.id}-${variant.id}-exp`,
                name: product.name,
                sku: product.sku,
                variantLabel: vLabel,
                stock,
                expiryDateStr: variant.expiry_date,
                expiryFormatted: formatFrenchDate(variant.expiry_date),
                diffDays,
                isExpired: diffDays < 0,
              });
            }
          }
        }
      });
    });

    return { allLowStock: lowStockList, allExpiring: expiringList };
  }, [inventory]);

  const currentList = activeTab === "lowStock" ? allLowStock : allExpiring;

  const sortedList = useMemo(() => {
    const list = [...currentList];
    list.sort((a, b) => {
      if (sortKey === "name") {
        const comp = a.name.localeCompare(b.name, "fr");
        return sortOrder === "asc" ? comp : -comp;
      } else {
        const valA = activeTab === "lowStock" ? a.stock : a.diffDays ?? 0;
        const valB = activeTab === "lowStock" ? b.stock : b.diffDays ?? 0;
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
    });
    return list;
  }, [currentList, sortKey, sortOrder, activeTab]);

  const totalPages = Math.ceil(
    sortedList.length / (pageSize >= 9999 ? sortedList.length || 1 : pageSize)
  );

  const paginatedList = useMemo(() => {
    if (pageSize >= 9999) return sortedList;
    const start = pageIndex * pageSize;
    return sortedList.slice(start, start + pageSize);
  }, [sortedList, pageIndex, pageSize]);

  const handleSort = (key: "name" | "value") => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const totalCriticalCount = allLowStock.length + allExpiring.length;

  if (isLoading && !inventory?.length) {
    return (
      <Card className="space-y-6 border bg-card p-4 rounded-2xl">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  return (
    <Card className="space-y-4 border bg-card p-4 rounded-2xl shadow-sm">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900">
              Santé de l'inventaire
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
              {totalCriticalCount} alertes
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Surveillance en temps réel des stocks faibles et des lots proches de l'expiration
          </p>
        </div>

        {/* Onglets */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setActiveTab("lowStock");
              setPageIndex(0);
            }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "lowStock"
                ? "bg-white text-yellow-800 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Stock faible (≤ {LOW_STOCK_THRESHOLD})</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-bold">
              {allLowStock.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("expiry");
              setPageIndex(0);
            }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "expiry"
                ? "bg-white text-yellow-800 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Expiration proche (≤ {EXPIRY_WINDOW_DAYS}j)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-900 font-bold">
              {allExpiring.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tableau interactif */}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 border-b text-xs text-slate-600 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3">
                <button
                  type="button"
                  onClick={() => handleSort("name")}
                  className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors font-semibold"
                >
                  <span>Produit</span>
                  {sortKey === "name" ? (
                    sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-yellow-600" /> : <ArrowDown className="w-3.5 h-3.5 text-yellow-600" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                  )}
                </button>
              </th>
              <th className="py-2.5 px-3">Contenance</th>
              <th className="py-2.5 px-3 text-center">
                <button
                  type="button"
                  onClick={() => handleSort("value")}
                  className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors font-semibold"
                >
                  <span>{activeTab === "lowStock" ? "Stock actuel" : "Date expiration"}</span>
                  {sortKey === "value" ? (
                    sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-yellow-600" /> : <ArrowDown className="w-3.5 h-3.5 text-yellow-600" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                  )}
                </button>
              </th>
              <th className="py-2.5 px-3 text-right">Statut / Alerte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedList.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                  {activeTab === "lowStock"
                    ? "Tous les produits ont un niveau de stock suffisant."
                    : "Aucun produit n'expire dans les 60 prochains jours."}
                </td>
              </tr>
            ) : (
              paginatedList.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-xs text-slate-900">
                      {row.name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      SKU: {row.sku}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-600">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                      {row.variantLabel}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {activeTab === "lowStock" ? (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          row.stock === 0
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : row.stock <= 5
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-yellow-50 text-yellow-800 border border-yellow-200"
                        }`}
                      >
                        {row.stock} unité(s)
                      </span>
                    ) : (
                      <span className="font-semibold text-xs text-slate-800">
                        {row.expiryFormatted}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {activeTab === "lowStock" ? (
                      row.stock === 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Rupture de stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Stock critique
                        </span>
                      )
                    ) : row.isExpired ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        Expiré ({Math.abs(row.diffDays ?? 0)}j)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Expire dans {row.diffDays}j
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Total Footer (Identique à Photo 2) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100">
        <div className="text-xs sm:text-sm text-slate-600 font-medium">
          Total :{" "}
          <span className="font-bold text-slate-900">{currentList.length}</span>{" "}
          article(s)
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
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
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
    </Card>
  );
}
