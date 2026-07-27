"use client";

import { useEffect, useMemo, useState } from "react";
import CategorySlider from "@/components/CategorySlider";
import ProductGrid, { Product } from "@/components/ProductGrid";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/supabase";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductVariantRow =
  Database["public"]["Tables"]["product_variants"]["Row"];
type ProductPhotoRow = Database["public"]["Tables"]["product_photos"]["Row"];
type TagRow = Database["public"]["Tables"]["tags"]["Row"];

type ProductWithRelations = ProductRow & {
  product_variants: ProductVariantRow[] | null;
  product_photos: ProductPhotoRow[] | null;
  product_tags: Array<{ tags: TagRow | null }> | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PRODUCT_PHOTO_BUCKET = "product-photos";
const ALL_CATEGORY_LABEL = "Tous les produits";

const toPublicPhotoUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!SUPABASE_URL) return null;
  const sanitizedPath = url.replace(/^\/+/, "");
  return `${SUPABASE_URL}/storage/v1/object/public/${PRODUCT_PHOTO_BUCKET}/${sanitizedPath}`;
};

const formatSizeLabel = (
  value: number | null,
  unit: Database["public"]["Enums"]["size_unit"] | null
): string => {
  if (value != null && unit) return `${value}${unit}`;
  if (value != null) return String(value);
  return unit ?? "Standard";
};

const mapProductRecordToGridProduct = (
  record: ProductWithRelations
): Product => {
  const variants = record.product_variants ?? [];
  const photos = (record.product_photos ?? []).map((photo) => ({
    ...photo,
    url: toPublicPhotoUrl(photo.url),
  }));
  const tagNames = (record.product_tags ?? [])
    .map((relation) => relation.tags?.name?.trim())
    .filter((name): name is string => Boolean(name));

  const primaryPhoto = photos.find((photo) => photo.position === 0)?.url;
  const fallbackPhoto = photos[0]?.url ?? null;

  return {
    id: record.id,
    title: record.name,
    subtitle: record.sku,
    sizes:
      variants.map((variant) => ({
        variantId: variant.id,
        size: formatSizeLabel(variant.size_value, variant.size_unit),
        price: variant.price ?? 0,
        quantity:
          typeof variant.size_value === "number" ? variant.size_value : null,
        unit: variant.size_unit,
        stock: variant.stock ?? null,
      })) ?? [],
    categories: tagNames,
    image: primaryPhoto ?? fallbackPhoto,
    images: photos
      .map((photo) => photo.url)
      .filter((url): url is string => Boolean(url)),
    description: record.description ?? undefined,
    inStock: variants.some((variant) => (variant.stock ?? 0) > 0),
  } satisfies Product;
};

const HeroCatagoriesList = () => {
  const [selectedCategory, setSelectedCategory] =
    useState<string>(ALL_CATEGORY_LABEL);
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClientComponentClient<Database>(), []);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      const [productsResult, tagsResult] = await Promise.all([
        supabase
          .from("products")
          .select(
            `id, name, description, sku, status, best_seller,
             product_variants (*),
             product_photos (*),
             product_tags (
               tags (*)
             )
            `
          )
          .is("deleted_at", null)
          .eq("status", "active"),
        supabase.from("tags").select("id, name").order("name"),
      ]);

      if (!active) return;

      const { data: productData, error: productError } = productsResult;
      const { data: tagData, error: tagError } = tagsResult;

      const typedTagData = (tagData ?? []) as TagRow[];

      if (productError || tagError) {
        setError(
          productError?.message ?? tagError?.message ?? "Erreur inconnue"
        );
        setProducts([]);
        setCategories(typedTagData.map((tag) => tag.name));
        setLoading(false);
        return;
      }

      const typedProducts = (productData ?? []) as ProductWithRelations[];
      const mappedProducts = typedProducts
        .map(mapProductRecordToGridProduct)
        .filter((product) => product.sizes.length > 0 || product.image);

      setProducts(mappedProducts);
      setCategories(typedTagData.map((tag) => tag.name));
      setLoading(false);
    };

    loadData();

    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (
      selectedCategory !== ALL_CATEGORY_LABEL &&
      categories.length &&
      !categories.includes(selectedCategory)
    ) {
      setSelectedCategory(ALL_CATEGORY_LABEL);
    }
  }, [categories, selectedCategory]);

  const categoryOptions = useMemo(() => {
    const unique = Array.from(new Set(categories.filter(Boolean)));
    return [ALL_CATEGORY_LABEL, ...unique];
  }, [categories]);

  const effectiveCategory =
    selectedCategory === ALL_CATEGORY_LABEL ? null : selectedCategory;

  return (
    <div className="w-[95%] mx-auto mb-12">
      <div className="flex justify-center items-center mb-10">
        <h2 className="text-4xl font-bold">Nos Produits</h2>
      </div>

      <CategorySlider
        categories={categoryOptions}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />

      <div className="mt-8">
        {error && (
          <div className="mb-6 text-center text-sm text-red-600">
            Impossible de charger les produits : {error}
          </div>
        )}
        {loading ? (
          <div className="py-12 text-center text-gray-500">
            Chargement des produits...
          </div>
        ) : (
          <ProductGrid
            products={products}
            selectedCategory={effectiveCategory}
            maxItems={16}
            cardHeight="420px"
          />
        )}
      </div>
    </div>
  );
};

export default HeroCatagoriesList;
