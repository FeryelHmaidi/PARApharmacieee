"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import CategorySlider from "@/components/CategorySlider";
import ProductGrid, { Product as GridProduct } from "@/components/ProductGrid";
import ProductFilters from "@/components/products/ProductFilters";
import ProductSearch from "@/components/products/ProductSearch";
import ProductHeader from "@/components/products/ProductHeader";
import type { Database } from "@/types/supabase";
import type {
  PhotoRow,
  ProductWithRelations,
  TagRow,
  VariantRow,
} from "@/app/admin/inventory/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PRODUCT_PHOTO_BUCKET = "product-photos";
const NEW_PRODUCT_WINDOW_DAYS = 30;
const LOW_STOCK_THRESHOLD = 20;

const sliderCategories = [
  "Tous les produits",
  "Best sellers",
  "Nouveautés",
  "Bientôt en rupture",
] as const;

type SliderCategory = (typeof sliderCategories)[number];

type ProductQueryRow = Database["public"]["Tables"]["products"]["Row"] & {
  product_variants?: VariantRow[] | null;
  product_photos?: PhotoRow[] | null;
  product_tags?: { tags?: TagRow | null }[] | null;
};

type StorefrontProduct = ProductWithRelations & {
  categories: SliderCategory[];
  max_price?: number | null;
  tagNames: string[];
};

const toPublicPhotoUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!SUPABASE_URL) return null;
  const sanitizedPath = url.replace(/^\/+/, "");
  return `${SUPABASE_URL}/storage/v1/object/public/${PRODUCT_PHOTO_BUCKET}/${sanitizedPath}`;
};

const normalizePhotos = (photos: PhotoRow[]): PhotoRow[] =>
  photos.map((photo) => {
    const publicUrl = toPublicPhotoUrl(photo.url);
    return publicUrl ? { ...photo, url: publicUrl } : photo;
  });

const pickPrimaryPhoto = (photos: PhotoRow[]): string | null => {
  if (!photos.length) return null;
  const sorted = [...photos].sort((a, b) => {
    const posA = a.position ?? Number.POSITIVE_INFINITY;
    const posB = b.position ?? Number.POSITIVE_INFINITY;
    return posA - posB;
  });
  return sorted[0]?.url ?? null;
};

const computeTotalStock = (variants: VariantRow[]): number =>
  variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0);

const computePriceStats = (variants: VariantRow[]) => {
  const prices = variants
    .map((variant) => variant.price)
    .filter((price): price is number => typeof price === "number");
  if (!prices.length) return null;
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  } as const;
};

const variantSizeLabel = (variant: VariantRow): string => {
  const hasValue = typeof variant.size_value === "number";
  const unit = variant.size_unit?.trim();

  if (hasValue && unit) {
    return `${variant.size_value}${unit}`;
  }
  if (hasValue) {
    return String(variant.size_value);
  }
  if (unit) {
    return unit;
  }
  return "Standard";
};

const deriveCategories = (
  product: Pick<StorefrontProduct, "best_seller" | "created_at" | "total_stock">
): SliderCategory[] => {
  const tags: SliderCategory[] = ["Tous les produits"];
  if (product.best_seller) tags.push("Best sellers");

  const createdAt = product.created_at ? new Date(product.created_at) : null;
  if (
    createdAt &&
    Date.now() - createdAt.getTime() <=
      NEW_PRODUCT_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ) {
    tags.push("Nouveautés");
  }

  if (
    typeof product.total_stock === "number" &&
    product.total_stock > 0 &&
    product.total_stock <= LOW_STOCK_THRESHOLD
  ) {
    tags.push("Bientôt en rupture");
  }

  return tags;
};

const mapToGridProduct = (product: StorefrontProduct): GridProduct => ({
  id: product.id,
  title: product.name,
  subtitle: product.sku,
  brand: product.brand ?? null,
  brand_logo_url: product.brand_logo_url ?? null,
  sizes: product.variants.map((variant) => ({
    variantId: variant.id,
    size: variantSizeLabel(variant),
    price: variant.price ?? 0,
    quantity:
      typeof variant.size_value === "number" ? variant.size_value : null,
    unit: variant.size_unit,
    stock: variant.stock ?? null,
  })),
  categories: product.categories,
  image: product.primary_photo ?? product.photos?.[0]?.url ?? null,
  images: (product.photos ?? [])
    .map((photo) => photo.url)
    .filter((url): url is string => typeof url === "string" && url.length > 0),
  description: product.description ?? undefined,
  inStock: (product.total_stock ?? 0) > 0,
});

const formatPrice = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 2,
  })
    .format(value)
    .replace("TND", "Dt");

const ProductPage: React.FC = () => {
  const supabase = useMemo(() => createClientComponentClient<Database>(), []);

  const [inventoryProducts, setInventoryProducts] = useState<
    StorefrontProduct[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] =
    useState<SliderCategory | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const searchParam = params.get("search");
      const brandParam = params.get("brand");
      const catParam = params.get("category");
      const subcatParam = params.get("subcategory");

      if (searchParam) setSearch(searchParam);
      if (brandParam) setSelectedBrands([brandParam]);
      if (catParam) setSelectedCats([catParam]);
      if (subcatParam) setSelectedSubcats([subcatParam]);
    }
  }, []);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [bestSellerOnly, setBestSellerOnly] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedSubcats, setSelectedSubcats] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [priceInitialized, setPriceInitialized] = useState(false);
  const [visibleCount, setVisibleCount] = useState(16);

  useEffect(() => {
    setVisibleCount(16);
  }, [
    selectedCategory,
    search,
    onlyInStock,
    bestSellerOnly,
    selectedSizes,
    selectedTags,
    selectedCats,
    selectedSubcats,
    selectedBrands,
    minPrice,
    maxPrice,
  ]);

  useEffect(() => {
    let active = true;
    const loadProducts = async () => {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from("products")
        .select(
          `*,
           product_variants (*),
           product_photos (*),
           product_tags (
             tags (*)
           )
          `
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (queryError) {
        setError(queryError.message);
        setInventoryProducts([]);
        setLoading(false);
        return;
      }

      const normalized: StorefrontProduct[] = (
        (data ?? []) as ProductQueryRow[]
      )
        .map((record) => {
          const variants = record.product_variants ?? [];
          const photos = normalizePhotos(record.product_photos ?? []);
          const tagRelations = record.product_tags ?? [];
          const tags = tagRelations
            .map((relation) => relation.tags)
            .filter((tag): tag is TagRow => Boolean(tag));
          const tagNames = tags
            .map((tag) => tag.name?.trim())
            .filter((name): name is string => Boolean(name));
          const priceStats = computePriceStats(variants);
          const totalStock = computeTotalStock(variants);

          return {
            ...(record as Database["public"]["Tables"]["products"]["Row"]),
            variants,
            photos,
            primary_photo: pickPrimaryPhoto(photos),
            min_price: priceStats?.min ?? null,
            max_price: priceStats?.max ?? null,
            total_stock: totalStock,
            currency: variants[0]?.currency ?? null,
            discounted_price: null,
            tags,
            tagNames,
            categories: deriveCategories({
              best_seller: record.best_seller,
              created_at: record.created_at,
              total_stock: totalStock,
            }),
          } satisfies StorefrontProduct;
        })
        .filter((product) => product.status === "active");

      setInventoryProducts(normalized);
      setLoading(false);
    };

    loadProducts();

    return () => {
      active = false;
    };
  }, [supabase]);

  const priceBounds = useMemo(() => {
    const prices = inventoryProducts.flatMap((product) =>
      product.variants
        .map((variant) => variant.price)
        .filter((price): price is number => typeof price === "number")
    );

    if (!prices.length) return { min: 0, max: 0 };
    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));
    return { min, max };
  }, [inventoryProducts]);

  const availableSizes = useMemo(() => {
    const sizes = new Set<string>();
    inventoryProducts.forEach((product) => {
      product.variants.forEach((variant) => {
        sizes.add(variantSizeLabel(variant));
      });
    });
    return Array.from(sizes).sort((a, b) =>
      a.localeCompare(b, "fr", { numeric: true, sensitivity: "base" })
    );
  }, [inventoryProducts]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    inventoryProducts.forEach((product) => {
      product.tagNames.forEach((name) => {
        if (name) tags.add(name);
      });
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b, "fr"));
  }, [inventoryProducts]);

  const availableCategories = useMemo(() => {
    const items = new Set<string>();
    inventoryProducts.forEach((p) => {
      const cat = (p as any).category;
      if (cat) items.add(cat);
    });
    return Array.from(items).sort((a, b) => a.localeCompare(b, "fr"));
  }, [inventoryProducts]);

  const availableSubcategories = useMemo(() => {
    const items = new Set<string>();
    inventoryProducts.forEach((p) => {
      const subcat = (p as any).sub_category || (p as any).subcategory;
      if (subcat) items.add(subcat);
    });
    return Array.from(items).sort((a, b) => a.localeCompare(b, "fr"));
  }, [inventoryProducts]);

  const availableBrands = useMemo(() => {
    const items = new Set<string>();
    inventoryProducts.forEach((p) => {
      if (p.brand) items.add(p.brand);
    });
    return Array.from(items).sort((a, b) => a.localeCompare(b, "fr"));
  }, [inventoryProducts]);

  useEffect(() => {
    if (!inventoryProducts.length) return;

    if (!priceInitialized) {
      setMinPrice(priceBounds.min);
      setMaxPrice(priceBounds.max);
      setPriceInitialized(true);
      return;
    }

    setMinPrice((prev) =>
      Math.min(Math.max(prev, priceBounds.min), priceBounds.max)
    );
    setMaxPrice((prev) =>
      Math.max(Math.min(prev, priceBounds.max), priceBounds.min)
    );
  }, [inventoryProducts.length, priceBounds, priceInitialized]);

  const handleCategorySelect = useCallback((category: SliderCategory) => {
    setSelectedCategory((prev) => (prev === category ? null : category));
  }, []);

  const handleMinPriceChange = useCallback(
    (value: number) => {
      if (!Number.isFinite(value)) return;
      const clamped = Math.min(Math.max(value, priceBounds.min), maxPrice);
      setMinPrice(clamped);
    },
    [maxPrice, priceBounds.min]
  );

  const handleMaxPriceChange = useCallback(
    (value: number) => {
      if (!Number.isFinite(value)) return;
      const clamped = Math.max(Math.min(value, priceBounds.max), minPrice);
      setMaxPrice(clamped);
    },
    [minPrice, priceBounds.max]
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setSelectedCategory(null);
    setOnlyInStock(false);
    setBestSellerOnly(false);
    setSelectedSizes([]);
    setSelectedTags([]);
    setSelectedCats([]);
    setSelectedSubcats([]);
    setSelectedBrands([]);
    if (priceBounds.max > 0) {
      setMinPrice(priceBounds.min);
      setMaxPrice(priceBounds.max);
    }
  }, [priceBounds]);

  const handleSizeToggle = useCallback((sizeLabel: string) => {
    setSelectedSizes((prev) =>
      prev.includes(sizeLabel)
        ? prev.filter((size) => size !== sizeLabel)
        : [...prev, sizeLabel]
    );
  }, []);

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((value) => value !== tag)
        : [...prev, tag]
    );
  }, []);

  const handleCatToggle = useCallback((cat: string) => {
    setSelectedCats((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  }, []);

  const handleSubcatToggle = useCallback((subcat: string) => {
    setSelectedSubcats((prev) => prev.includes(subcat) ? prev.filter((s) => s !== subcat) : [...prev, subcat]);
  }, []);

  const handleBrandToggle = useCallback((brand: string) => {
    setSelectedBrands((prev) => prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]);
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return inventoryProducts.filter((product) => {
      if (selectedCategory && !product.categories.includes(selectedCategory)) {
        return false;
      }

      if (bestSellerOnly && !product.best_seller) {
        return false;
      }

      if (onlyInStock && (product.total_stock ?? 0) <= 0) {
        return false;
      }

      const hasVariants = product.variants.length > 0;
      if (selectedSizes.length) {
        const matchesSize = product.variants.some((variant) =>
          selectedSizes.includes(variantSizeLabel(variant))
        );
        if (!matchesSize) {
          return false;
        }
      }

      if (selectedTags.length) {
        const matchesTag = product.tagNames.some((tag) =>
          selectedTags.includes(tag)
        );
        if (!matchesTag) return false;
      }

      if (selectedCats.length) {
        if (!selectedCats.includes((product as any).category)) return false;
      }

      if (selectedSubcats.length) {
        const subcat = (product as any).sub_category || (product as any).subcategory;
        if (!selectedSubcats.includes(subcat)) return false;
      }

      if (selectedBrands.length) {
        if (!product.brand || !selectedBrands.includes(product.brand)) return false;
      }

      const priceMatch = hasVariants
        ? product.variants.some((variant) => {
            const price = variant.price;
            return (
              typeof price === "number" &&
              price >= minPrice &&
              price <= maxPrice
            );
          })
        : true;

      if (!priceMatch) {
        return false;
      }

      if (query) {
        const haystack = `${product.name} ${product.sku ?? ""} ${
          product.brand ?? ""
        } ${product.description ?? ""} ${product.categories.join(" ")} ${product.tagNames.join(" ")}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [
    inventoryProducts,
    selectedCategory,
    bestSellerOnly,
    onlyInStock,
    minPrice,
    maxPrice,
    search,
    selectedSizes,
    selectedTags,
    selectedCats,
    selectedSubcats,
    selectedBrands,
  ]);

  const gridProducts = useMemo(
    () => filteredProducts.map((product) => mapToGridProduct(product)),
    [filteredProducts]
  );

  return (
    <main className="min-h-screen mx-auto w-[85%] flex flex-col gap-20 mt-28">
      <ProductHeader />

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700"
        >
          Impossible de charger les produits : {error}
        </div>
      )}

      <div className="w-full flex flex-col lg:flex-row gap-8">
        <ProductFilters
          minPrice={minPrice}
          maxPrice={maxPrice}
          minAvailable={priceBounds.min}
          maxAvailable={priceBounds.max}
          onlyInStock={onlyInStock}
          bestSellerOnly={bestSellerOnly}
          availableSizes={availableSizes}
          selectedSizes={selectedSizes}
          availableTags={availableTags}
          selectedTags={selectedTags}
          availableCats={availableCategories}
          selectedCats={selectedCats}
          availableSubcats={availableSubcategories}
          selectedSubcats={selectedSubcats}
          availableBrands={availableBrands}
          selectedBrands={selectedBrands}
          onMinPriceChange={handleMinPriceChange}
          onMaxPriceChange={handleMaxPriceChange}
          onToggleInStock={setOnlyInStock}
          onToggleBestSeller={setBestSellerOnly}
          onToggleSize={handleSizeToggle}
          onToggleTag={handleTagToggle}
          onToggleCat={handleCatToggle}
          onToggleSubcat={handleSubcatToggle}
          onToggleBrand={handleBrandToggle}
          onClearAllFilters={clearFilters}
          formatPrice={(value) => formatPrice(value)}
        />

        <section className="flex-1">
          <ProductSearch
            search={search}
            onSearchChange={setSearch}
            resultsCount={gridProducts.length}
          />

          {loading ? (
            <div className="py-16 text-center text-gray-500">
              Chargement des produits…
            </div>
          ) : (
            <ProductGrid
              products={gridProducts}
              selectedCategory={selectedCategory}
              maxItems={visibleCount}
              onLoadMore={() => setVisibleCount((prev) => prev + 16)}
              cardHeight="350px"
              onProductClick={(product) => {
                console.log("Product clicked:", product.id);
              }}
            />
          )}
        </section>
      </div>
    </main>
  );
};

export default ProductPage;
