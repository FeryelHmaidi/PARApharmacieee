"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { InventoryProduct } from "../types";

const LOW_STOCK_THRESHOLD = 12;
const EXPIRY_WINDOW_DAYS = 60;

type InventoryHealthProps = {
  inventory?: InventoryProduct[] | null;
  isLoading: boolean;
};

type InventoryRow = {
  id: string;
  name: string;
  sku: string;
  subtitle: string;
  meta: string;
  sortValue?: number;
};

const toSizeLabel = (variant: InventoryProduct["variants"][number]) => {
  if (variant.size_value && variant.size_unit) {
    return `${variant.size_value}${variant.size_unit}`;
  }
  return "Std.";
};

const buildLowStockRows = (
  inventory?: InventoryProduct[] | null
): InventoryRow[] => {
  if (!inventory?.length) return [];
  const rows: InventoryRow[] = [];
  inventory.forEach((product) => {
    product.variants.forEach((variant) => {
      if ((variant.stock ?? 0) <= LOW_STOCK_THRESHOLD) {
        rows.push({
          id: `${product.id}-${variant.id}`,
          name: product.name,
          sku: product.sku,
          subtitle: `${toSizeLabel(variant)} variant`,
          meta: `${variant.stock ?? 0} units`,
          sortValue: variant.stock ?? Number.POSITIVE_INFINITY,
        });
      }
    });
  });
  return rows
    .sort((a, b) => (a.sortValue ?? 0) - (b.sortValue ?? 0))
    .slice(0, 5);
};

const daysBetween = (target: Date, now: Date) =>
  Math.round((target.getTime() - now.getTime()) / 86400000);

const formatExpiryLabel = (value: number) => {
  if (value === 0) return "today";
  if (value > 0) return `in ${value}d`;
  return `${Math.abs(value)}d ago`;
};

const buildExpiryRows = (
  inventory?: InventoryProduct[] | null
): InventoryRow[] => {
  if (!inventory?.length) return [];
  const now = new Date();
  const rows: InventoryRow[] = [];
  inventory.forEach((product) => {
    product.variants.forEach((variant) => {
      if (!variant.expiry_date) return;
      const expiryDate = new Date(variant.expiry_date);
      if (Number.isNaN(expiryDate.getTime())) return;
      const diffDays = daysBetween(expiryDate, now);
      if (diffDays > EXPIRY_WINDOW_DAYS) return;
      rows.push({
        id: `${product.id}-${variant.id}-expiry`,
        name: product.name,
        sku: product.sku,
        subtitle: `${toSizeLabel(variant)} • expires ${formatExpiryLabel(
          diffDays
        )}`,
        meta: expiryDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        sortValue: expiryDate.getTime(),
      });
    });
  });

  return rows
    .sort((a, b) => (a.sortValue ?? 0) - (b.sortValue ?? 0))
    .slice(0, 5);
};

const renderList = (
  title: string,
  rows: InventoryRow[],
  emptyLabel: string
) => (
  <div className="space-y-3">
    <p className="text-sm font-medium text-muted-foreground">{title}</p>
    {rows.length ? (
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {row.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {row.subtitle} · {row.sku}
              </p>
            </div>
            <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
              {row.meta}
            </span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-muted-foreground">{emptyLabel}</p>
    )}
  </div>
);

export function InventoryHealth({
  inventory,
  isLoading,
}: InventoryHealthProps) {
  const lowStockRows = buildLowStockRows(inventory);
  const expiryRows = buildExpiryRows(inventory);

  if (isLoading && !inventory?.length) {
    return (
      <Card className="space-y-6 border bg-card p-4">
        <Skeleton className="h-5 w-40" />
        <div className="grid gap-6 md:grid-cols-2">
          {[0, 1].map((key) => (
            <div key={key} className="space-y-3">
              <Skeleton className="h-4 w-32" />
              {[0, 1, 2].map((row) => (
                <Skeleton key={row} className="h-10 w-full" />
              ))}
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-6 border bg-card p-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Inventory health
        </p>
        <p className="text-2xl font-semibold text-foreground">
          {lowStockRows.length + expiryRows.length}
        </p>
        <p className="text-sm text-muted-foreground">
          Critical SKUs & expiring batches
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {renderList(
          "Low stock",
          lowStockRows,
          "All monitored variants are above the threshold."
        )}
        {renderList(
          "Expiring soon",
          expiryRows,
          "No expiring batches within the next 60 days."
        )}
      </div>
    </Card>
  );
}
