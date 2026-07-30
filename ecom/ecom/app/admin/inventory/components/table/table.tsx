"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "./data-table";
import { inventoryColumns } from "./columns";
import { useFetchProducts } from "../../hooks/useFetchProducts";
import type { ProductWithRelations } from "../../types";
import ProductUploadSheet from "../ProductUploadSheet";

const getProductPriority = (p: ProductWithRelations) => {
  if (p.status === "inactive") return 4; // Inactive/deleted at bottom

  const variants = p.variants ?? [];
  if (!variants.length) return 1;

  const now = Date.now();
  const allExpired = variants.every(
    (variant) =>
      !!variant.expiry_date && new Date(variant.expiry_date).getTime() < now
  );
  if (allExpired) return 3; // Expired near bottom

  const hasLowStock = variants.some((variant) => {
    const stock = variant.stock ?? 0;
    return stock > 0 && stock <= 10;
  });

  if (hasLowStock) return 2; // Low stock

  return 1; // Active OK at top
};

export default function Table() {
  const {
    data: products,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useFetchProducts();

  const sortedProducts = useMemo(() => {
    if (!products || !products.length) return [];
    return [...(products as ProductWithRelations[])].sort((a, b) => {
      const priorityA = getProductPriority(a);
      const priorityB = getProductPriority(b);
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [products]);

  const renderInner = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
          <p className="text-sm text-muted-foreground">Loading products...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <div className="text-sm text-red-500">{error.message}</div>
          <Button onClick={() => refetch()} disabled={isFetching}>
            Retry
          </Button>
        </div>
      );
    }

    if (!sortedProducts || sortedProducts.length === 0) {
      return (
        <>
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">No products found.</p>
            <div className="flex  items-center gap-3">
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                Refresh
              </Button>{" "}
              <ProductUploadSheet />{" "}
            </div>
          </div>
        </>
      );
    }

    return (
      <div className="px-4 py-2">
        <DataTable
          columns={inventoryColumns}
          data={sortedProducts}
        />
      </div>
    );
  };

  return (
    <div className="w-full py-6">
      <Card className="overflow-hidden">{renderInner()}</Card>
    </div>
  );
}
