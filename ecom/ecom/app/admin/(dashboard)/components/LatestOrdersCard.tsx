"use client";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardOrder } from "../types";
import { OrderStatusBadge } from "../../orders/components/OrderStatusBadge";
import type { OrderStatus } from "../../orders/types";

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

type LatestOrdersCardProps = {
  orders?: DashboardOrder[] | null;
  isLoading: boolean;
};

export function LatestOrdersCard({ orders, isLoading }: LatestOrdersCardProps) {
  const list = [...(orders ?? [])]
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 6);

  if (isLoading && !list.length) {
    return (
      <Card className="space-y-4 border bg-card p-4">
        <Skeleton className="h-5 w-32" />
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-10 w-full" />
        ))}
      </Card>
    );
  }

  const currency = list.find((order) => order.currency)?.currency ?? "TND";

  return (
    <Card className="space-y-4 border bg-card p-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Recent orders
        </p>
        <p className="text-2xl font-semibold text-foreground">
          {formatCurrency(
            list.reduce((sum, order) => sum + (order.total_amount ?? 0), 0),
            currency
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          Combined total of the latest {list.length} orders
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((order) => {
              const status = (order.status ?? "pending") as OrderStatus;
              const total = formatCurrency(order.total_amount ?? 0, currency);
              const name =
                order.customer_profile?.full_name ||
                (order.guest_info as { full_name?: string } | null)
                  ?.full_name ||
                "Guest checkout";
              return (
                <TableRow key={order.id}>
                  <TableCell className="font-semibold">
                    #{order.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-foreground">{name}</div>
                    <p className="text-xs text-muted-foreground">
                      {order.shipping_phone ||
                        order.customer_profile?.phone ||
                        "No phone"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={status} />
                  </TableCell>
                  <TableCell className="text-right font-medium text-foreground">
                    {total}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
