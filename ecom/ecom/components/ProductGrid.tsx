"use client";

import React, { useState } from "react";
import ProductModal from "@/components/ui/product-modal";
import { ChevronDown } from "lucide-react";

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
  sizes: ProductSize[]; // Array of sizes with their prices
  defaultPrice?: number; // Optional default price for display in grid
  categories: string[];
  image?: string | null;
  images?: string[];
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
  cardHeight: string; // Accept custom height (e.g., "420px", "500px", etc.)
};

const ProductGrid: React.FC<Props> = ({
  products,
  selectedCategory,
  maxItems,
  onLoadMore,
  onProductClick,
  className = "",
  cardHeight = "420px", // Default height if not provided
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    onProductClick?.(product);
  };

  // filter by category membership (product.categories includes selectedCategory)
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 ">
        {shown.map((p) => (
          <article
            key={p.id}
            role="button"
            tabIndex={0}
            onClick={() => handleProductClick(p)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleProductClick(p);
            }}
            className={`group bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-lg transform hover:-translate-y-1 transition cursor-pointer flex flex-col`}
            style={{ height: cardHeight }}
            /* note: custom asymmetric radius for rough/modern edges */
          >
            {/* Upper half - image, stretches edge-to-edge */}
            <div className="h-[70%] w-full bg-gray-100  overflow-hidden relative">
              {p.image ? (
                // plain <img> so this is portable; replace with Next/Image if desired
                <img
                  src={p.image}
                  alt={p.title}
                  className="w-full h-full object-cover block transition-transform duration-200 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-5xl">
                  🛍️
                </div>
              )}

              {p.inStock === false && (
                <div className="absolute inset-0 z-10 bg-white/70 flex items-center justify-center text-red-600 font-semibold text-sm">
                  Rupture de stock
                </div>
              )}

              <div className="absolute inset-0 bg-zinc-500/10 group-hover:bg-zinc-600/20 transition-colors" />
            </div>

            {/* Lower half - content with padding */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
                  {p.title}
                </h3>
                {p.subtitle && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {p.subtitle}
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <div
                    className={`text-lg font-bold ${
                      p.inStock === false ? "text-gray-400" : "text-yellow-600"
                    }`}
                  >
                    {p.sizes && p.sizes.length > 0 ? (
                      <>
                        {[...p.sizes]
                          .sort((a, b) => a.price - b.price)[0]
                          .price.toFixed(2)}
                        Dt
                      </>
                    ) : (
                      "Prix non disponible"
                    )}
                  </div>
                  {p.inStock === false && (
                    <span className="text-xs text-red-500">Non disponible</span>
                  )}
                  {p.sizes && p.sizes.length > 1 && (
                    <span className="text-xs text-gray-500">
                      {p.sizes.length} tailles disponibles
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductClick(p);
                    }}
                    disabled={p.inStock === false}
                    className="px-3 py-1 rounded-md bg-gray-100 text-sm font-medium transition disabled:opacity-70 disabled:cursor-not-allowed disabled:text-gray-400 disabled:bg-gray-200 hover:bg-yellow-600 hover:text-white"
                  >
                    {p.inStock === false ? "Alerter" : "Voir"}
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 text-sm text-gray-500">
        Affichage {shown.length} / {filtered.length} produits
      </div>

      {typeof maxItems === "number" &&
        shown.length < filtered.length &&
        onLoadMore && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onLoadMore}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
            >
              Charger plus
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
            description: selectedProduct.description,
          }}
        />
      )}
    </div>
  );
};

export default ProductGrid;
