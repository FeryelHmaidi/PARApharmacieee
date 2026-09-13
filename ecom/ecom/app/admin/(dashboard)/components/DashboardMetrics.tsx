"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "lucide-react";
import type { CartSession, DashboardOrder, InventoryProduct } from "../types";

const LOW_STOCK_THRESHOLD = 12;
const METRIC_SKELETONS = [0, 1, 2, 3, 4];

const formatCurrency = (value: number, currency = "TND") =>
  `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} ${currency}`;

const toLocalDateStr = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatFrenchDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const getLowStockCount = (inventory?: InventoryProduct[] | null) => {
  if (!inventory?.length) return 0;
  return inventory.reduce((total, product) => {
    const variants = product.variants ?? [];
    const lowStockVariants = variants.filter(
      (variant) => (variant.stock ?? 0) <= LOW_STOCK_THRESHOLD
    );
    return total + lowStockVariants.length;
  }, 0);
};

const getActiveCarts = (carts?: CartSession[] | null) => {
  if (!carts?.length) return 0;
  const now = Date.now();
  return carts.filter((cart) => {
    if (cart.status === "converted") return false;
    const updated = cart.updated_at ? new Date(cart.updated_at).getTime() : 0;
    if (!updated) return true;
    const hoursAgo = (now - updated) / 36e5;
    return hoursAgo <= 48;
  }).length;
};

const getTodayRevenueAndCount = (orders?: DashboardOrder[] | null) => {
  if (!orders?.length) return { todayRevenue: 0, todayCount: 0 };
  const todayStr = toLocalDateStr(new Date());
  let todayRevenue = 0;
  let todayCount = 0;

  for (const order of orders) {
    if (!order.created_at) continue;
    const orderLocalStr = toLocalDateStr(new Date(order.created_at));
    if (orderLocalStr === todayStr) {
      todayRevenue += order.total_amount ?? 0;
      todayCount += 1;
    }
  }

  return { todayRevenue, todayCount };
};

type DashboardMetricsProps = {
  orders?: DashboardOrder[] | null;
  inventory?: InventoryProduct[] | null;
  carts?: CartSession[] | null;
  isLoading: boolean;
};

export function DashboardMetrics({
  orders,
  inventory,
  carts,
  isLoading,
}: DashboardMetricsProps) {
  const list = orders ?? [];
  const currency = list[0]?.currency ?? "TND";

  // Date selection state for "CA par Date" card
  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const [selectedSingleDate, setSelectedSingleDate] = useState<string>(() => {
    return toLocalDateStr(new Date());
  });
  const [rangeFrom, setRangeFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toLocalDateStr(d);
  });
  const [rangeTo, setRangeTo] = useState<string>(() => {
    return toLocalDateStr(new Date());
  });

  // Calculate revenue and count for selected date/range
  const { selectedRevenue, selectedCount, selectedLabel } = useMemo(() => {
    if (!list.length) {
      return {
        selectedRevenue: 0,
        selectedCount: 0,
        selectedLabel: dateMode === "single" ? formatFrenchDate(selectedSingleDate) : "Période",
      };
    }

    let rev = 0;
    let count = 0;

    if (dateMode === "single") {
      for (const order of list) {
        if (!order.created_at) continue;
        const orderDateStr = toLocalDateStr(new Date(order.created_at));
        if (orderDateStr === selectedSingleDate) {
          rev += order.total_amount ?? 0;
          count += 1;
        }
      }
      return {
        selectedRevenue: rev,
        selectedCount: count,
        selectedLabel: formatFrenchDate(selectedSingleDate),
      };
    } else {
      const from = rangeFrom ? rangeFrom : "1970-01-01";
      const to = rangeTo ? rangeTo : "2099-12-31";
      for (const order of list) {
        if (!order.created_at) continue;
        const orderDateStr = toLocalDateStr(new Date(order.created_at));
        if (orderDateStr >= from && orderDateStr <= to) {
          rev += order.total_amount ?? 0;
          count += 1;
        }
      }
      return {
        selectedRevenue: rev,
        selectedCount: count,
        selectedLabel: `${formatFrenchDate(from)} au ${formatFrenchDate(to)}`,
      };
    }
  }, [list, dateMode, selectedSingleDate, rangeFrom, rangeTo]);

  const totalRevenue = list.reduce(
    (sum, order) => sum + (order.total_amount ?? 0),
    0
  );
  const activeOrders = list.filter((order) =>
    ["pending", "confirmed", "processing", "shipped"].includes(
      order.status ?? ""
    )
  ).length;
  const lowStockSkus = getLowStockCount(inventory);
  const { todayRevenue, todayCount } = getTodayRevenueAndCount(list);

  // Quick preset actions for "CA par Date"
  const setQuickDate = (type: "today" | "yesterday" | "last7" | "month") => {
    const now = new Date();
    if (type === "today") {
      setDateMode("single");
      setSelectedSingleDate(toLocalDateStr(now));
    } else if (type === "yesterday") {
      setDateMode("single");
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      setSelectedSingleDate(toLocalDateStr(y));
    } else if (type === "last7") {
      setDateMode("range");
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 7);
      setRangeFrom(toLocalDateStr(d7));
      setRangeTo(toLocalDateStr(now));
    } else if (type === "month") {
      setDateMode("range");
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
      setRangeFrom(toLocalDateStr(mStart));
      setRangeTo(toLocalDateStr(now));
    }
  };

  if (isLoading && !list.length) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {METRIC_SKELETONS.map((item) => (
          <Card key={item} className="p-4 rounded-2xl">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-6 w-28" />
            <Skeleton className="mt-2 h-3 w-40" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {/* 1. CA Aujourd'hui */}
      <Card className="space-y-2 border p-4 rounded-2xl bg-yellow-500/10 border-yellow-200 text-yellow-900 shadow-xs">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-yellow-800">
            CA Aujourd'hui
          </p>
          <span className="text-[10px] bg-yellow-200/80 text-yellow-900 px-2 py-0.5 rounded-full font-medium">
            Aujourd'hui
          </span>
        </div>
        <p className="text-2xl font-bold text-foreground">
          {formatCurrency(todayRevenue, currency)}
        </p>
        <p className="text-xs text-muted-foreground">
          {todayCount} commande{todayCount > 1 ? "s" : ""} aujourd'hui
        </p>
      </Card>

      {/* 2. CA par Date (Interactive Card - L'admin choisit n'importe quelle date) */}
      <Card className="space-y-2 border p-4 rounded-2xl bg-blue-50/70 border-blue-200 text-blue-950 shadow-xs relative">
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            CA par date
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setQuickDate("yesterday")}
              className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 font-medium transition cursor-pointer"
              title="Chiffre d'affaires d'hier"
            >
              Hier
            </button>
            <button
              type="button"
              onClick={() => setQuickDate("last7")}
              className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 font-medium transition cursor-pointer"
              title="7 derniers jours"
            >
              7j
            </button>
            <button
              type="button"
              onClick={() => setDateMode(dateMode === "single" ? "range" : "single")}
              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 transition cursor-pointer"
              title={dateMode === "single" ? "Passer en mode période" : "Passer en mode date unique"}
            >
              {dateMode === "single" ? "Date" : "Période"}
            </button>
          </div>
        </div>

        {/* Date Selector Input */}
        <div className="pt-0.5">
          {dateMode === "single" ? (
            <div className="flex items-center gap-1.5 bg-white border border-blue-200 rounded-lg px-2 py-1 shadow-2xs">
              <span className="text-[11px] text-blue-600 font-medium whitespace-nowrap">Date :</span>
              <input
                type="date"
                value={selectedSingleDate}
                onChange={(e) => setSelectedSingleDate(e.target.value)}
                className="w-full text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1 bg-white border border-blue-200 rounded-lg p-1 shadow-2xs">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-blue-600 font-medium">Du:</span>
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="w-full text-[11px] font-medium text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-blue-600 font-medium">Au:</span>
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="w-full text-[11px] font-medium text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        <p className="text-2xl font-bold text-blue-950">
          {formatCurrency(selectedRevenue, currency)}
        </p>

        <p className="text-xs text-blue-700 font-medium truncate" title={selectedLabel}>
          {selectedCount} commande{selectedCount > 1 ? "s" : ""} • {selectedLabel}
        </p>
      </Card>

      {/* 3. Chiffre d'affaires Total */}
      <Card className="space-y-2 border p-4 rounded-2xl bg-white text-slate-900 shadow-xs">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Chiffre d'affaires total
        </p>
        <p className="text-2xl font-bold text-foreground">
          {formatCurrency(totalRevenue, currency)}
        </p>
        <p className="text-xs text-muted-foreground">
          {list.length} commande{list.length > 1 ? "s" : ""} au total
        </p>
      </Card>

      {/* 4. Commandes en cours */}
      <Card className="space-y-2 border p-4 rounded-2xl bg-white text-slate-900 shadow-xs">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Commandes en cours
        </p>
        <p className="text-2xl font-bold text-foreground">
          {activeOrders}
        </p>
        <p className="text-xs text-muted-foreground">
          En cours de livraison / traitement
        </p>
      </Card>

      {/* 5. SKU Stock Faible */}
      <Card className="space-y-2 border p-4 rounded-2xl bg-white text-slate-900 shadow-xs">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          SKU Stock Faible
        </p>
        <p className="text-2xl font-bold text-foreground">
          {lowStockSkus}
        </p>
        <p className="text-xs text-muted-foreground">
          ≤ {LOW_STOCK_THRESHOLD} unités restantes
        </p>
      </Card>
    </div>
  );
}
