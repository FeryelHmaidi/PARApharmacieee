"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  TrendingUp,
  TrendingDown,
  Truck,
  RotateCcw,
  Package,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Calculator,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";
import type { DashboardOrder, DeliveryCompanyRow } from "../types";
import { useDeliveryCompanies } from "../hooks/useDeliveryCompanies";

type RangeMode = "preset" | "custom";
type SortField = "date" | "revenue" | "profit" | "ordersCount" | "paidRevenue";
type ModalTab = "orders" | "profit";

const RANGE_OPTIONS = [
  { label: "Tout", days: -1 },
  { label: "Aujourd'hui", days: 1 },
  { label: "7 Derniers jours", days: 7 },
  { label: "30 Derniers jours", days: 30 },
  { label: "Ce mois-ci", days: 0 },
] as const;

const DEFAULT_SHIPPING_FEE = 7.0;
const DEFAULT_DELIVERY_COST = 6.0;
const DEFAULT_RETURN_FEE = 3.5;

const toLocalDateStr = (d: Date) => {
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
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  delivered: { label: "Livré", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  returned: { label: "Retourné", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
  confirmed: { label: "Confirmé", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  processing: { label: "Téléchargé", color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" },
  shipped: { label: "Expédié", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  pending: { label: "En attente", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  cancelled: { label: "Annulé", color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200" },
  tentative: { label: "Tentative", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
};

export function RevenueByDateCard({
  orders,
  isLoading,
}: {
  orders?: DashboardOrder[];
  isLoading?: boolean;
}) {
  const { data: deliveryCompanies } = useDeliveryCompanies();

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

  // Modal inspection state
  const [activeDateItem, setActiveDateItem] = useState<any | null>(null);
  const [modalTab, setModalTab] = useState<ModalTab>("orders");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  // Delivery company map for rate lookups
  const deliveryMap = useMemo(() => {
    const map = new Map<string, DeliveryCompanyRow>();
    (deliveryCompanies || []).forEach((c) => {
      if (c.name) {
        map.set(c.name.toLowerCase().trim(), c);
        map.set(c.id, c);
      }
    });
    return map;
  }, [deliveryCompanies]);

  // Helper to compute profit for a single order
  const getOrderFinancials = useMemo(() => {
    return (order: DashboardOrder) => {
      const isDelivered = order.status === "delivered";
      const isReturned = order.status === "returned";

      // Delivery pricing info
      const companyKey = (order.delivery_company || "").toLowerCase().trim();
      const comp = deliveryMap.get(companyKey);

      const shippingFee =
        typeof order.shipping_fee === "number" && order.shipping_fee > 0
          ? order.shipping_fee
          : comp?.base_price ?? DEFAULT_SHIPPING_FEE;

      const deliveryCost =
        typeof comp?.delivery_cost === "number"
          ? comp.delivery_cost
          : DEFAULT_DELIVERY_COST;

      const returnFee =
        typeof comp?.return_fee === "number"
          ? comp.return_fee
          : DEFAULT_RETURN_FEE;

      let articlesRevenue = 0;
      let articlesCost = 0;
      let articlesProfit = 0;

      const itemsDetail = (order.order_items || []).map((item) => {
        const qty = item.quantity || 1;
        const unitPrice = item.price_at_purchase ?? 0;
        const costPrice =
          item.variant?.cost_price !== null && item.variant?.cost_price !== undefined
            ? Number(item.variant.cost_price)
            : unitPrice * 0.7; // default 70% cost estimation if not set

        const itemProfit = (unitPrice - costPrice) * qty;
        const itemTotal = unitPrice * qty;
        const itemCostTotal = costPrice * qty;

        if (isDelivered) {
          articlesRevenue += itemTotal;
          articlesCost += itemCostTotal;
          articlesProfit += itemProfit;
        }

        return {
          id: item.id,
          productName: item.product?.name || "Article",
          sku: item.product?.sku || "",
          sizeValue: item.variant?.size_value,
          sizeUnit: item.variant?.size_unit,
          quantity: qty,
          unitPrice,
          costPrice,
          itemTotal,
          itemCostTotal,
          itemProfit,
        };
      });

      let deliveryProfit = 0;
      let returnFeeDeducted = 0;
      let netProfit = 0;

      if (isDelivered) {
        deliveryProfit = shippingFee - deliveryCost;
        netProfit = articlesProfit + deliveryProfit;
      } else if (isReturned) {
        returnFeeDeducted = returnFee;
        netProfit = -returnFee; // Frais de retour déduit du bénéfice
      }

      return {
        orderId: order.id,
        isDelivered,
        isReturned,
        shippingFee,
        deliveryCost,
        returnFee,
        articlesRevenue,
        articlesCost,
        articlesProfit,
        deliveryProfit,
        returnFeeDeducted,
        netProfit,
        itemsDetail,
      };
    };
  }, [deliveryMap]);

  // Aggregate daily stats
  const rawDailyStats = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    const now = new Date();
    const dateMap = new Map<string, { dateIso: string; orders: DashboardOrder[] }>();

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
        startCutoff = null;
      } else if (selectedRangeDays === 1) {
        startCutoff = new Date();
        startCutoff.setHours(0, 0, 0, 0);
      } else if (selectedRangeDays > 0) {
        startCutoff = new Date();
        startCutoff.setDate(now.getDate() - selectedRangeDays);
        startCutoff.setHours(0, 0, 0, 0);
      } else {
        startCutoff = new Date(now.getFullYear(), now.getMonth(), 1);
      }
    }

    (orders ?? []).forEach((order) => {
      if (!order.created_at) return;
      const orderDate = new Date(order.created_at);
      if (startCutoff && orderDate < startCutoff) return;
      if (endCutoff && orderDate > endCutoff) return;

      const dateKey = toLocalDateStr(orderDate);
      const existing = dateMap.get(dateKey) ?? { dateIso: dateKey, orders: [] };
      existing.orders.push(order);
      dateMap.set(dateKey, existing);
    });

    return Array.from(dateMap.values()).map((entry) => {
      const dateFormatted = formatFrenchDate(entry.dateIso);
      let revenue = 0;
      let deliveredRevenue = 0;
      let paidRevenue = 0;
      let pendingRevenue = 0;

      let deliveredCount = 0;
      let returnedCount = 0;
      let confirmedCount = 0;
      let processingCount = 0;
      let shippedCount = 0;
      let pendingCount = 0;
      let cancelledCount = 0;
      let otherCount = 0;

      let articlesProfit = 0;
      let articlesCost = 0;
      let deliveryProfit = 0;
      let deliveryFeesCollected = 0;
      let deliveryCostPaid = 0;
      let returnFeesDeducted = 0;
      let netProfit = 0;

      const orderFinancialsList = entry.orders.map((order) => {
        const amount = order.total_amount ?? 0;
        revenue += amount;

        if (order.payment_status === "paid") {
          paidRevenue += amount;
        } else {
          pendingRevenue += amount;
        }

        const st = order.status;
        if (st === "delivered") deliveredCount++;
        else if (st === "returned") returnedCount++;
        else if (st === "confirmed") confirmedCount++;
        else if (st === "processing") processingCount++;
        else if (st === "shipped") shippedCount++;
        else if (st === "pending" || !st) pendingCount++;
        else if (st === "cancelled") cancelledCount++;
        else otherCount++;

        const fin = getOrderFinancials(order);
        if (st === "delivered") {
          deliveredRevenue += amount;
          articlesProfit += fin.articlesProfit;
          articlesCost += fin.articlesCost;
          deliveryProfit += fin.deliveryProfit;
          deliveryFeesCollected += fin.shippingFee;
          deliveryCostPaid += fin.deliveryCost;
          netProfit += fin.netProfit;
        } else if (st === "returned") {
          returnFeesDeducted += fin.returnFeeDeducted;
          netProfit += fin.netProfit; // negative
        }

        return { order, financials: fin };
      });

      const marginPercent =
        deliveredRevenue > 0 ? (netProfit / deliveredRevenue) * 100 : 0;

      return {
        dateIso: entry.dateIso,
        dateFormatted,
        orders: entry.orders,
        orderFinancialsList,
        ordersCount: entry.orders.length,
        revenue,
        deliveredRevenue,
        paidRevenue,
        pendingRevenue,
        deliveredCount,
        returnedCount,
        confirmedCount,
        processingCount,
        shippedCount,
        pendingCount,
        cancelledCount,
        otherCount,
        articlesProfit,
        articlesCost,
        deliveryProfit,
        deliveryFeesCollected,
        deliveryCostPaid,
        returnFeesDeducted,
        netProfit,
        marginPercent,
      };
    });
  }, [orders, rangeMode, selectedRangeDays, customDateFrom, customDateTo, getOrderFinancials]);

  // Sorted list
  const sortedStats = useMemo(() => {
    return [...rawDailyStats].sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") {
        cmp = a.dateIso.localeCompare(b.dateIso);
      } else if (sortField === "revenue") {
        cmp = a.revenue - b.revenue;
      } else if (sortField === "profit") {
        cmp = a.netProfit - b.netProfit;
      } else if (sortField === "ordersCount") {
        cmp = a.ordersCount - b.ordersCount;
      } else if (sortField === "paidRevenue") {
        cmp = a.paidRevenue - b.paidRevenue;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rawDailyStats, sortField, sortDir]);

  // Overall Totals for Period
  const totals = useMemo(() => {
    let rev = 0;
    let delRev = 0;
    let ord = 0;
    let paid = 0;
    let delivered = 0;
    let returned = 0;
    let confirmed = 0;
    let other = 0;

    let artProfit = 0;
    let artCost = 0;
    let delivProfit = 0;
    let delivFees = 0;
    let delivCosts = 0;
    let retFees = 0;
    let netProf = 0;

    for (const item of rawDailyStats) {
      rev += item.revenue;
      delRev += item.deliveredRevenue;
      ord += item.ordersCount;
      paid += item.paidRevenue;
      delivered += item.deliveredCount;
      returned += item.returnedCount;
      confirmed += item.confirmedCount;
      other +=
        item.processingCount +
        item.shippedCount +
        item.pendingCount +
        item.cancelledCount +
        item.otherCount;

      artProfit += item.articlesProfit;
      artCost += item.articlesCost;
      delivProfit += item.deliveryProfit;
      delivFees += item.deliveryFeesCollected;
      delivCosts += item.deliveryCostPaid;
      retFees += item.returnFeesDeducted;
      netProf += item.netProfit;
    }

    const marginPercent = delRev > 0 ? (netProf / delRev) * 100 : 0;

    return {
      revenue: rev,
      deliveredRevenue: delRev,
      ordersCount: ord,
      paidRevenue: paid,
      deliveredCount: delivered,
      returnedCount: returned,
      confirmedCount: confirmed,
      otherCount: other,
      avgTicket: ord > 0 ? rev / ord : 0,
      articlesProfit: artProfit,
      articlesCost: artCost,
      deliveryProfit: delivProfit,
      deliveryFeesCollected: delivFees,
      deliveryCostPaid: delivCosts,
      returnFeesDeducted: retFees,
      netProfit: netProf,
      marginPercent,
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

  const copyOrderId = (id: string) => {
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
          Chargement des données financières…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. MAIN CARD: Chiffre d'affaires & Bénéfice par date */}
      <Card className="bg-white shadow-sm border rounded-2xl">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-4">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-600" />
              Chiffre d'affaires & Bénéfice par date
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
              <span>
                Total période : <strong className="text-yellow-700 font-bold">{formatter.format(totals.revenue)}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                Bénéfice Net :{" "}
                <strong className={`font-bold ${totals.netProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                  {formatter.format(totals.netProfit)}
                </strong>
                {totals.deliveredRevenue > 0 && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                    {totals.marginPercent.toFixed(1)}% marge
                  </span>
                )}
              </span>
              <span>•</span>
              <span>{totals.ordersCount} commande{totals.ordersCount > 1 ? "s" : ""}</span>
            </div>
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
                        className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition select-none group"
                        onClick={() => handleSort("profit")}
                      >
                        <div className="flex items-center justify-end">
                          Bénéfice Net {renderSortIcon("profit")}
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
                        <tr key={row.dateIso} className="hover:bg-slate-50/70 transition">
                          {/* Date */}
                          <td className="py-3.5 px-3 font-medium text-slate-900 flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-slate-400" />
                            <span className="capitalize">{row.dateFormatted}</span>
                          </td>

                          {/* CA */}
                          <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                            {formatter.format(row.revenue)}
                          </td>

                          {/* Bénéfice (Cliquable pour observer le bénéfice détaillé) */}
                          <td className="py-3.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveDateItem(row);
                                setModalTab("profit");
                              }}
                              className="inline-flex flex-col items-end group cursor-pointer text-right hover:opacity-85 transition"
                              title="Cliquer pour voir le détail du bénéfice par article et livraison"
                            >
                              <span
                                className={`font-bold text-sm flex items-center gap-1 ${
                                  row.netProfit >= 0 ? "text-emerald-700" : "text-rose-600"
                                }`}
                              >
                                {row.netProfit >= 0 ? "+" : ""}
                                {formatter.format(row.netProfit)}
                                <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition text-emerald-600" />
                              </span>
                              {row.deliveredRevenue > 0 && (
                                <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1 rounded border border-emerald-100">
                                  {row.marginPercent.toFixed(1)}% marge
                                </span>
                              )}
                            </button>
                          </td>

                          {/* Commandes (Comporte tous les types et cliquable) */}
                          <td className="py-3.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveDateItem(row);
                                setModalTab("orders");
                              }}
                              className="inline-flex flex-col items-center gap-1 group cursor-pointer hover:scale-102 transition"
                              title="Cliquer pour observer les commandes livrées, retournées et les articles"
                            >
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-900 border border-yellow-200 group-hover:bg-yellow-100 transition">
                                <ShoppingBag className="h-3 w-3 text-yellow-600" />
                                {row.ordersCount} cmd{row.ordersCount > 1 ? "s" : ""}
                                <Eye className="w-3 h-3 text-yellow-700 opacity-60 group-hover:opacity-100 transition" />
                              </span>

                              {/* Mini indicators of status types */}
                              <div className="flex items-center gap-1 text-[10px] font-medium">
                                {row.deliveredCount > 0 && (
                                  <span className="bg-emerald-100 text-emerald-800 px-1 rounded border border-emerald-200" title="Commandes livrées">
                                    ✓ {row.deliveredCount}
                                  </span>
                                )}
                                {row.returnedCount > 0 && (
                                  <span className="bg-rose-100 text-rose-800 px-1 rounded border border-rose-200" title="Commandes retournées">
                                    ↺ {row.returnedCount}
                                  </span>
                                )}
                                {row.confirmedCount > 0 && (
                                  <span className="bg-blue-100 text-blue-800 px-1 rounded border border-blue-200" title="Commandes confirmées">
                                    • {row.confirmedCount}
                                  </span>
                                )}
                              </div>
                            </button>
                          </td>

                          {/* Panier moyen */}
                          <td className="py-3.5 px-3 text-right text-slate-600 font-medium">
                            {formatter.format(avgTicket)}
                          </td>

                          {/* Payé */}
                          <td className="py-3.5 px-3 text-right text-xs">
                            <span className="text-emerald-600 font-medium">{formatter.format(row.paidRevenue)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Total summary row */}
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-slate-50/90 font-bold text-slate-900">
                      <td className="py-3.5 px-3">
                        Total ({totalItems} date{totalItems > 1 ? "s" : ""})
                      </td>
                      <td className="py-3.5 px-3 text-right text-slate-900 font-bold">
                        {formatter.format(totals.revenue)}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <span className={`text-base font-extrabold ${totals.netProfit >= 0 ? "text-emerald-800" : "text-rose-700"}`}>
                          {totals.netProfit >= 0 ? "+" : ""}
                          {formatter.format(totals.netProfit)}
                        </span>
                        {totals.deliveredRevenue > 0 && (
                          <div className="text-[10px] font-medium text-emerald-700">
                            {totals.marginPercent.toFixed(1)}% marge moy.
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-900 border border-yellow-300">
                          {totals.ordersCount}
                        </span>
                        <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                          {totals.deliveredCount} livrée{totals.deliveredCount > 1 ? "s" : ""} • {totals.returnedCount} retour{totals.returnedCount > 1 ? "s" : ""}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right text-slate-700">
                        {formatter.format(totals.avgTicket)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-emerald-700">
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

      {/* 2. PARTIE FINANCE : Flux Financier & Explication de la Rentabilité */}
      <Card className="bg-gradient-to-br from-white to-slate-50/50 shadow-sm border rounded-2xl overflow-hidden">
        <CardHeader className="border-b bg-slate-50/60 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-emerald-600" />
                Partie Finance : Flux du Bénéfice Net Réalisé
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Décomposition du flux financier pour la période sélectionnée (articles livrés + bénéfice livraison - frais de retour).
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-full border border-emerald-200 w-fit">
              {totals.marginPercent.toFixed(1)}% Marge Nette Réalisée
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* 4 KPI Cards summary of financial flow */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60">
              <p className="text-xs font-semibold text-blue-900 uppercase flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-blue-600" /> Marge Articles
              </p>
              <p className="text-lg sm:text-xl font-bold text-blue-950 mt-1">
                +{formatter.format(totals.articlesProfit)}
              </p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Sur {totals.deliveredCount} commande{totals.deliveredCount > 1 ? "s" : ""} livrée{totals.deliveredCount > 1 ? "s" : ""}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60">
              <p className="text-xs font-semibold text-indigo-900 uppercase flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-indigo-600" /> Bénéfice Livraison
              </p>
              <p className="text-lg sm:text-xl font-bold text-indigo-950 mt-1">
                {totals.deliveryProfit >= 0 ? "+" : ""}{formatter.format(totals.deliveryProfit)}
              </p>
              <p className="text-[11px] text-indigo-700 mt-0.5">
                Frais clients - Coûts réels
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60">
              <p className="text-xs font-semibold text-rose-900 uppercase flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" /> Frais de Retours
              </p>
              <p className="text-lg sm:text-xl font-bold text-rose-700 mt-1">
                -{formatter.format(totals.returnFeesDeducted)}
              </p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                {totals.returnedCount} retour{totals.returnedCount > 1 ? "s" : ""} déduit{totals.returnedCount > 1 ? "s" : ""}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border-2 border-emerald-300 bg-emerald-50/80 shadow-xs">
              <p className="text-xs font-bold text-emerald-900 uppercase flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Bénéfice Net Total
              </p>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-800 mt-1">
                {totals.netProfit >= 0 ? "+" : ""}{formatter.format(totals.netProfit)}
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                Gain net comptable
              </p>
            </div>
          </div>

          {/* Detailed Financial Flow Table */}
          <div className="overflow-x-auto border rounded-xl bg-white shadow-2xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase">
                  <th className="py-2.5 px-3">Poste Financier</th>
                  <th className="py-2.5 px-3">Description / Formule</th>
                  <th className="py-2.5 px-3 text-right">Part / Taux</th>
                  <th className="py-2.5 px-3 text-right">Montant (TND)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {/* 1. CA Livré */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Chiffre d'Affaires Livré (TTC)
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-500">
                    Montant total TTC des commandes dont le statut est <strong>livré</strong>
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs text-slate-500">100,0%</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    +{formatter.format(totals.deliveredRevenue)}
                  </td>
                </tr>

                {/* 2. Coût d'achat marchandises */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-semibold text-slate-700 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    (-) Coût d'Achat des Marchandises (COGS)
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-500">
                    Prix d'achat fournisseur des articles livrés (`coût unitaire × quantité`)
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs text-rose-600">
                    {totals.deliveredRevenue > 0
                      ? `-${((totals.articlesCost / totals.deliveredRevenue) * 100).toFixed(1)}%`
                      : "-"}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-rose-700">
                    -{formatter.format(totals.articlesCost)}
                  </td>
                </tr>

                {/* 3. Marge brute articles */}
                <tr className="bg-blue-50/30 hover:bg-blue-50/50">
                  <td className="py-2.5 px-3 font-bold text-blue-900 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    (=) Bénéfice Brut sur Articles
                  </td>
                  <td className="py-2.5 px-3 text-xs text-blue-700">
                    Gain direct sur les articles vendus et livrés (`Prix de vente - Coût d'achat`)
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-semibold text-blue-800">
                    {totals.deliveredRevenue > 0
                      ? `+${((totals.articlesProfit / totals.deliveredRevenue) * 100).toFixed(1)}%`
                      : "-"}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-blue-950">
                    +{formatter.format(totals.articlesProfit)}
                  </td>
                </tr>

                {/* 4. Frais livraison clients */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-semibold text-slate-700 flex items-center gap-2 pl-6">
                    (+) Frais de livraison facturés aux clients
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-500">
                    Montant de transport perçu sur les commandes livrées
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs text-slate-500">-</td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                    +{formatter.format(totals.deliveryFeesCollected)}
                  </td>
                </tr>

                {/* 5. Coût réel transporteur */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-semibold text-slate-700 flex items-center gap-2 pl-6">
                    (-) Coûts réels d'expédition (Transporteurs)
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-500">
                    Tarifs d'expédition payés aux sociétés de livraison
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs text-slate-500">-</td>
                  <td className="py-2.5 px-3 text-right font-medium text-rose-700">
                    -{formatter.format(totals.deliveryCostPaid)}
                  </td>
                </tr>

                {/* 6. Bénéfice net livraison */}
                <tr className="bg-indigo-50/30 hover:bg-indigo-50/50">
                  <td className="py-2.5 px-3 font-bold text-indigo-900 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-600" />
                    (=) Bénéfice sur Livraisons
                  </td>
                  <td className="py-2.5 px-3 text-xs text-indigo-700">
                    Différence (`Frais client - Coût réel d'expédition`)
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-semibold text-indigo-800">-</td>
                  <td className="py-2.5 px-3 text-right font-bold text-indigo-950">
                    {totals.deliveryProfit >= 0 ? "+" : ""}{formatter.format(totals.deliveryProfit)}
                  </td>
                </tr>

                {/* 7. Frais de retour déduits */}
                <tr className="hover:bg-rose-50/40 bg-rose-50/20">
                  <td className="py-2.5 px-3 font-bold text-rose-900 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-600" />
                    (-) Pertes sur Retours (Frais de retour transporteur)
                  </td>
                  <td className="py-2.5 px-3 text-xs text-rose-700">
                    Frais facturés par les transporteurs pour chaque commande <strong>retournée</strong>
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-semibold text-rose-700">
                    {totals.returnedCount} colis
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                    -{formatter.format(totals.returnFeesDeducted)}
                  </td>
                </tr>

                {/* 8. Total Final Bénéfice Net */}
                <tr className="bg-emerald-100/70 border-t-2 border-emerald-400 font-extrabold text-emerald-950 text-sm sm:text-base">
                  <td className="py-3.5 px-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    (=) BÉNÉFICE NET TOTAL RÉALISÉ
                  </td>
                  <td className="py-3.5 px-3 text-xs text-emerald-800 font-semibold">
                    Marge Articles + Bénéfice Livraison - Frais de Retours
                  </td>
                  <td className="py-3.5 px-3 text-right text-xs font-bold text-emerald-800">
                    {totals.marginPercent.toFixed(1)}% Marge Nette
                  </td>
                  <td className="py-3.5 px-3 text-right font-extrabold text-emerald-900 text-base">
                    {totals.netProfit >= 0 ? "+" : ""}{formatter.format(totals.netProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 3. DIALOG / MODAL : Inspection Détaillée des Commandes, Articles et Rentabilité */}
      <Dialog open={!!activeDateItem} onOpenChange={(open) => !open && setActiveDateItem(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          {activeDateItem && (
            <div className="space-y-6">
              <DialogHeader className="border-b pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-yellow-600" />
                      Détail du {activeDateItem.dateFormatted}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 mt-1">
                      Observation complète des commandes, articles, statuts et rentabilité de la journée.
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 bg-yellow-100 text-yellow-900 rounded-full border border-yellow-200">
                      {activeDateItem.ordersCount} commande{activeDateItem.ordersCount > 1 ? "s" : ""}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      activeDateItem.netProfit >= 0
                        ? "bg-emerald-100 text-emerald-900 border-emerald-200"
                        : "bg-rose-100 text-rose-900 border-rose-200"
                    }`}>
                      Bénéfice : {formatter.format(activeDateItem.netProfit)}
                    </span>
                  </div>
                </div>

                {/* Tabs switcher */}
                <div className="flex items-center gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setModalTab("orders")}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                      modalTab === "orders"
                        ? "bg-yellow-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Commandes & Articles ({activeDateItem.ordersCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab("profit")}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                      modalTab === "profit"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                    }`}
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    Rentabilité & Bénéfice par Article
                  </button>
                </div>
              </DialogHeader>

              {/* Status Pills Summary */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-semibold mr-1">Statuts :</span>
                {activeDateItem.deliveredCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                    ✓ {activeDateItem.deliveredCount} Livrée{activeDateItem.deliveredCount > 1 ? "s" : ""}
                  </span>
                )}
                {activeDateItem.returnedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-medium">
                    ↺ {activeDateItem.returnedCount} Retournée{activeDateItem.returnedCount > 1 ? "s" : ""}
                  </span>
                )}
                {activeDateItem.confirmedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-medium">
                    • {activeDateItem.confirmedCount} Confirmée{activeDateItem.confirmedCount > 1 ? "s" : ""}
                  </span>
                )}
                {activeDateItem.processingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 font-medium">
                    • {activeDateItem.processingCount} Téléchargée{activeDateItem.processingCount > 1 ? "s" : ""}
                  </span>
                )}
                {activeDateItem.shippedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 font-medium">
                    • {activeDateItem.shippedCount} Expédiée{activeDateItem.shippedCount > 1 ? "s" : ""}
                  </span>
                )}
                {activeDateItem.pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                    • {activeDateItem.pendingCount} En attente
                  </span>
                )}
                {activeDateItem.cancelledCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                    • {activeDateItem.cancelledCount} Annulée{activeDateItem.cancelledCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* TAB 1: COMMANDES & ARTICLES */}
              {modalTab === "orders" && (
                <div className="space-y-4">
                  {/* Status filter for modal */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-700">Liste des commandes de la date :</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2.5 py-1 bg-white font-medium focus:outline-none cursor-pointer"
                    >
                      <option value="all">Tous les statuts ({activeDateItem.ordersCount})</option>
                      <option value="delivered">Livrées uniquement ({activeDateItem.deliveredCount})</option>
                      <option value="returned">Retournées uniquement ({activeDateItem.returnedCount})</option>
                      <option value="confirmed">Confirmées ({activeDateItem.confirmedCount})</option>
                      <option value="other">Autres statuts</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    {activeDateItem.orderFinancialsList
                      .filter(({ order }: any) => {
                        if (statusFilter === "all") return true;
                        if (statusFilter === "delivered") return order.status === "delivered";
                        if (statusFilter === "returned") return order.status === "returned";
                        if (statusFilter === "confirmed") return order.status === "confirmed";
                        if (statusFilter === "other")
                          return !["delivered", "returned", "confirmed"].includes(order.status || "");
                        return true;
                      })
                      .map(({ order, financials }: any) => {
                        const statusConfig =
                          STATUS_LABELS[order.status || "pending"] || STATUS_LABELS.pending;
                        const clientName =
                          order.customer_profile?.full_name ||
                          (order.guest_info as any)?.fullName ||
                          "Client invité";
                        const clientPhone =
                          order.shipping_phone ||
                          order.customer_profile?.phone ||
                          (order.guest_info as any)?.phone ||
                          "";

                        return (
                          <div
                            key={order.id}
                            className={`border rounded-xl p-4 bg-white shadow-2xs transition ${
                              order.status === "delivered"
                                ? "border-emerald-200 hover:border-emerald-300"
                                : order.status === "returned"
                                ? "border-rose-200 hover:border-rose-300"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            {/* Order Header */}
                            <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-100">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-sm">
                                    Commande #{order.id.slice(0, 8)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyOrderId(order.id)}
                                    className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition"
                                    title="Copier l'identifiant complet"
                                  >
                                    {copiedId === order.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <span
                                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}
                                  >
                                    {statusConfig.label}
                                  </span>
                                </div>

                                <p className="text-xs text-slate-600 mt-1">
                                  Client : <strong className="text-slate-800">{clientName}</strong>
                                  {clientPhone && <span className="ml-1 text-slate-500">({clientPhone})</span>}
                                  {order.shipping_city && (
                                    <span className="ml-1 text-slate-500">• {order.shipping_city}</span>
                                  )}
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="font-extrabold text-sm text-slate-900">
                                  {formatter.format(order.total_amount ?? 0)}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-end gap-1">
                                  <Truck className="w-3 h-3 text-slate-400" />
                                  {order.delivery_company || "Transport standard"}
                                </p>
                              </div>
                            </div>

                            {/* Articles Table of this Order */}
                            <div className="pt-3">
                              <p className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                                <Package className="w-3.5 h-3.5 text-slate-500" />
                                Articles de la commande ({(order.order_items || []).length}) :
                              </p>
                              <div className="overflow-x-auto rounded-lg border border-slate-100">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b">
                                      <th className="py-2 px-2.5">Produit</th>
                                      <th className="py-2 px-2.5 text-center">Déclinaison</th>
                                      <th className="py-2 px-2.5 text-center">Qté</th>
                                      <th className="py-2 px-2.5 text-right">Prix Unitaire</th>
                                      <th className="py-2 px-2.5 text-right">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {financials.itemsDetail.map((it: any) => (
                                      <tr key={it.id} className="hover:bg-slate-50/50">
                                        <td className="py-2 px-2.5 font-medium text-slate-900">
                                          {it.productName}
                                        </td>
                                        <td className="py-2 px-2.5 text-center text-slate-600">
                                          {it.sizeValue ? `${it.sizeValue}${it.sizeUnit || ""}` : "-"}
                                        </td>
                                        <td className="py-2 px-2.5 text-center font-bold text-slate-800">
                                          × {it.quantity}
                                        </td>
                                        <td className="py-2 px-2.5 text-right text-slate-700">
                                          {formatter.format(it.unitPrice)}
                                        </td>
                                        <td className="py-2 px-2.5 text-right font-bold text-slate-900">
                                          {formatter.format(it.itemTotal)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Financial outcome footer of order */}
                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs">
                              <span className="text-slate-500">
                                {order.status === "delivered" ? (
                                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Commande livrée avec succès
                                  </span>
                                ) : order.status === "returned" ? (
                                  <span className="text-rose-700 font-semibold flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Colis retourné — Frais de retour déduits (-{formatter.format(financials.returnFeeDeducted)})
                                  </span>
                                ) : (
                                  <span className="text-slate-500 flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" /> Statut : {statusConfig.label}
                                  </span>
                                )}
                              </span>

                              <div className="font-bold">
                                Bénéfice :{" "}
                                <span
                                  className={`${
                                    financials.netProfit > 0
                                      ? "text-emerald-700"
                                      : financials.netProfit < 0
                                      ? "text-rose-600"
                                      : "text-slate-600"
                                  }`}
                                >
                                  {financials.netProfit > 0 ? "+" : ""}
                                  {formatter.format(financials.netProfit)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* TAB 2: RENTABILITÉ & BÉNÉFICE DÉTAILLÉ */}
              {modalTab === "profit" && (
                <div className="space-y-6">
                  {/* Day Profit KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                      <p className="text-[11px] font-semibold text-blue-800 uppercase">Marge Articles</p>
                      <p className="text-base font-bold text-blue-950 mt-0.5">
                        +{formatter.format(activeDateItem.articlesProfit)}
                      </p>
                      <p className="text-[10px] text-blue-600 mt-0.5">Sur articles livrés</p>
                    </div>

                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                      <p className="text-[11px] font-semibold text-indigo-800 uppercase">Bénéfice Livraison</p>
                      <p className="text-base font-bold text-indigo-950 mt-0.5">
                        {activeDateItem.deliveryProfit >= 0 ? "+" : ""}
                        {formatter.format(activeDateItem.deliveryProfit)}
                      </p>
                      <p className="text-[10px] text-indigo-600 mt-0.5">Frais perçus - Coûts réels</p>
                    </div>

                    <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl">
                      <p className="text-[11px] font-semibold text-rose-800 uppercase">Frais de Retour</p>
                      <p className="text-base font-bold text-rose-700 mt-0.5">
                        -{formatter.format(activeDateItem.returnFeesDeducted)}
                      </p>
                      <p className="text-[10px] text-rose-600 mt-0.5">
                        {activeDateItem.returnedCount} retour{activeDateItem.returnedCount > 1 ? "s" : ""}
                      </p>
                    </div>

                    <div className="p-3 bg-emerald-50/90 border-2 border-emerald-300 rounded-xl shadow-xs">
                      <p className="text-[11px] font-bold text-emerald-900 uppercase">Bénéfice Net Jour</p>
                      <p className="text-base font-extrabold text-emerald-800 mt-0.5">
                        {activeDateItem.netProfit >= 0 ? "+" : ""}
                        {formatter.format(activeDateItem.netProfit)}
                      </p>
                      <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                        {activeDateItem.marginPercent.toFixed(1)}% Marge
                      </p>
                    </div>
                  </div>

                  {/* List of orders with granular profit breakdowns */}
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-slate-700">
                      Calcul détaillé du bénéfice pour chaque commande de la journée :
                    </p>

                    {activeDateItem.orderFinancialsList.map(({ order, financials }: any) => {
                      const isDelivered = order.status === "delivered";
                      const isReturned = order.status === "returned";

                      return (
                        <div
                          key={order.id}
                          className={`border rounded-xl p-4 bg-white shadow-2xs ${
                            isDelivered
                              ? "border-emerald-200"
                              : isReturned
                              ? "border-rose-200"
                              : "border-slate-200 opacity-75"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">
                                  Commande #{order.id.slice(0, 8)}
                                </span>
                                <span
                                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                                    isDelivered
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                      : isReturned
                                      ? "bg-rose-100 text-rose-800 border-rose-200"
                                      : "bg-slate-100 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  {STATUS_LABELS[order.status || "pending"]?.label || order.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                Transporteur : <strong>{order.delivery_company || "Standard"}</strong>
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-slate-500">Bénéfice Commande :</p>
                              <p
                                className={`text-base font-extrabold ${
                                  financials.netProfit > 0
                                    ? "text-emerald-700"
                                    : financials.netProfit < 0
                                    ? "text-rose-600"
                                    : "text-slate-600"
                                }`}
                              >
                                {financials.netProfit > 0 ? "+" : ""}
                                {formatter.format(financials.netProfit)}
                              </p>
                            </div>
                          </div>

                          {/* If Delivered: detailed profit per article + delivery profit */}
                          {isDelivered && (
                            <div className="pt-3 space-y-3">
                              <div>
                                <p className="text-xs font-semibold text-slate-700 mb-1.5">
                                  Bénéfice par article (`Prix vente - Coût d'achat`) :
                                </p>
                                <div className="overflow-x-auto rounded-lg border border-slate-100">
                                  <table className="w-full text-left text-xs">
                                    <thead>
                                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b">
                                        <th className="py-2 px-2.5">Article</th>
                                        <th className="py-2 px-2.5 text-center">Qté</th>
                                        <th className="py-2 px-2.5 text-right">Prix Vente</th>
                                        <th className="py-2 px-2.5 text-right">Coût Achat</th>
                                        <th className="py-2 px-2.5 text-right font-bold text-emerald-700">
                                          Bénéfice Net Article
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {financials.itemsDetail.map((it: any) => (
                                        <tr key={it.id} className="hover:bg-slate-50/50">
                                          <td className="py-2 px-2.5 font-medium text-slate-900">
                                            {it.productName}
                                            {it.sizeValue && (
                                              <span className="text-[10px] text-slate-500 block">
                                                {it.sizeValue}{it.sizeUnit || ""}
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2 px-2.5 text-center font-bold text-slate-800">
                                            × {it.quantity}
                                          </td>
                                          <td className="py-2 px-2.5 text-right text-slate-700">
                                            {formatter.format(it.unitPrice)}
                                          </td>
                                          <td className="py-2 px-2.5 text-right text-slate-500">
                                            {formatter.format(it.costPrice)}
                                          </td>
                                          <td className="py-2 px-2.5 text-right font-bold text-emerald-700">
                                            +{formatter.format(it.itemProfit)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className="bg-blue-50/40 font-bold text-xs border-t">
                                        <td colSpan={4} className="py-2 px-2.5 text-blue-900">
                                          Sous-total Bénéfice Articles
                                        </td>
                                        <td className="py-2 px-2.5 text-right font-extrabold text-blue-950">
                                          +{formatter.format(financials.articlesProfit)}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>

                              {/* Delivery profit breakdown */}
                              <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-bold text-indigo-900">Bénéfice Livraison :</span>
                                  <span className="text-indigo-700 ml-1">
                                    Frais perçus client ({formatter.format(financials.shippingFee)}) - Coût réel transporteur ({formatter.format(financials.deliveryCost)})
                                  </span>
                                </div>
                                <span className="font-extrabold text-indigo-950 text-sm">
                                  {financials.deliveryProfit >= 0 ? "+" : ""}{formatter.format(financials.deliveryProfit)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* If Returned: deduct return fee */}
                          {isReturned && (
                            <div className="pt-3">
                              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-bold text-rose-900 flex items-center gap-1">
                                    <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                                    Commande Retournée — Frais de retour transporteur déduit :
                                  </span>
                                  <p className="text-[11px] text-rose-700 mt-0.5">
                                    Frais facturés par la société de livraison pour le retour du colis.
                                  </p>
                                </div>
                                <span className="font-extrabold text-rose-700 text-sm">
                                  -{formatter.format(financials.returnFeeDeducted)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Other status */}
                          {!isDelivered && !isReturned && (
                            <div className="pt-2 text-xs text-slate-500 italic">
                              Cette commande n'est ni livrée ni retournée (statut actuel : {STATUS_LABELS[order.status || "pending"]?.label || order.status}). Le bénéfice n'est pas encore comptabilisé.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
