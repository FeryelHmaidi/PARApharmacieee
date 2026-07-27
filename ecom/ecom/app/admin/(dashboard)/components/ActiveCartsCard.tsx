"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CartSession } from "../types";

const relativeTimeFromNow = (value?: string | null) => {
  if (!value) return "Recently";
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return "Recently";
  const diffMs = Date.now() - target.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) return `${diffMinutes || 1}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 48) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

type ActiveCartsCardProps = {
  carts?: CartSession[] | null;
  isLoading: boolean;
  error?: Error | null;
};

export function ActiveCartsCard({
  carts,
  isLoading,
  error,
}: ActiveCartsCardProps) {
  const list = carts ?? [];
  const currency = list.find((cart) => cart.currency)?.currency ?? "TND";
  const activeList = list
    .filter((cart) => {
      if (cart.status === "converted") return false;
      const updated = cart.updated_at ? new Date(cart.updated_at).getTime() : 0;
      if (!updated) return true;
      const hoursAgo = (Date.now() - updated) / 36e5;
      return hoursAgo <= 48;
    })
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  const totalValue = activeList.reduce(
    (sum, cart) => sum + (cart.subtotal ?? 0),
    0
  );

  if (isLoading && !list.length) {
    return (
      <Card className="space-y-4 border bg-card p-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-28" />
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-12 w-full" />
        ))}
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="space-y-2 border bg-card p-4">
        <p className="text-sm font-semibold text-red-600">
          Unable to load carts
        </p>
        <p className="text-xs text-muted-foreground">{error.message}</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 border bg-card p-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Active carts
        </p>
        <p className="text-2xl font-semibold text-foreground">
          {formatCurrency(totalValue, currency)}
        </p>
        <p className="text-sm text-muted-foreground">
          {activeList.length} shoppers still browsing
        </p>
      </div>
      {activeList.length ? (
        <ul className="space-y-3">
          {activeList.slice(0, 4).map((cart) => (
            <li
              key={cart.id}
              className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {cart.user_id
                    ? `User ${cart.user_id.slice(0, 8)}`
                    : "Guest session"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {cart.items_count} items ·{" "}
                  {formatCurrency(cart.subtotal ?? 0, currency)}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p className="font-medium capitalize">
                  {cart.status.replace(/_/g, " ")}
                </p>
                <p>{relativeTimeFromNow(cart.updated_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No active carts detected in the last 48 hours.
        </p>
      )}
    </Card>
  );
}
