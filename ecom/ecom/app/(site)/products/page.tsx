"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import CategorySlider from "@/components/CategorySlider";
import ProductGrid, { Product as GridProduct } from "@/components/ProductGrid";
import ProductFilters from "@/components/products/ProductFilters";
import ProductSearch from "@/components/products/ProductSearch";
import ProductHeader from "@/components/products/ProductHeader";
import type { Database } from "@/types/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

function ProductsContent() {
  const supabase = useMemo(() => createClientComponentClient<Database>(), []);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [inventoryProducts, setInventoryProducts] = useState<
    StorefrontProduct[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // DB categories, subcategories, brands
  const [dbCategories, setDbCategories] = useState<{ id: string; name: string }[]>([]);
  const [dbSubcategories, setDbSubcategories] = useState<{ id: string; name: string; category_id: string | null }[]>([]);
  const [dbBrands, setDbBrands] = useState<{ id: string; name: string }[]>([]);

  const [selectedCategory, setSelectedCategory] =
    useState<SliderCategory | null>(null);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("pertinence");

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

  // Fetch DB dictionaries
  useEffect(() => {
    const loadDictionaries = async () => {
      try {
        const [catsRes, subcatsRes, brandsRes] = await Promise.all([
          supabase.from("categories").select("id, name").order("name"),
          supabase.from("subcategories").select("id, name, category_id").order("name"),
          supabase.from("brands").select("id, name").order("name"),
        ]);
        if (catsRes.data) setDbCategories(catsRes.data);
        if (subcatsRes.data) setDbSubcategories(subcatsRes.data);
        if (brandsRes.data) setDbBrands(brandsRes.data);
      } catch (e) {
        console.error("Error loading dictionaries:", e);
      }
    };
    loadDictionaries();
  }, [supabase]);

  // Sync state reactively whenever URL searchParams change
  useEffect(() => {
    const searchParam = searchParams.get("search");
    const brandParam = searchParams.get("brand");
    const catParam = searchParams.get("category");
    const subcatParam = searchParams.get("subcategory");

    setSearch(searchParam || "");
    setSelectedBrands(brandParam ? [brandParam] : []);
    setSelectedCats(catParam ? [catParam] : []);
    setSelectedSubcats(subcatParam ? [subcatParam] : []);
  }, [searchParams]);

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
    const names = new Set<string>();
    dbCategories.forEach((c) => names.add(c.name));
    return Array.from(names).sort((a, b) => a.localeCompare(b, "fr"));
  }, [dbCategories]);

  const availableSubcategories = useMemo(() => {
    const names = new Set<string>();
    if (selectedCats.length > 0) {
      const matchedCatIds = dbCategories
        .filter((c) => selectedCats.some((sc) => sc.toLowerCase() === c.name.toLowerCase()))
        .map((c) => c.id);
      dbSubcategories
        .filter((sub) => sub.category_id && matchedCatIds.includes(sub.category_id))
        .forEach((sub) => names.add(sub.name));
    } else {
      dbSubcategories.forEach((sub) => names.add(sub.name));
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "fr"));
  }, [dbCategories, dbSubcategories, selectedCats]);

  const availableBrands = useMemo(() => {
    const names = new Set<string>();
    dbBrands.forEach((b) => names.add(b.name));
    inventoryProducts.forEach((p) => {
      if (p.brand) names.add(p.brand);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, "fr"));
  }, [dbBrands, inventoryProducts]);

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
    router.push("/products");
  }, [priceBounds, router]);

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
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }, []);

  const handleSubcatToggle = useCallback((subcat: string) => {
    setSelectedSubcats((prev) =>
      prev.includes(subcat) ? prev.filter((s) => s !== subcat) : [...prev, subcat]
    );
  }, []);

  const handleBrandToggle = useCallback((brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
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

      // Filter by Category: checks product tags against category name or any of its subcategories
      if (selectedCats.length) {
        const relatedSubcats = dbSubcategories
          .filter((sub) => {
            const parentCat = dbCategories.find((c) => c.id === sub.category_id);
            return (
              parentCat &&
              selectedCats.some((sc) => sc.toLowerCase() === parentCat.name.toLowerCase())
            );
          })
          .map((sub) => sub.name.toLowerCase());

        const allowedKeywords = [
          ...selectedCats.map((c) => c.toLowerCase()),
          ...relatedSubcats,
        ];

        const matchesCat = product.tagNames.some((tag) =>
          allowedKeywords.includes(tag.toLowerCase())
        );
        if (!matchesCat) return false;
      }

      // Filter by Subcategory: checks product tags directly against subcategory name
      if (selectedSubcats.length) {
        const targetSubcats = selectedSubcats.map((s) => s.toLowerCase());
        const matchesSubcat = product.tagNames.some((tag) =>
          targetSubcats.includes(tag.toLowerCase())
        );
        if (!matchesSubcat) return false;
      }

      // Filter by Brand
      if (selectedBrands.length) {
        const targetBrands = selectedBrands.map((b) => b.toLowerCase());
        if (!product.brand || !targetBrands.includes(product.brand.toLowerCase())) {
          return false;
        }
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
    dbCategories,
    dbSubcategories,
  ]);

  const gridProducts = useMemo(() => {
    let sorted = [...filteredProducts];
    switch (sortOption) {
      case "sales_desc":
        sorted.sort((a, b) => {
          if (a.best_seller && !b.best_seller) return -1;
          if (!a.best_seller && b.best_seller) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        break;
      case "name_asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name, "fr"));
        break;
      case "name_desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name, "fr"));
        break;
      case "price_asc":
        sorted.sort((a, b) => {
          const priceA = a.min_price ?? Number.POSITIVE_INFINITY;
          const priceB = b.min_price ?? Number.POSITIVE_INFINITY;
          return priceA - priceB;
        });
        break;
      case "price_desc":
        sorted.sort((a, b) => {
          const priceA = a.max_price ?? Number.NEGATIVE_INFINITY;
          const priceB = b.max_price ?? Number.NEGATIVE_INFINITY;
          return priceB - priceA;
        });
        break;
      case "pertinence":
      default:
        // No sorting or default creation date
        break;
    }
    return sorted.map((product) => mapToGridProduct(product));
  }, [filteredProducts, sortOption]);

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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <ProductSearch
              search={search}
              onSearchChange={setSearch}
              resultsCount={gridProducts.length}
            />
            
            <div className="flex items-center gap-2 text-sm text-gray-600 shrink-0">
              <span className="font-medium whitespace-nowrap">Trier par:</span>
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="w-[200px] bg-white border-gray-200">
                  <SelectValue placeholder="Pertinence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pertinence">Pertinence</SelectItem>
                  <SelectItem value="sales_desc">Ventes, ordre décroissant</SelectItem>
                  <SelectItem value="name_asc">Nom, A à Z</SelectItem>
                  <SelectItem value="name_desc">Nom, Z à A</SelectItem>
                  <SelectItem value="price_asc">Prix, croissant</SelectItem>
                  <SelectItem value="price_desc">Prix, décroissant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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
}

export default function ProductPage() {
  return (
    <Suspense fallback={<div className="min-h-screen py-32 text-center text-gray-400">Chargement...</div>}>
      <ProductsContent />
    </Suspense>
  );
}

