"use client";

import { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, TimerOff, Image } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ActionsCell } from "./ActionsCell";
import type { ProductWithRelations, VariantRow, PhotoRow, TagRow } from "../../types";

type Product = ProductWithRelations;
type Variant = VariantRow;
type Photo = PhotoRow;
type Tag = TagRow;

const DEFAULT_CURRENCY = "TND";

const currencyFormat = (
  v: number | null | undefined,
  currency: string = DEFAULT_CURRENCY
) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
        Number(v)
      );

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "P");
  } catch {
    return iso;
  }
};

const LOW_STOCK_THRESHOLD = 10;

const computeStatus = (p: Product) => {
  if (p.status === "inactive") return "inactive";

  const variants = p.variants ?? [];
  if (!variants.length) return "out_of_stock";

  const totalStock =
    typeof p.total_stock === "number"
      ? p.total_stock
      : variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);

  if (totalStock <= 0) return "out_of_stock";

  const now = Date.now();
  const allExpired = variants.every(
    (variant) =>
      !!variant.expiry_date && new Date(variant.expiry_date).getTime() < now
  );
  if (allExpired) return "expired";

  const hasLowStock = variants.some((variant) => {
    const stock = variant.stock ?? 0;
    return stock > 0 && stock <= LOW_STOCK_THRESHOLD;
  });

  if (hasLowStock) return "low";

  return "ok";
};

export const inventoryColumns: ColumnDef<Product>[] = [
  {
    accessorKey: "primary_photo",
    header: "Photo",
    cell: ({ row }) => {
      const p = row.original;
      const photos: Photo[] = p.photos ?? [];
      const photo = p.primary_photo ?? photos[0]?.url ?? null;
      if (!photo) {
        return (
          <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center border">
            <Image className="h-5 w-5 text-gray-300" />
          </div>
        );
      }
      return (
        <img
          src={photo}
          alt={p.name}
          className="h-10 w-10 rounded-md object-cover border"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      );
    },
    size: 80,
  },

  {
    accessorKey: "name",
    header: "Product",
    cell: ({ row }) => {
      const p = row.original;
      const variants = p.variants ?? [];
      const primaryLabel =
        variants.length === 1
          ? variants[0].size_value != null && variants[0].size_unit
            ? `${variants[0].size_value} ${variants[0].size_unit}`
            : ""
          : variants.length > 1
          ? `${variants.length} variants`
          : "";
      return (
        <div className="text-start">
          <div>
            <div className="font-medium text-sm">{p.name}</div>
            <div className="text-xs text-muted-foreground">SKU • {p.sku}</div>
            {primaryLabel && (
              <div className="text-xs text-gray-500">{primaryLabel}</div>
            )}
          </div>
        </div>
      );
    },
    size: 320,
  },

  {
    id: "category_tags",
    header: "Catégorie",
    cell: ({ row }) => {
      const p = row.original;
      const tags: TagRow[] = p.tags ?? [];

      if (!tags.length) {
        return <span className="text-xs text-slate-400 italic">Non catégorisé</span>;
      }

      return (
        <div className="flex flex-wrap gap-1 items-center max-w-[200px]">
          {tags.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-0.5 text-xs font-semibold text-yellow-800 border border-yellow-200"
            >
              {t.name}
            </span>
          ))}
        </div>
      );
    },
    size: 180,
  },

  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const desc = row.getValue("description") as string | null;
      const text = desc?.trim() ?? "";
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="truncate text-sm text-gray-600 max-w-[220px]">
                {text ? (
                  text
                ) : (
                  <span className="text-gray-400 italic">No description</span>
                )}
              </div>
            </TooltipTrigger>
            {text && (
              <TooltipContent className="max-w-sm p-2 text-xs leading-snug">
                {text}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      );
    },
    size: 300,
  },

  // NEW: Variants column — show each size + price (pills) with tooltip for details
  {
    id: "variants",
    header: "Variants",
    cell: ({ row }) => {
      const p = row.original;
      const variants: Variant[] = (p.variants ?? []) as Variant[];

      if (!variants || variants.length === 0) {
        return <div className="text-xs text-gray-400 italic">No variants</div>;
      }

      // helper to format pill content
      const renderPill = (v: Variant, i: number) => {
        const label =
          v.size_value != null && v.size_unit
            ? `${v.size_value} ${v.size_unit}`
            : "—";
        const currency = v.currency ?? p.currency ?? DEFAULT_CURRENCY;
        const priceText = currencyFormat(v.price, currency);
        return (
          <Tooltip key={v.id ?? i}>
            <TooltipTrigger asChild>
              <div
                className="inline-flex items-center gap-2 mr-2 mb-2 rounded-full border px-2 py-1 text-xs bg-white shadow-sm cursor-default"
                role="button"
              >
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground">{priceText}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="p-2 text-xs leading-snug">
              <div className="flex flex-col gap-1">
                <div className="font-medium">{label}</div>
                <div>Price: {priceText}</div>
                <div>Stock: {v.stock ?? 0}</div>
                <div>
                  Expiry: {v.expiry_date ? formatDate(v.expiry_date) : "—"}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      };

      // show up to 4 pills, then a "+N more" pill if needed
      const visible = variants.slice(0, 4);
      const moreCount = Math.max(0, variants.length - visible.length);

      return (
        <TooltipProvider>
          <div className="flex flex-wrap items-start">
            {visible.map(renderPill)}
            {moreCount > 0 && (
              <div className="inline-flex items-center gap-2 mr-2 mb-2 rounded-full border px-2 py-1 text-xs bg-white shadow-sm text-muted-foreground">
                +{moreCount} more
              </div>
            )}
          </div>
        </TooltipProvider>
      );
    },
    size: 300,
  },

  {
    id: "price",
    header: "Price",
    cell: ({ row }) => {
      const p = row.original;
      const variants = p.variants ?? [];
      // Determine base price: prefer min_price, fallback to first variant price
      const basePrice =
        p.min_price ?? (variants.length > 0 ? variants[0].price : null);
      const currency =
        p.currency ??
        (variants.length > 0 ? variants[0].currency : DEFAULT_CURRENCY);
      // show discounted if present
      if (
        p.discounted_price != null &&
        basePrice != null &&
        p.discounted_price !== basePrice
      ) {
        return (
          <div className="flex flex-col items-start">
            <div className="text-sm font-medium">
              {currencyFormat(p.discounted_price, currency)}
            </div>
            <div className="text-xs text-muted-foreground line-through">
              {currencyFormat(basePrice, currency)}
            </div>
          </div>
        );
      }
      return (
        <div className="font-medium">{currencyFormat(basePrice, currency)}</div>
      );
    },
    size: 120,
  },

  {
    accessorKey: "stock",
    header: "Stock",
    cell: ({ row }) => {
      const p = row.original;
      const totalStock =
        typeof p.total_stock === "number"
          ? p.total_stock
          : (p.variants ?? []).reduce(
              (sum, variant) => sum + (variant.stock ?? 0),
              0
            );
      return <div className="font-medium">{totalStock}</div>;
    },
    size: 90,
  },

  {
    accessorKey: "expiry_date",
    header: "Nearest expiry",
    cell: ({ row }) => {
      const p = row.original;
      const nearest = p.nearest_expiry ?? null;
      return <div className="text-sm">{formatDate(nearest)}</div>;
    },
    size: 140,
  },

  {
    id: "status",
    header: "Statut",
    cell: ({ row }) => {
      const p = row.original;
      const status = computeStatus(p);
      const common =
        "px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs border";
      if (status === "ok")
        return (
          <div className={`${common} bg-emerald-50 text-emerald-700 border-emerald-200`}>
            <span>En stock</span>
          </div>
        );
      if (status === "low")
        return (
          <div className={`${common} bg-amber-50 text-amber-700 border-amber-200`}>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <span>Stock Faible</span>
          </div>
        );
      if (status === "out_of_stock")
        return (
          <div className={`${common} bg-rose-50 text-rose-700 border-rose-200`}>
            <span>Rupture de stock</span>
          </div>
        );
      if (status === "expired")
        return (
          <div className={`${common} bg-red-50 text-red-700 border-red-200`}>
            <TimerOff className="h-3.5 w-3.5 text-red-600" />
            <span>Expiré</span>
          </div>
        );
      if (status === "inactive")
        return (
          <div className={`${common} bg-slate-100 text-slate-600 border-slate-200`}>
            <span>Inactif / Supprimé</span>
          </div>
        );
      return <div className={common}>—</div>;
    },
    size: 150,
  },

  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <ActionsCell product={row.original} />,
    size: 60,
  },
];
