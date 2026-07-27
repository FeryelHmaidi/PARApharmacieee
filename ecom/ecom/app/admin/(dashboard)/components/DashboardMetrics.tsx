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
  const activeCarts = getActiveCarts(carts);

  const metrics = [
    {
      label: "Gross revenue",
      value: formatCurrency(totalRevenue, currency),
      helper: `${list.length} orders in view`,
    },
    {
      label: "Active orders",
      value: activeOrders.toString(),
      helper: "In fulfillment pipeline",
    },
    {
      label: "Low-stock SKUs",
      value: lowStockSkus.toString(),
      helper: `≤ ${LOW_STOCK_THRESHOLD} units remaining`,
    },
    {
      label: "Active carts",
      value: activeCarts.toString(),
      helper: "Shoppers still browsing",
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
        <Card key={metric.label} className="space-y-2 border bg-card p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            {metric.label}
          </p>
          <p className="text-2xl font-semibold text-foreground">
            {metric.value}
          </p>
          <p className="text-sm text-muted-foreground">{metric.helper}</p>
        </Card>
      ))}
    </div>
  );
}
