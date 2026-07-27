"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ManageOrderSheet } from "./ManageOrderSheet";
import { OrderStatusBadge } from "./OrderStatusBadge";
import {
  useCancelOrder,
  useUpdateOrderStatus,
} from "../hooks/useOrderMutations";
import type { AdminOrder, OrderStatus } from "../types";
import { Constants } from "@/types/supabase";
import { Loader2, MoreHorizontal, RefreshCcw, Search } from "lucide-react";

const STATUS_OPTIONS = ["all", ...Constants.public.Enums.order_status] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number];

type OrdersTableProps = {
  orders?: AdminOrder[] | null;
  isLoading: boolean;
  isFetching: boolean;
  error?: Error | null;
  refetch: () => Promise<any> | void;
};

const EMPTY_STATES: Record<StatusFilter, string> = {
  all: "No orders found yet.",
  pending: "No pending orders right now.",
  confirmed: "No confirmed orders right now.",
  processing: "No orders are processing.",
  shipped: "No orders awaiting delivery.",
  delivered: "No delivered orders in the current view.",
  cancelled: "No cancelled orders in the current view.",
  returned: "No returned orders in the current view.",
};

export function OrdersTable({
  orders,
  isLoading,
  isFetching,
  error,
  refetch,
}: OrdersTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [orderToCancel, setOrderToCancel] = useState<AdminOrder | null>(null);
  const updateStatus = useUpdateOrderStatus();
  const cancelOrder = useCancelOrder();

  const filteredOrders = useMemo(() => {
    const list = orders ?? [];
    return list.filter((order) => {
      const matchesSearch = [
        order.id,
        order.customer_profile?.full_name,
        (order.guest_info as { full_name?: string } | null)?.full_name,
        order.shipping_phone,
      ]
        .filter(Boolean)
        .some((value) =>
          value?.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const handleStatusChange = async (
    orderId: string,
    nextStatus: OrderStatus
  ) => {
    try {
      await updateStatus.mutateAsync({ orderId, status: nextStatus });
      toast.success("Order status updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to update status"
      );
    }
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    try {
      await cancelOrder.mutateAsync({
        orderId: orderToCancel.id,
        notes: orderToCancel.notes ?? undefined,
      });
      toast.success("Order cancelled");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to cancel order"
      );
    } finally {
      setOrderToCancel(null);
    }
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={7}>
            <div className="flex flex-col gap-2 py-8">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={7}>
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-red-600">{error.message}</p>
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex items-center gap-2"
              >
                <RefreshCcw className="h-4 w-4" /> Retry
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (!filteredOrders.length) {
      return (
        <TableRow>
          <TableCell colSpan={7}>
            <div className="py-10 text-center text-sm text-muted-foreground">
              {EMPTY_STATES[statusFilter]}
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return filteredOrders.map((order) => {
      const name =
        order.customer_profile?.full_name ||
        (order.guest_info as { full_name?: string } | null)?.full_name ||
        "Guest checkout";
      const formattedDate = order.created_at
        ? format(new Date(order.created_at), "PPpp")
        : "—";
      const paymentStatus = order.payment_status ?? "pending";
      const paymentMethod = order.payment_method ?? "—";
      const status = (order.status ?? "pending") as OrderStatus;

      return (
        <TableRow key={order.id} className="align-top">
          <TableCell>
            <div className="text-sm font-semibold">#{order.id.slice(0, 8)}</div>
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </TableCell>
          <TableCell>
            <div className="font-medium">{name}</div>
            <p className="text-xs text-muted-foreground">
              {order.shipping_phone || "—"}
            </p>
          </TableCell>
          <TableCell>
            <div className="text-sm font-semibold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: order.currency ?? "TND",
              }).format(order.total_amount ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {paymentMethod.toUpperCase()}
            </p>
          </TableCell>
          <TableCell>
            <Badge variant="secondary" className="capitalize">
              {paymentStatus.replace("_", " ")}
            </Badge>
          </TableCell>
          <TableCell>
            <Select
              value={status}
              onValueChange={(value) =>
                handleStatusChange(order.id, value as OrderStatus)
              }
              disabled={updateStatus.isPending}
            >
              <SelectTrigger className="h-9 w-full justify-between gap-3 pr-2 text-xs">
                <OrderStatusBadge
                  status={status}
                  className="pointer-events-none text-xs"
                />
              </SelectTrigger>
              <SelectContent>
                {Constants.public.Enums.order_status.map((option) => (
                  <SelectItem key={option} value={option}>
                    <OrderStatusBadge status={option as OrderStatus} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableCell>

          <TableCell className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <ManageOrderSheet
                  order={order}
                  trigger={<DropdownMenuItem>Edit order</DropdownMenuItem>}
                />
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(order.id)}
                >
                  Copy order ID
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-rose-600 focus:text-rose-600"
                  onClick={() => setOrderToCancel(order)}
                >
                  Cancel order
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <Card className="space-y-4 border bg-card p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by ID, customer, or phone"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status} className="capitalize">
                  {status.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          className="inline-flex items-center gap-2"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{renderBody()}</TableBody>
        </Table>
      </div>

      <AlertDialog
        open={Boolean(orderToCancel)}
        onOpenChange={(open) => !open && setOrderToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel order</AlertDialogTitle>
            <AlertDialogDescription>
              {orderToCancel ? (
                <span>
                  You are about to cancel order{" "}
                  <strong>#{orderToCancel.id.slice(0, 8)}</strong>. This
                  customer will no longer appear in fulfillment queues.
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={handleConfirmCancel}
              disabled={cancelOrder.isPending}
            >
              {cancelOrder.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Cancel order"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
