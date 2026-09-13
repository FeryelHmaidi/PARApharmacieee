"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar as CalendarIcon,
  DollarSign,
  ShoppingBag,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { DashboardOrder } from "../types";

type RangeMode = "preset" | "custom";
type SortField = "date" | "revenue" | "ordersCount" | "paidRevenue";

const RANGE_OPTIONS = [
  { label: "Tout", days: -1 },
  { label: "Aujourd'hui", days: 1 },
  { label: "7 Derniers jours", days: 7 },
  { label: "30 Derniers jours", days: 30 },
  { label: "Ce mois-ci", days: 0 },
] as const;

const toLocalDateStr = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function RevenueByDateCard({
  orders,
  isLoading,
}: {
  orders?: DashboardOrder[];
  isLoading?: boolean;
}) {
  const [rangeMode, setRangeMode] = useState<RangeMode>("preset");
  const [selectedRangeDays, setSelectedRangeDays] = useState<number>(-1);
  const [customDateFrom, setCustomDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toLocalDateStr(d);
  });
  const [customDateTo, setCustomDateTo] = useState<string>(() => {
    return toLocalDateStr(new Date());
  });

  // Sorting & pagination state
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState<number | "all">(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setCurrentPage(1);
  };

  const currency = orders?.find((o) => o.currency)?.currency ?? "TND";
  const formatter = useMemo(() => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    });
  }, [currency]);

  const rawDailyStats = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    const now = new Date();
    const dateMap = new Map<
      string,
      {
        dateIso: string;
        dateFormatted: string;
        revenue: number;
        ordersCount: number;
        paidRevenue: number;
        pendingRevenue: number;
      }
    >();

    let startCutoff: Date | null = null;
    let endCutoff: Date | null = null;

    if (rangeMode === "custom") {
      if (customDateFrom) {
        startCutoff = new Date(customDateFrom);
        startCutoff.setHours(0, 0, 0, 0);
      }
      if (customDateTo) {
        endCutoff = new Date(customDateTo);
        endCutoff.setHours(23, 59, 59, 999);
      }
    } else {
      if (selectedRangeDays === -1) {
        // Tout (pas de filtre de date)
        startCutoff = null;
      } else if (selectedRangeDays === 1) {
        // Aujourd'hui
        startCutoff = new Date();
        startCutoff.setHours(0, 0, 0, 0);
      } else if (selectedRangeDays > 0) {
        startCutoff = new Date();
        startCutoff.setDate(now.getDate() - selectedRangeDays);
        startCutoff.setHours(0, 0, 0, 0);
      } else {
        // Ce mois-ci
        startCutoff = new Date(now.getFullYear(), now.getMonth(), 1);
      }
    }

    (orders ?? []).forEach((order) => {
      if (!order.created_at) return;
      const orderDate = new Date(order.created_at);
      if (startCutoff && orderDate < startCutoff) return;
      if (endCutoff && orderDate > endCutoff) return;

      const dateKey = toLocalDateStr(orderDate);
      const dateFormatted = orderDate.toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const existing = dateMap.get(dateKey) ?? {
        dateIso: dateKey,
        dateFormatted,
        revenue: 0,
        ordersCount: 0,
        paidRevenue: 0,
        pendingRevenue: 0,
      };

      const amount = order.total_amount ?? 0;
      existing.revenue += amount;
      existing.ordersCount += 1;

      if (order.payment_status === "paid") {
        existing.paidRevenue += amount;
      } else {
        existing.pendingRevenue += amount;
      }

      dateMap.set(dateKey, existing);
    });

    return Array.from(dateMap.values());
  }, [orders, rangeMode, selectedRangeDays, customDateFrom, customDateTo]);

  // Sorted list
  const sortedStats = useMemo(() => {
    return [...rawDailyStats].sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") {
        cmp = a.dateIso.localeCompare(b.dateIso);
      } else if (sortField === "revenue") {
        cmp = a.revenue - b.revenue;
      } else if (sortField === "ordersCount") {
        cmp = a.ordersCount - b.ordersCount;
      } else if (sortField === "paidRevenue") {
        cmp = a.paidRevenue - b.paidRevenue;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rawDailyStats, sortField, sortDir]);

  // Totals
  const totals = useMemo(() => {
    let rev = 0;
    let ord = 0;
    let paid = 0;
    for (const item of rawDailyStats) {
      rev += item.revenue;
      ord += item.ordersCount;
      paid += item.paidRevenue;
    }
    return {
      revenue: rev,
      ordersCount: ord,
      paidRevenue: paid,
      avgTicket: ord > 0 ? rev / ord : 0,
    };
  }, [rawDailyStats]);

  // Pagination
  const totalItems = sortedStats.length;
  const effectivePageSize = pageSize === "all" ? totalItems || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const page = Math.min(currentPage, totalPages);
  const pagedItems = useMemo(() => {
    if (pageSize === "all") return sortedStats;
    const start = (page - 1) * pageSize;
    return sortedStats.slice(start, start + pageSize);
  }, [sortedStats, page, pageSize]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition ml-1" />;
    }
    return sortDir === "asc" ? (
      <ArrowUp className="w-3 h-3 text-yellow-600 ml-1 font-bold" />
    ) : (
      <ArrowDown className="w-3 h-3 text-yellow-600 ml-1 font-bold" />
    );
  };

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-slate-800">
            Chiffre d'affaires par date
          </CardTitle>
        </CardHeader>
        <CardContent className="h-40 flex items-center justify-center text-sm text-slate-400">
          Chargement du chiffre d'affaires…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-sm border rounded-2xl">
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-yellow-600" />
            Chiffre d'affaires par date
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Total période : <span className="font-bold text-yellow-700 text-sm">{formatter.format(totals.revenue)}</span>
            {" • "}{totals.ordersCount} commande{totals.ordersCount > 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  setRangeMode("preset");
                  setSelectedRangeDays(opt.days);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  rangeMode === "preset" && selectedRangeDays === opt.days
                    ? "bg-white text-yellow-800 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setRangeMode("custom");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                rangeMode === "custom"
                  ? "bg-white text-yellow-800 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Filter className="w-3 h-3" />
              Personnalisé
            </button>
          </div>

          {rangeMode === "custom" && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl text-xs">
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium">Du:</span>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => {
                    setCustomDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-yellow-500 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium">Au:</span>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => {
                    setCustomDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-yellow-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {sortedStats.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Aucune vente enregistrée pour la période sélectionnée.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider text-slate-500 bg-slate-50/50">
                    <th
                      className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition select-none group"
                      onClick={() => handleSort("date")}
                    >
                      <div className="flex items-center">
                        Date {renderSortIcon("date")}
                      </div>
                    </th>
                    <th
                      className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition select-none group"
                      onClick={() => handleSort("revenue")}
                    >
                      <div className="flex items-center justify-end">
                        Chiffre d'affaires {renderSortIcon("revenue")}
                      </div>
                    </th>
                    <th
                      className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 transition select-none group"
                      onClick={() => handleSort("ordersCount")}
                    >
                      <div className="flex items-center justify-center">
                        Commandes {renderSortIcon("ordersCount")}
                      </div>
                    </th>
                    <th className="py-3 px-3 text-right">
                      Panier moyen
                    </th>
                    <th
                      className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition select-none group"
                      onClick={() => handleSort("paidRevenue")}
                    >
                      <div className="flex items-center justify-end">
                        Payé {renderSortIcon("paidRevenue")}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedItems.map((row) => {
                    const avgTicket = row.ordersCount > 0 ? row.revenue / row.ordersCount : 0;
                    return (
                      <tr key={row.dateIso} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-3 font-medium text-slate-900 flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-slate-400" />
                          <span className="capitalize">{row.dateFormatted}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-700">
                          {formatter.format(row.revenue)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-medium text-yellow-800 border border-yellow-200">
                            <ShoppingBag className="h-3 w-3 text-yellow-600" />
                            {row.ordersCount}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600 font-medium">
                          {formatter.format(avgTicket)}
                        </td>
                        <td className="py-3 px-3 text-right text-xs">
                          <span className="text-emerald-600 font-medium">{formatter.format(row.paidRevenue)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Total summary row */}
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-50/90 font-bold text-slate-900">
                    <td className="py-3 px-3">
                      Total ({totalItems} date{totalItems > 1 ? "s" : ""})
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-800 font-extrabold text-base">
                      {formatter.format(totals.revenue)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-900 border border-yellow-300">
                        {totals.ordersCount}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {formatter.format(totals.avgTicket)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-700">
                      {formatter.format(totals.paidRevenue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination & Rows-per-page Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Lignes par page :</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const val = e.target.value === "all" ? "all" : Number(e.target.value);
                    setPageSize(val);
                    setCurrentPage(1);
                  }}
                  className="border border-slate-200 rounded px-2 py-1 bg-white font-medium focus:outline-none cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value="all">Tout</option>
                </select>
                <span className="text-slate-400">
                  Affichage de {totalItems === 0 ? 0 : (page - 1) * effectivePageSize + 1} à{" "}
                  {Math.min(page * effectivePageSize, totalItems)} sur {totalItems} date(s)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Page précédente"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-medium">
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Page suivante"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

