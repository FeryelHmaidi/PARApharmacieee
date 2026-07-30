"use client";

import { DashboardMetrics } from "./DashboardMetrics";
import { RevenueTrendChart } from "./RevenueTrendChart";
import { FulfillmentBreakdown } from "./FulfillmentBreakdown";
import { InventoryHealth } from "./InventoryHealth";
import { ActiveCartsCard } from "./ActiveCartsCard";
import { LatestOrdersCard } from "./LatestOrdersCard";
import { ProductCategoryStatsCard } from "./ProductCategoryStatsCard";
import { RevenueByDateCard } from "./RevenueByDateCard";
import { useDashboardOrders } from "../hooks/useDashboardOrders";
import { useInventorySnapshot } from "../hooks/useInventorySnapshot";
import { useCartSessions } from "../hooks/useCartSessions";

export default function PageModel() {
  const {
    data: orders,
    isLoading: ordersLoading,
    isFetching: ordersFetching,
  } = useDashboardOrders();
  const {
    data: inventory,
    isLoading: inventoryLoading,
    isFetching: inventoryFetching,
  } = useInventorySnapshot();
  const {
    data: carts,
    isLoading: cartsLoading,
    isFetching: cartsFetching,
    error: cartsError,
  } = useCartSessions();
  return (
    <div className="flex flex-col gap-8">
      <DashboardMetrics
        orders={orders}
        inventory={inventory}
        carts={carts}
        isLoading={ordersLoading || inventoryLoading || cartsLoading}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueTrendChart
            orders={orders}
            isLoading={ordersLoading || ordersFetching}
          />
        </div>
        <FulfillmentBreakdown
          orders={orders}
          isLoading={ordersLoading || ordersFetching}
        />
      </div>

      <RevenueByDateCard orders={orders} isLoading={ordersLoading || ordersFetching} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <InventoryHealth
            inventory={inventory}
            isLoading={inventoryLoading || inventoryFetching}
          />
        </div>
        <ActiveCartsCard
          carts={carts}
          isLoading={cartsLoading || cartsFetching}
          error={cartsError}
        />
      </div>

      <ProductCategoryStatsCard orders={orders} isLoading={ordersLoading || ordersFetching} />

      <LatestOrdersCard orders={orders} isLoading={ordersLoading} />
    </div>
  );
}
