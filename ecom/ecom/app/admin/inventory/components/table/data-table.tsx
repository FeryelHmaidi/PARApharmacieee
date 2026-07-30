"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Tag, Building2 } from "lucide-react";
import ProductUploadSheet from "../ProductUploadSheet";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [nameFilter, setNameFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");

  const filteredData = useMemo(() => {
    return (data as any[]).filter((product) => {
      // 1. Search by Name / SKU
      if (nameFilter.trim()) {
        const q = nameFilter.toLowerCase().trim();
        const matchesName = product.name?.toLowerCase().includes(q);
        const matchesSku = product.sku?.toLowerCase().includes(q);
        if (!matchesName && !matchesSku) return false;
      }

      // 2. Search by Category (Tags)
      if (categoryFilter.trim()) {
        const catQ = categoryFilter.toLowerCase().trim();
        const tags = product.tags ?? [];
        const matchesCat = tags.some((t: any) =>
          t.name?.toLowerCase().includes(catQ)
        );
        if (!matchesCat) return false;
      }

      // 3. Search by Brand (Marque)
      if (brandFilter.trim()) {
        const brandQ = brandFilter.toLowerCase().trim();
        const matchesName = product.name?.toLowerCase().includes(brandQ);
        const matchesDesc = product.description?.toLowerCase().includes(brandQ);
        const tags = product.tags ?? [];
        const matchesTag = tags.some((t: any) =>
          t.name?.toLowerCase().includes(brandQ)
        );
        if (!matchesName && !matchesDesc && !matchesTag) return false;
      }

      return true;
    });
  }, [data, nameFilter, categoryFilter, brandFilter]);

  const table = useReactTable({
    data: filteredData as TData[],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 py-2">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher produit / SKU..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="pl-9 bg-white border-slate-200 text-xs sm:text-sm"
              />
            </div>

            <div className="relative">
              <Tag className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher par catégorie..."
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="pl-9 bg-white border-slate-200 text-xs sm:text-sm"
              />
            </div>

            <div className="relative">
              <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher par marque..."
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="pl-9 bg-white border-slate-200 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="self-end lg:self-auto">
            <ProductUploadSheet />
          </div>
        </div>
      </div>
      <div className="w-full overflow-x-auto rounded-md border">
        <Table className="w-full min-w-[650px]">
          <TableHeader className="">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className={
                        header.index === 0
                          ? "pl-8 text-left"
                          : header.index === headerGroup.headers.length - 1
                          ? ""
                          : "text-left"
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{
                        width: cell.column.columnDef.size
                          ? `${cell.column.columnDef.size}px`
                          : "auto",
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-3 py-4">
                    <p className="text-sm text-muted-foreground">
                      Aucun produit pour le moment.
                    </p>
                    <ProductUploadSheet />
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
