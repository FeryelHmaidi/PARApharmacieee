"use client";
import Table from "./table/table";
import { StockValueCard } from "../../(dashboard)/components/StockValueCard";
import { useInventorySnapshot } from "../../(dashboard)/hooks/useInventorySnapshot";

const PageModel = () => {
  const { data: inventory, isLoading, isFetching } = useInventorySnapshot();

  return (
    <div className="flex flex-col gap-6">
      <StockValueCard inventory={inventory} isLoading={isLoading || isFetching} />
      <Table />
    </div>
  );
};

export default PageModel;
