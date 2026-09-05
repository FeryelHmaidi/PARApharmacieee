"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, DollarSign, ShoppingBag, Filter } from "lucide-react";
import type { DashboardOrder } from "../types";

type RangeMode = "preset" | "custom";

const RANGE_OPTIONS = [
  { label: "Aujourd'hui", days: 1 },
  { label: "7 Derniers jours", days: 7 },
  { label: "30 Derniers jours", days: 30 },
  { label: "Ce mois-ci", days: 0 },
] as const;

export function RevenueByDateCard({
  orders,
  isLoading,
}: {
  orders?: DashboardOrder[];
  isLoading?: boolean;
}) {
  const [rangeMode, setRangeMode] = useState<RangeMode>("preset");
  const [selectedRangeDays, setSelectedRangeDays] = useState<number>(7);
  const [customDateFrom, setCustomDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [customDateTo, setCustomDateTo] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  const dailyStats = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    const currency = orders.find((o) => o.currency)?.currency ?? "TND";
    const formatter = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    });

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
      if (selectedRangeDays === 1) {
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

      const dateKey = orderDate.toISOString().split("T")[0]; // YYYY-MM-DD
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

    return Array.from(dateMap.values())
      .sort((a, b) => b.dateIso.localeCompare(a.dateIso))
      .map((item) => ({
        ...item,
        revenueFormatted: formatter.format(item.revenue),
        paidFormatted: formatter.format(item.paidRevenue),
        pendingFormatted: formatter.format(item.pendingRevenue),
        avgTicket:
          item.ordersCount > 0
            ? formatter.format(item.revenue / item.ordersCount)
            : "0,00 TND",
      }));
  }, [orders, rangeMode, selectedRangeDays, customDateFrom, customDateTo]);

  const totalPeriodRevenue = useMemo(() => {
    return dailyStats.reduce((sum, item) => sum + item.revenue, 0);
  }, [dailyStats]);

  const currency = orders?.find((o) => o.currency)?.currency ?? "TND";
  const formattedTotal = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(totalPeriodRevenue);

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
            Total période : <span className="font-bold text-yellow-700 text-sm">{formattedTotal}</span>
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
                }}
                className={`px-3 py-1.5 rounded-lg transition ${
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
              onClick={() => setRangeMode("custom")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
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
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium">Au:</span>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                />
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {dailyStats.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Aucune vente enregistrée pour la période sélectionnée.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-slate-500 bg-slate-50/50">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-right">Chiffre d'affaires</th>
                  <th className="py-3 px-3 text-center">Commandes</th>
                  <th className="py-3 px-3 text-right">Panier moyen</th>
                  <th className="py-3 px-3 text-right">Payé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyStats.map((row) => (
                  <tr key={row.dateIso} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-3 font-medium text-slate-900 flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-slate-400" />
                      <span className="capitalize">{row.dateFormatted}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">
                      {row.revenueFormatted}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-medium text-yellow-800 border border-yellow-200">
                        <ShoppingBag className="h-3 w-3 text-yellow-600" />
                        {row.ordersCount}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600 font-medium">
                      {row.avgTicket}
                    </td>
                    <td className="py-3 px-3 text-right text-xs">
                      <span className="text-emerald-600 font-medium">{row.paidFormatted}</span>
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

