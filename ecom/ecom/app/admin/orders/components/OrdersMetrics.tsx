"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminOrder } from "../types";

const currencyFormatter = (value: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

type OrdersMetricsProps = {
  orders?: AdminOrder[] | null;
  isLoading: boolean;
};

const METRIC_SKELETONS = [0, 1, 2, 3];

export function OrdersMetrics({ orders, isLoading }: OrdersMetricsProps) {
  const list = orders ?? [];
  const currency = list[0]?.currency ?? "TND";

  const totalRevenue = list.reduce(
    (sum, order) => sum + (order.total_amount ?? 0),
    0
  );
  const pendingOrders = list.filter((order) =>
    ["pending", "confirmed", "processing", "shipped"].includes(
      order.status ?? ""
    )
  );
  const deliveredThisMonth = list.filter((order) => {
    if (!order.created_at) return false;
    const created = new Date(order.created_at);
    const now = new Date();
    return (
      order.status === "delivered" &&
      created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear()
    );
  });

  const metrics = [
    {
      label: "Gross revenue",
      value: currencyFormatter(totalRevenue, currency),
      helper: `${list.length} total orders recorded`,
    },
    {
      label: "Open orders",
      value: pendingOrders.length.toString(),
      helper: "Awaiting fulfillment",
    },
    {
      label: "Avg. order value",
      value: list.length
        ? currencyFormatter(totalRevenue / list.length, currency)
        : currencyFormatter(0, currency),
      helper: "Rolling 30-day average",
    },
    {
      label: "Delivered this month",
      value: deliveredThisMonth.length.toString(),
      helper: "Completed & delivered",
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
