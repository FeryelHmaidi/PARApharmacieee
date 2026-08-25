"use client";

import React, { useState } from "react";
import ProductModal from "@/components/ui/product-modal";
import { ChevronDown, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/hooks/useCartStore";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
  const addItem = useCartStore((state) => state.addItem);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    onProductClick?.(product);
  };

  const handleQuickAdd = (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    if (p.inStock === false) return;
    if (!p.sizes || p.sizes.length === 0) return;
    
    // If only one size, add it directly
    if (p.sizes.length === 1) {
      const selectedSize = p.sizes[0];
      if (!selectedSize.variantId) {
        toast.error("Cette variante n'est pas disponible");
        return;
      }
      const hasQuantity = typeof selectedSize.quantity === "number" && selectedSize.quantity > 0 && selectedSize.unit;
      const sizeLabel = hasQuantity ? `${selectedSize.quantity} ${selectedSize.unit}` : selectedSize.size;

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
      // If multiple sizes, open the modal to let user choose
      handleProductClick(p);
    }
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
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.06,
            },
          },
        }}
      >
        {shown.map((p, index) => (
          <motion.article
            key={p.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
            }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
            role="button"
            tabIndex={0}
            onClick={() => handleProductClick(p)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleProductClick(p);
            }}
            className={`group bg-white border border-gray-100 hover:border-yellow-200 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col`}
            style={{ height: cardHeight }}
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
                {p.brand && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/products?search=${encodeURIComponent(p.brand!)}`;
                    }}
                    className="mt-1 text-sm font-medium text-gray-500 hover:text-blue-600 hover:underline block text-left"
                  >
                    {p.brand}
                  </button>
                )}
                {p.subtitle && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {p.subtitle}
                  </p>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-3">
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
                          .price.toFixed(2).replace('.', ',')}{" "}
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

                <button
                  onClick={(e) => handleQuickAdd(e, p)}
                  disabled={p.inStock === false}
                  className="w-full py-2 flex items-center justify-center gap-2 rounded-md bg-white border border-gray-300 text-sm font-semibold text-gray-800 transition hover:bg-yellow-500 hover:text-white hover:border-yellow-500 disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-gray-100 shadow-sm active:scale-95"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Ajouter au panier
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </motion.div>

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
