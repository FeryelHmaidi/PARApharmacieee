"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrders } from "../hooks/useOrders";
import { ManageOrderSheet } from "./ManageOrderSheet";
import { OrdersMetrics } from "./OrdersMetrics";
import { OrdersTrendChart } from "./OrdersTrendChart";
import { OrdersTable } from "./OrdersTable";

export default function PageModel() {
  const { data, isLoading, isFetching, error, refetch } = useOrders();
  const orders = data ?? [];
  const hasOrders = orders.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div></div>
        <ManageOrderSheet
          trigger={
            <Button className="inline-flex items-center gap-2 bg-yellow-600 text-white hover:bg-yellow-700">
              <Plus className="h-4 w-4" />
              New order
            </Button>
          }
        />
      </div>

      <OrdersMetrics orders={orders} isLoading={isLoading} />
      <OrdersTrendChart orders={orders} isLoading={isLoading || isFetching} />

      {isLoading && !hasOrders ? <Skeleton className="h-80 w-full" /> : null}

      <OrdersTable
        orders={orders}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error}
        refetch={refetch}
      />
    </div>
  );
}
