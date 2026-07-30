"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CartSession, DashboardOrder, InventoryProduct } from "../types";

const LOW_STOCK_THRESHOLD = 12;
const METRIC_SKELETONS = [0, 1, 2, 3];

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

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
  const todayStr = new Date().toISOString().split("T")[0];
  let todayRevenue = 0;
  let todayCount = 0;

  for (const order of orders) {
    if (!order.created_at) continue;
    const dateStr = new Date(order.created_at).toISOString().split("T")[0];
    if (dateStr === todayStr) {
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

  const metrics = [
    {
      label: "CA Aujourd'hui",
      value: formatCurrency(todayRevenue, currency),
      helper: `${todayCount} commande${todayCount > 1 ? "s" : ""} aujourd'hui`,
      highlight: true,
    },
    {
      label: "Chiffre d'affaires total",
      value: formatCurrency(totalRevenue, currency),
      helper: `${list.length} commandes au total`,
    },
    {
      label: "Commandes en cours",
      value: activeOrders.toString(),
      helper: "En cours de livraison / traitement",
    },
    {
      label: "SKU Stock Faible",
      value: lowStockSkus.toString(),
      helper: `≤ ${LOW_STOCK_THRESHOLD} unités restantes`,
    },
  ];

  if (isLoading && !list.length) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {METRIC_SKELETONS.map((item) => (
          <Card key={item} className="p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-6 w-28" />
            <Skeleton className="mt-2 h-3 w-40" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card
          key={metric.label}
          className={`space-y-2 border p-4 rounded-2xl ${
            metric.highlight
              ? "bg-yellow-500/10 border-yellow-200 text-yellow-900"
              : "bg-white text-slate-900"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {metric.label}
          </p>
          <p className="text-2xl font-bold text-foreground">
            {metric.value}
          </p>
          <p className="text-xs text-muted-foreground">{metric.helper}</p>
        </Card>
      ))}
    </div>
  );
}
