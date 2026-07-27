"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "./data-table";
import { inventoryColumns } from "./columns";
import { useFetchProducts } from "../../hooks/useFetchProducts";
import type { ProductWithRelations } from "../../types";
import ProductUploadSheet from "../ProductUploadSheet";

export default function Table() {
  const {
    data: products,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useFetchProducts();

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

    if (!products || products.length === 0) {
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
          data={(products ?? []) as ProductWithRelations[]}
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
