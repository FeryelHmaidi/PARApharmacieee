"use client";

import { Column, ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, TimerOff, Image, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
    const clean = iso.split("T")[0];
    const parts = clean.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      const [year, month, day] = parts;
      return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
    }
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return format(d, "dd/MM/yyyy");
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

function SortableHeader<TData, TValue>({
  column,
  title,
}: {
  column: Column<TData, TValue>;
  title: string;
}) {
  const isSorted = column.getIsSorted();
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(isSorted === "asc")}
      className="flex items-center gap-1 hover:text-yellow-700 transition font-semibold text-xs tracking-tight select-none p-1 rounded hover:bg-slate-100"
    >
      <span>{title}</span>
      {isSorted === "asc" ? (
        <ArrowUp className="h-3 w-3 text-yellow-600 shrink-0" />
      ) : isSorted === "desc" ? (
        <ArrowDown className="h-3 w-3 text-yellow-600 shrink-0" />
      ) : (
        <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60 shrink-0" />
      )}
    </button>
  );
}

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
          <div className="h-8 w-8 rounded-md bg-gray-100 flex items-center justify-center border shrink-0">
            <Image className="h-4 w-4 text-gray-300" />
          </div>
        );
      }
      return (
        <img
          src={photo}
          alt={p.name}
          className="h-8 w-8 rounded-md object-cover border shrink-0"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      );
    },
    size: 50,
  },

  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} title="Product" />,
    sortingFn: "alphanumeric",
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

      const fullName = (p.name ?? "").trim();
      const words = fullName.split(/\s+/).filter(Boolean);
      const isLong = words.length > 2 || fullName.length > 18;
      const displayName = isLong ? words.slice(0, 2).join(" ") : fullName;

      return (
        <div className="text-start max-w-[170px]">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer group inline-block max-w-full">
                  <span className="font-medium text-xs sm:text-sm text-gray-900 group-hover:text-yellow-700 transition-colors">
                    {displayName}
                  </span>
                  {isLong && (
                    <span className="text-[11px] text-yellow-600 font-normal ml-1 whitespace-nowrap">
                      ... (voir plus)
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-2 text-xs leading-snug font-medium shadow-md">
                <p className="font-semibold text-gray-900 text-xs">{fullName}</p>
                {p.sku && <p className="text-[10px] text-gray-500 mt-0.5">SKU : {p.sku}</p>}
                {primaryLabel && <p className="text-[10px] text-yellow-700 mt-0.5">{primaryLabel}</p>}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="text-[10px] text-muted-foreground mt-0.5">SKU • {p.sku}</div>
          {primaryLabel && (
            <div className="text-[10px] text-gray-500">{primaryLabel}</div>
          )}
        </div>
      );
    },
    size: 170,
  },

  {
    id: "category_tags",
    header: "Catégorie",
    cell: ({ row }) => {
      const p = row.original;
      const tags: TagRow[] = p.tags ?? [];

      if (!tags.length) {
        return <span className="text-[11px] text-slate-400 italic">Non catégorisé</span>;
      }

      return (
        <div className="flex flex-wrap gap-1 items-center max-w-[140px]">
          {tags.slice(0, 2).map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center rounded bg-yellow-50 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-800 border border-yellow-200"
            >
              {t.name}
            </span>
          ))}
          {tags.length > 2 && (
            <span className="text-[10px] text-slate-400">+{tags.length - 2}</span>
          )}
        </div>
      );
    },
    size: 140,
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
              <div className="truncate text-xs text-gray-500 max-w-[140px]">
                {text ? text : <span className="text-gray-300 italic">—</span>}
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
    size: 140,
  },

  {
    id: "variants",
    accessorFn: (row) => row.variants?.length ?? 0,
    header: ({ column }) => <SortableHeader column={column} title="Variants" />,
    cell: ({ row }) => {
      const p = row.original;
      const variants: Variant[] = (p.variants ?? []) as Variant[];

      if (!variants || variants.length === 0) {
        return <div className="text-[11px] text-gray-400 italic">0 variant</div>;
      }

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
                className="inline-flex items-center gap-1 mr-1 mb-1 rounded-full border px-1.5 py-0.5 text-[10px] bg-white shadow-xs cursor-default"
                role="button"
              >
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground">{priceText}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="p-2 text-xs leading-snug">
              <div className="flex flex-col gap-0.5">
                <div className="font-medium">{label}</div>
                <div>Prix: {priceText}</div>
                <div>Stock: {v.stock ?? 0}</div>
                <div>
                  Exp: {v.expiry_date ? formatDate(v.expiry_date) : "—"}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      };

      const visible = variants.slice(0, 2);
      const moreCount = Math.max(0, variants.length - visible.length);

      return (
        <TooltipProvider>
          <div className="flex flex-wrap items-start max-w-[160px]">
            {visible.map(renderPill)}
            {moreCount > 0 && (
              <div className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] bg-white shadow-xs text-muted-foreground">
                +{moreCount}
              </div>
            )}
          </div>
        </TooltipProvider>
      );
    },
    size: 160,
  },

  {
    id: "price",
    accessorFn: (row) => row.min_price ?? (row.variants?.[0]?.price ?? 0),
    header: ({ column }) => <SortableHeader column={column} title="Price" />,
    cell: ({ row }) => {
      const p = row.original;
      const variants = p.variants ?? [];
      const basePrice =
        p.min_price ?? (variants.length > 0 ? variants[0].price : null);
      const currency =
        p.currency ??
        (variants.length > 0 ? variants[0].currency : DEFAULT_CURRENCY);

      if (
        p.discounted_price != null &&
        basePrice != null &&
        p.discounted_price !== basePrice
      ) {
        return (
          <div className="flex flex-col items-start text-xs">
            <div className="font-semibold text-emerald-700">
              {currencyFormat(p.discounted_price, currency)}
            </div>
            <div className="text-[10px] text-muted-foreground line-through">
              {currencyFormat(basePrice, currency)}
            </div>
          </div>
        );
      }
      return (
        <div className="font-semibold text-xs text-slate-800">{currencyFormat(basePrice, currency)}</div>
      );
    },
    size: 90,
  },

  {
    id: "stock",
    accessorFn: (row) =>
      typeof row.total_stock === "number"
        ? row.total_stock
        : (row.variants ?? []).reduce(
            (sum, variant) => sum + (variant.stock ?? 0),
            0
          ),
    header: ({ column }) => <SortableHeader column={column} title="Stock" />,
    cell: ({ row }) => {
      const p = row.original;
      const totalStock =
        typeof p.total_stock === "number"
          ? p.total_stock
          : (p.variants ?? []).reduce(
              (sum, variant) => sum + (variant.stock ?? 0),
              0
            );
      return (
        <div className={`font-semibold text-xs ${totalStock <= 0 ? "text-rose-600" : totalStock <= 10 ? "text-amber-600" : "text-slate-800"}`}>
          {totalStock}
        </div>
      );
    },
    size: 70,
  },

  {
    id: "expiry_date",
    accessorFn: (row) =>
      row.nearest_expiry ? new Date(row.nearest_expiry).getTime() : 9999999999999,
    header: ({ column }) => <SortableHeader column={column} title="Nearest expiry" />,
    cell: ({ row }) => {
      const p = row.original;
      const nearest = p.nearest_expiry ?? null;
      return <div className="text-xs text-slate-700">{formatDate(nearest)}</div>;
    },
    size: 100,
  },

  {
    id: "status",
    accessorFn: (row) => computeStatus(row),
    header: ({ column }) => <SortableHeader column={column} title="Statut" />,
    cell: ({ row }) => {
      const p = row.original;
      const status = computeStatus(p);
      const common =
        "px-2 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 shadow-xs border";
      if (status === "ok")
        return (
          <div className={`${common} bg-emerald-50 text-emerald-700 border-emerald-200`}>
            <span>En stock</span>
          </div>
        );
      if (status === "low")
        return (
          <div className={`${common} bg-amber-50 text-amber-700 border-amber-200`}>
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            <span>Faible</span>
          </div>
        );
      if (status === "out_of_stock")
        return (
          <div className={`${common} bg-rose-50 text-rose-700 border-rose-200`}>
            <span>Rupture</span>
          </div>
        );
      if (status === "expired")
        return (
          <div className={`${common} bg-red-50 text-red-700 border-red-200`}>
            <TimerOff className="h-3 w-3 text-red-600" />
            <span>Expiré</span>
          </div>
        );
      if (status === "inactive")
        return (
          <div className={`${common} bg-slate-100 text-slate-600 border-slate-200`}>
            <span>Inactif</span>
          </div>
        );
      return <div className={common}>—</div>;
    },
    size: 105,
  },

  {
    id: "actions",
    header: () => <div className="text-right text-xs">Actions</div>,
    cell: ({ row }) => <ActionsCell product={row.original} />,
    size: 50,
  },
];

