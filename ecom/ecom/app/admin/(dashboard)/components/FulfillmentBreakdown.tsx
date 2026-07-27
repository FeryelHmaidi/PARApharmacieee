"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Constants } from "@/types/supabase";
import type { DashboardOrder } from "../types";

const FALLBACK_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

type FulfillmentBreakdownProps = {
  orders?: DashboardOrder[] | null;
  isLoading: boolean;
};

const toPercent = (count: number, total: number) =>
  total === 0 ? 0 : Math.round((count / total) * 100);

export function FulfillmentBreakdown({
  orders,
  isLoading,
}: FulfillmentBreakdownProps) {
  const statuses = Constants?.public?.Enums?.order_status?.length
    ? [...Constants.public.Enums.order_status]
    : FALLBACK_STATUSES;

  const list = orders ?? [];
  const distribution = statuses.map((status) => ({
    status,
    count: list.filter((order) => order.status === status).length,
  }));
  const total = distribution.reduce((sum, item) => sum + item.count, 0);
  const delivered =
    distribution.find((item) => item.status === "delivered")?.count ?? 0;
  const deliveredRate = toPercent(delivered, total);

  if (isLoading && !list.length) {
    return (
      <Card className="space-y-4 border bg-card p-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-24" />
        <div className="space-y-3">
          {statuses.slice(0, 4).map((status) => (
            <div key={status} className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 border bg-card p-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Fulfillment health
        </p>
        <p className="text-2xl font-semibold text-foreground">
          {deliveredRate}%
        </p>
        <p className="text-sm text-muted-foreground">
          Delivered orders across the selected range
        </p>
      </div>

      <div className="space-y-4">
        {distribution.map((item) => {
          const percent = toPercent(item.count, total);
          return (
            <div key={item.status} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize text-muted-foreground">
                  {item.status.replace(/_/g, " ")}
                </span>
                <span className="font-medium text-foreground">
                  {item.count}
                  {total ? ` · ${percent}%` : ""}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-yellow-500 transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
