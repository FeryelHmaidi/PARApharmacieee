"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, PackageSearch, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrders } from "../hooks/useOrders";
import { ManageOrderSheet } from "./ManageOrderSheet";
import { OrdersMetrics } from "./OrdersMetrics";
import { OrdersTrendChart } from "./OrdersTrendChart";
import { OrdersTable } from "./OrdersTable";
import { ReturnsReceivedTable } from "./ReturnsReceivedTable";

export default function PageModel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<string>(
    tabParam === "returns" ? "returns" : "orders"
  );

  useEffect(() => {
    if (tabParam === "returns") {
      setActiveTab("returns");
    } else if (tabParam === "orders" || !tabParam) {
      setActiveTab("orders");
    }
  }, [tabParam]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    if (val === "returns") {
      router.replace("/admin/orders?tab=returns", { scroll: false });
    } else {
      router.replace("/admin/orders", { scroll: false });
    }
  };

  const { data, isLoading, isFetching, error, refetch } = useOrders();
  const orders = data ?? [];
  const hasOrders = orders.length > 0;

  const returnsCount = useMemo(() => {
    return orders.filter((o) => o.status === "retour_recu").length;
  }, [orders]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header with Tabs & New Order */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full sm:w-auto">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-11 w-full sm:w-auto">
            <TabsTrigger
              value="orders"
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-xs"
            >
              <PackageSearch className="h-4 w-4 text-slate-700" />
              <span>Toutes les commandes</span>
              <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0 font-bold bg-slate-200">
                {orders.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="returns"
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-xs"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retours Reçus</span>
              <Badge
                className={`ml-1 text-[11px] px-1.5 py-0 font-bold ${
                  activeTab === "returns"
                    ? "bg-white text-purple-900"
                    : "bg-purple-100 text-purple-800 border-purple-200"
                }`}
              >
                {returnsCount}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <ManageOrderSheet
          trigger={
            <Button className="inline-flex items-center gap-2 bg-yellow-600 text-white hover:bg-yellow-700 h-10 shadow-xs">
              <Plus className="h-4 w-4" />
              New order
            </Button>
          }
        />
      </div>

      {activeTab === "orders" ? (
        <div className="flex flex-col gap-8">
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
      ) : (
        <div className="space-y-6">
          <ReturnsReceivedTable
            orders={orders}
            isLoading={isLoading}
            isFetching={isFetching}
            error={error}
            refetch={refetch}
          />
        </div>
      )}
    </div>
  );
}
