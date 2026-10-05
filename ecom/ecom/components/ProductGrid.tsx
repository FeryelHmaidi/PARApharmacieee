"use client";

import React, { useState, useEffect } from "react";
import ProductModal from "@/components/ui/product-modal";
import { ChevronDown, ShoppingCart, LayoutGrid, List } from "lucide-react";
import { useCartStore } from "@/hooks/useCartStore";
import { toast } from "sonner";

export type ProductSize = {
  size: string;
  price: number;
  variantId?: string;
  quantity?: number | null;
  unit?: string | null;
  stock?: number | null;
};

export type Product = {
  id: string;
  title: string;
  subtitle?: string;
  sizes: ProductSize[];
  defaultPrice?: number;
  categories: string[];
  image?: string | null;
  images?: string[];
  brand?: string | null;
  brand_logo_url?: string | null;
  description?: string;
  ratings?: number;
  reviews?: number;
  inStock?: boolean;
};

type Props = {
  products: Product[];
  selectedCategory: string | null;
  maxItems?: number;
  onLoadMore?: () => void;
  onProductClick?: (p: Product) => void;
  className?: string;
  cardHeight?: string;
  showViewToggle?: boolean;
};

const ProductGrid: React.FC<Props> = ({
  products,
  selectedCategory,
  maxItems,
  onLoadMore,
  onProductClick,
  className = "",
  showViewToggle = true,
}) => {
  const addItem = useCartStore((state) => state.addItem);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mcpara_product_view");
      if (saved === "grid" || saved === "list") {
        setViewMode(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem("mcpara_product_view", mode);
    } catch {
      // ignore
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    onProductClick?.(product);
  };

  const handleQuickAdd = (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    if (p.inStock === false) return;
    if (!p.sizes || p.sizes.length === 0) return;

    if (p.sizes.length === 1) {
      const selectedSize = p.sizes[0];
      if (!selectedSize.variantId) {
        toast.error("Cette variante n'est pas disponible");
        return;
      }
      const hasQuantity =
        typeof selectedSize.quantity === "number" &&
        selectedSize.quantity > 0 &&
        selectedSize.unit;
      const sizeLabel = hasQuantity
        ? `${selectedSize.quantity} ${selectedSize.unit}`
        : selectedSize.size;

      addItem({
        productId: p.id,
        variantId: selectedSize.variantId,
        title: p.title,
        sizeLabel: sizeLabel,
        unitPrice: selectedSize.price,
        quantity: 1,
        image: p.image || "/fallback-image.jpg",
      });
      toast.success("Produit ajouté au panier !");
    } else {
      handleProductClick(p);
    }
  };

  const filtered = selectedCategory
    ? products.filter((p) => p.categories.includes(selectedCategory))
    : products;

  const shown = filtered.slice(0, maxItems);

  if (shown.length === 0) {
    return (
      <div className={`w-full ${className}`}>
        <div className="py-12 text-center text-gray-500">
          Aucun produit pour cette catégorie.
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Top toolbar: Grid / List view toggle & count */}
      {showViewToggle && (
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-1 bg-gray-100/90 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => handleViewModeChange("grid")}
              className={`p-1.5 rounded-md transition-all flex items-center gap-1.5 text-xs font-medium ${
                viewMode === "grid"
                  ? "bg-white text-yellow-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
              title="Vue Grille (2 par ligne sur mobile)"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grille</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("list")}
              className={`p-1.5 rounded-md transition-all flex items-center gap-1.5 text-xs font-medium ${
                viewMode === "list"
                  ? "bg-white text-yellow-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
              title="Vue Liste (1 par ligne en grand)"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Liste</span>
            </button>
          </div>

          <div className="text-xs sm:text-sm text-gray-500">
            Affichage <span className="font-semibold text-gray-800">{shown.length}</span> sur{" "}
            <span className="font-semibold text-gray-800">{filtered.length}</span> produits
          </div>
        </div>
      )}

      {/* Grid Mode: 2 items per row on mobile (grid-cols-2), 1:1 square image */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6">
          {shown.map((p) => (
            <article
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => handleProductClick(p)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleProductClick(p);
              }}
              className="group bg-white border border-gray-200/90 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-full"
            >
              {/* Scale 1:1 (square mouraba3) image container */}
              <div className="w-full aspect-square bg-white p-2.5 sm:p-4 overflow-hidden relative flex items-center justify-center border-b border-gray-100">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.title}
                    className="w-full h-full max-h-full max-w-full object-contain block transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl sm:text-5xl">
                    🛍️
                  </div>
                )}

                {p.inStock === false && (
                  <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[1px] flex items-center justify-center text-red-600 font-semibold text-xs sm:text-sm px-2 text-center">
                    Rupture de stock
                  </div>
                )}

                <div className="absolute inset-0 pointer-events-none group-hover:bg-black/[0.02] transition-colors" />
              </div>

              {/* Lower content */}
              <div className="p-2 sm:p-4 flex-1 flex flex-col justify-between">
                <div>
                  {p.brand && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/products?search=${encodeURIComponent(p.brand!)}`;
                      }}
                      className="text-[10px] sm:text-xs font-semibold text-gray-400 hover:text-yellow-600 hover:underline block text-left truncate uppercase tracking-wider"
                    >
                      {p.brand}
                    </button>
                  )}
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2 mt-0.5 leading-snug sm:leading-normal">
                    {p.title}
                  </h3>
                  {p.subtitle && (
                    <p className="mt-1 text-xs text-gray-500 line-clamp-1 hidden sm:block">
                      {p.subtitle}
                    </p>
                  )}
                </div>

                <div className="mt-2.5 sm:mt-4 flex flex-col gap-2">
                  <div className="flex flex-col">
                    <div
                      className={`text-sm sm:text-base font-bold ${
                        p.inStock === false ? "text-gray-400" : "text-yellow-600"
                      }`}
                    >
                      {p.sizes && p.sizes.length > 0 ? (
                        <>
                          {[...p.sizes]
                            .sort((a, b) => a.price - b.price)[0]
                            .price.toFixed(2)
                            .replace(".", ",")}{" "}
                          Dt
                        </>
                      ) : (
                        "Prix non disponible"
                      )}
                    </div>
                    {p.inStock === false && (
                      <span className="text-[10px] sm:text-xs text-red-500 font-medium">
                        Non disponible
                      </span>
                    )}
                    {p.sizes && p.sizes.length > 1 && (
                      <span className="text-[10px] sm:text-xs text-gray-400 truncate">
                        {p.sizes.length} formats dispo
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleQuickAdd(e, p)}
                    disabled={p.inStock === false}
                    className="w-full py-1.5 sm:py-2 px-1.5 sm:px-3 flex items-center justify-center gap-1 sm:gap-2 rounded-lg bg-white border border-gray-300 text-xs sm:text-sm font-semibold text-gray-800 transition hover:bg-yellow-50 hover:border-yellow-500 hover:text-yellow-700 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate">Ajouter au panier</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* List Mode: 1 item per row on mobile with big 1:1 square image and full description underneath */
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {shown.map((p) => (
            <article
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => handleProductClick(p)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleProductClick(p);
              }}
              className="group bg-white border border-gray-200/90 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row"
            >
              {/* Big 1:1 Square Image */}
              <div className="w-full sm:w-[260px] md:w-[300px] aspect-square bg-white p-4 sm:p-6 overflow-hidden relative flex items-center justify-center shrink-0 border-b sm:border-b-0 sm:border-r border-gray-100">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.title}
                    className="w-full h-full max-h-full max-w-full object-contain block transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-6xl">
                    🛍️
                  </div>
                )}

                {p.inStock === false && (
                  <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded shadow-sm">
                    ÉPUISÉ
                  </div>
                )}

                <div className="absolute inset-0 pointer-events-none group-hover:bg-black/[0.02] transition-colors" />
              </div>

              {/* Content under image on mobile, right side on desktop */}
              <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between">
                <div>
                  {p.brand && (
                    <div className="text-xs text-gray-500 mb-1">
                      <span className="font-normal text-gray-400">Brand: </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/products?search=${encodeURIComponent(p.brand!)}`;
                        }}
                        className="font-bold text-gray-800 hover:text-yellow-600 uppercase tracking-wide"
                      >
                        {p.brand}
                      </button>
                    </div>
                  )}

                  <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
                    {p.title}
                  </h3>

                  {(p.subtitle || p.description) && (
                    <p className="mt-2 text-xs sm:text-sm text-gray-600 line-clamp-3 sm:line-clamp-4 leading-relaxed">
                      {p.subtitle || p.description}
                    </p>
                  )}

                  {p.sizes && p.sizes.length > 1 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {p.sizes.length} formats disponibles
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <div
                      className={`text-lg sm:text-xl font-bold ${
                        p.inStock === false ? "text-gray-400" : "text-yellow-600"
                      }`}
                    >
                      {p.sizes && p.sizes.length > 0 ? (
                        <>
                          {[...p.sizes]
                            .sort((a, b) => a.price - b.price)[0]
                            .price.toFixed(2)
                            .replace(".", ",")}{" "}
                          Dt
                        </>
                      ) : (
                        "Prix non disponible"
                      )}
                    </div>
                    {p.inStock === false && (
                      <span className="text-xs text-red-500 font-medium">Non disponible</span>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleQuickAdd(e, p)}
                    disabled={p.inStock === false}
                    className="py-2.5 px-6 flex items-center justify-center gap-2 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold transition shadow-sm hover:shadow disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="w-4 h-4 shrink-0" />
                    Ajouter au panier
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Load more button */}
      {typeof maxItems === "number" &&
        shown.length < filtered.length &&
        onLoadMore && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={onLoadMore}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50 shadow-sm"
            >
              Charger plus de produits
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          product={{
            id: selectedProduct.id,
            title: selectedProduct.title,
            sizes: selectedProduct.sizes,
            image: selectedProduct.image || "/fallback-image.jpg",
            images: selectedProduct.images,
            brand: selectedProduct.brand,
            brand_logo_url: selectedProduct.brand_logo_url,
            description: selectedProduct.description,
          }}
        />
      )}
    </div>
  );
};

export default ProductGrid;
