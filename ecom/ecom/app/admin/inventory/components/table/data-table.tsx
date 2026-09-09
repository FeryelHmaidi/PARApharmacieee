"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Search,
  Tag,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import ProductUploadSheet from "../ProductUploadSheet";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [nameFilter, setNameFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const filteredData = useMemo(() => {
    return (data as any[]).filter((product) => {
      // 1. Search by Name / SKU
      if (nameFilter.trim()) {
        const q = nameFilter.toLowerCase().trim();
        const matchesName = product.name?.toLowerCase().includes(q);
        const matchesSku = product.sku?.toLowerCase().includes(q);
        if (!matchesName && !matchesSku) return false;
      }

      // 2. Search by Category (Tags, Category, Subcategory)
      if (categoryFilter.trim()) {
        const catQ = categoryFilter.toLowerCase().trim();
        const tags = product.tags ?? [];
        const matchesTag = tags.some((t: any) =>
          t.name?.toLowerCase().includes(catQ)
        );
        const matchesCatField =
          product.category?.toLowerCase().includes(catQ) ||
          product.sub_category?.toLowerCase().includes(catQ);

        if (!matchesTag && !matchesCatField) return false;
      }

      // 3. Search by Brand (Marque, Name, Description, Tags)
      if (brandFilter.trim()) {
        const brandQ = brandFilter.toLowerCase().trim();
        const matchesName = product.name?.toLowerCase().includes(brandQ);
        const matchesDesc = product.description?.toLowerCase().includes(brandQ);
        const matchesBrandField = product.brand?.toLowerCase().includes(brandQ);
        const tags = product.tags ?? [];
        const matchesTag = tags.some((t: any) =>
          t.name?.toLowerCase().includes(brandQ)
        );
        if (!matchesName && !matchesDesc && !matchesBrandField && !matchesTag) return false;
      }

      return true;
    });
  }, [data, nameFilter, categoryFilter, brandFilter]);

  // Reset pageIndex when filter inputs change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [nameFilter, categoryFilter, brandFilter]);

  const table = useReactTable({
    data: filteredData as TData[],
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="w-full space-y-3">
      {/* Search & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 py-1">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Rechercher produit / SKU..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="pl-8 bg-white border-slate-200 text-xs h-9"
            />
          </div>

          <div className="relative">
            <Tag className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Rechercher par catégorie..."
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-8 bg-white border-slate-200 text-xs h-9"
            />
          </div>

          <div className="relative">
            <Building2 className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Rechercher par marque..."
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="pl-8 bg-white border-slate-200 text-xs h-9"
            />
          </div>
        </div>

        <div className="self-end lg:self-auto shrink-0">
          <ProductUploadSheet />
        </div>
      </div>

      {/* Table Content */}
      <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
        <Table className="w-full min-w-[850px] text-xs">
          <TableHeader className="bg-slate-50/80">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-slate-200">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="py-2.5 px-2 text-left font-semibold text-slate-700 text-xs whitespace-nowrap"
                      style={{
                        width: header.column.columnDef.size
                          ? `${header.column.columnDef.size}px`
                          : "auto",
                      }}
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
                  className="hover:bg-slate-50/60 transition border-b border-slate-100 last:border-0"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="py-2 px-2 align-middle"
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
                  <div className="flex flex-col items-center justify-center gap-2 py-4">
                    <p className="text-xs text-muted-foreground">
                      Aucun produit trouvé.
                    </p>
                    <ProductUploadSheet />
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination & Rows Per Page Control */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-2 text-xs text-slate-600 bg-slate-50/60 rounded-lg border border-slate-200">
        <div className="flex items-center gap-3">
          <span className="font-medium text-slate-700">
            Total : <span className="font-bold text-yellow-800">{filteredData.length}</span> produit(s)
          </span>

          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <span className="text-slate-500">Lignes par page :</span>
            <select
              value={pagination.pageSize >= 9999 ? 9999 : pagination.pageSize}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPagination({
                  pageIndex: 0,
                  pageSize: val >= 9999 ? Math.max(filteredData.length, 1) : val,
                });
              }}
              className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-yellow-500 cursor-pointer shadow-2xs"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
              <option value={9999}>Tous</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">
            Page <span className="font-semibold text-slate-800">{table.getState().pagination.pageIndex + 1}</span> sur{" "}
            <span className="font-semibold text-slate-800">{table.getPageCount() || 1}</span>
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Première page"
            >
              <ChevronsLeft className="h-3.5 w-3.5 text-slate-600" />
            </button>
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Page précédente"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-slate-600" />
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Page suivante"
            >
              <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
            </button>
            <button
              type="button"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Dernière page"
            >
              <ChevronsRight className="h-3.5 w-3.5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

