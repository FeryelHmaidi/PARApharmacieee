"use client";

import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import ProductModal from "@/components/ui/product-modal";
import { ShoppingBasket } from "lucide-react";
import type { Database } from "@/types/supabase";

type SizeUnit = Database["public"]["Enums"]["size_unit"];

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductVariantRow =
  Database["public"]["Tables"]["product_variants"]["Row"];
type ProductPhotoRow = Database["public"]["Tables"]["product_photos"]["Row"];

type ProductWithRelations = ProductRow & {
  product_variants: ProductVariantRow[] | null;
  product_photos: ProductPhotoRow[] | null;
};

type HeroProduct = {
  id: string;
  title: string;
  description?: string | null;
  image: string | null;
  images: string[];
  sizes: Array<{
    variantId?: string;
    size: string;
    price: number;
    quantity?: number | null;
    unit?: string | null;
    stock?: number | null;
  }>;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PRODUCT_PHOTO_BUCKET = "product-photos";

const responsive = {
  desktop: {
    breakpoint: { max: 3000, min: 1024 },
    items: 3,
    slidesToSlide: 1,
  },
  tablet: {
    breakpoint: { max: 1024, min: 464 },
    items: 2,
    slidesToSlide: 1,
  },
  mobile: {
    breakpoint: { max: 464, min: 0 },
    items: 1,
    slidesToSlide: 1,
  },
};

const toPublicPhotoUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!SUPABASE_URL) return null;
  const sanitizedPath = url.replace(/^\/+/, "");
  return `${SUPABASE_URL}/storage/v1/object/public/${PRODUCT_PHOTO_BUCKET}/${sanitizedPath}`;
};

const formatSizeLabel = (
  value: number | null,
  unit: SizeUnit | null
): string => {
  if (value != null && unit) return `${value}${unit}`;
  if (value != null) return String(value);
  return unit ?? "Standard";
};

export default function HeroCollection() {
  const [products, setProducts] = useState<HeroProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<HeroProduct | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClientComponentClient<Database>(), []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from("products")
        .select(
          `id, name, description, best_seller,
           product_variants (*),
           product_photos (*)
          `
        )
        .eq("best_seller", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(8);

      if (!active) return;

      if (queryError) {
        setError(queryError.message);
        setProducts([]);
        setLoading(false);
        return;
      }

      const typedData: ProductWithRelations[] = (data ??
        []) as ProductWithRelations[];

      const mapped: HeroProduct[] = typedData.map((record) => {
        const variants = record.product_variants ?? [];
        const photos = (record.product_photos ?? []).map((photo) => ({
          ...photo,
          url: toPublicPhotoUrl(photo.url),
        }));
        const primaryPhoto = photos.find((photo) => photo.position === 0)?.url;
        const fallbackPhoto = photos[0]?.url ?? null;

        return {
          id: record.id,
          title: record.name,
          description: record.description,
          image: primaryPhoto ?? fallbackPhoto,
          images: photos
            .map((photo) => photo.url)
            .filter((url): url is string => Boolean(url)),
          sizes:
            variants.map((variant) => ({
              variantId: variant.id,
              size: formatSizeLabel(
                variant.size_value ?? null,
                variant.size_unit
              ),
              price: variant.price ?? 0,
              quantity:
                typeof variant.size_value === "number"
                  ? variant.size_value
                  : null,
              unit: variant.size_unit,
              stock: variant.stock ?? null,
            })) ?? [],
        } satisfies HeroProduct;
      });

      setProducts(mapped);
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [supabase]);

  const carouselProducts = products;

  return (
    <div className="w-full  overflow-hidden">
      <div className="flex justify-center items-center mb-10">
        <h2 className="text-4xl font-bold">Meilleures ventes</h2>
      </div>
      {error && (
        <div className="mb-6 text-center text-sm text-red-600">
          Impossible de récupérer les produits : {error}
        </div>
      )}
      {!loading && !carouselProducts.length && !error && (
        <div className="mb-6 text-center text-sm text-gray-500">
          Aucun best seller disponible pour le moment.
        </div>
      )}
      <Carousel
        swipeable={true}
        draggable={true}
        responsive={responsive}
        infinite={carouselProducts.length > 3}
        autoPlay={false}
        keyBoardControl={true}
        customTransition="transform 300ms ease-in-out"
        transitionDuration={500}
        containerClass="py-5 overflow-hidden"
        arrows={!selectedProduct}
        itemClass="px-4"
      >
        {loading &&
          !carouselProducts.length &&
          Array.from({ length: 3 }).map((_, index) => (
            <div key={`skeleton-${index}`} className="relative">
              <div className="h-[400px] rounded-lg bg-gray-100 animate-pulse" />
            </div>
          ))}
        {!loading &&
          carouselProducts.map((item) => (
            <div key={item.id} className="relative">
              <motion.div
                className="group relative h-[400px] rounded-lg overflow-hidden bg-zinc-100 hover:cursor-pointer"
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSelectedProduct(item)}
              >
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={400}
                    height={450}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white text-gray-400">
                    Aucune image
                  </div>
                )}

                <div className="absolute inset-0 bg-zinc-500/10 group-hover:bg-zinc-600/20 transition-colors" />

                <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-full shadow-2xl">
                  <span className="text-lg font-semibold text-yellow-600">
                    {item.sizes && item.sizes.length
                      ? `${item.sizes[0].price.toFixed(2)}Dt`
                      : "Prix ND"}
                  </span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-[150px] bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

                <div className="absolute bottom-0 left-0 right-0 pb-6 px-6 z-10">
                  <motion.h3 className="text-2xl font-semibold text-white mb-1 group-hover:-translate-y-1 transition-transform duration-200">
                    {item.title}
                  </motion.h3>
                  <p className="text-sm text-gray-200 group-hover:text-white/90 transition-colors duration-200 line-clamp-2">
                    {item.description ?? "Produit populaire"}
                  </p>
                </div>
              </motion.div>
            </div>
          ))}
      </Carousel>
      <div className="flex justify-center items-center mb-10">
        <Link
          href={"/"}
          onClick={(e) => e.stopPropagation()} // prevent modal open on click
          className="inline-block  text-white py-4 px-8 rounded-sm text-base font-medium
 bg-yellow-600 hover:bg-yellow-600/90  transition-all duration-200 mt-10"
        >
          <ShoppingBasket className="inline-block mr-2 size-5" />
          Voir tous les produits
        </Link>
      </div>
      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          product={{
            id: selectedProduct.id,
            title: selectedProduct.title,
            sizes: selectedProduct.sizes,
            image:
              selectedProduct.image ||
              selectedProduct.images?.[0] ||
              "/fallback-image.jpg",
            images: selectedProduct.images,
            description: selectedProduct.description ?? undefined,
          }}
        />
      )}
    </div>
  );
}
