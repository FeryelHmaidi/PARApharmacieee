"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "./button";
import { ShoppingBag, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/hooks/useCartStore";
import { toast } from "sonner";

interface Size {
  size: string;
  price: number;
  variantId?: string;
  quantity?: number | null;
  unit?: string | null;
  stock?: number | null;
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    title: string;
    sizes: Size[];
    image: string;
    images?: string[];
    brand?: string | null;
    brand_logo_url?: string | null;
    description?: string;
    discounted_price?: number | null;
  };
}

const ProductModal = ({ isOpen, onClose, product }: ProductModalProps) => {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const addItem = useCartStore((state) => state.addItem);
  const sortedSizes = useMemo(
    () => [...product.sizes].sort((a, b) => a.price - b.price),
    [product.sizes]
  );
  const [selectedSize, setSelectedSize] = useState<Size | null>(
    sortedSizes[0] || null
  );

  const productImages = useMemo(() => {
    const orderedSources = product.images?.length
      ? product.images
      : [product.image];
    const sanitized = orderedSources.filter(
      (src): src is string => typeof src === "string" && src.length > 0
    );
    return sanitized.length ? sanitized : ["/fallback-image.jpg"];
  }, [product.images, product.image]);

  useEffect(() => {
    setSelectedImage(0);
    setSelectedSize(sortedSizes[0] || null);
    setQuantity(1);
  }, [sortedSizes]);

  const increaseQuantity = () => setQuantity((prev) => prev + 1);
  const decreaseQuantity = () =>
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const getSizeLabel = (sizeOption: Size) => {
    const hasQuantity =
      typeof sizeOption.quantity === "number" &&
      sizeOption.quantity > 0 &&
      sizeOption.unit;
    return hasQuantity
      ? `${sizeOption.quantity} ${sizeOption.unit}`
      : sizeOption.size;
  };

  const addSelectedItemToCart = () => {
    if (!selectedSize) {
      toast.error("Veuillez sélectionner une taille");
      return false;
    }

    if (!selectedSize.variantId) {
      toast.error("Cette variante n'est pas disponible");
      return false;
    }

    const activeImage = productImages[selectedImage] ?? product.image;
    const originalPrice = selectedSize.price;
    const hasDiscount =
      typeof product.discounted_price === "number" &&
      product.discounted_price > 0 &&
      product.discounted_price < originalPrice;
    const unitPrice = hasDiscount ? product.discounted_price! : originalPrice;

    addItem({
      productId: product.id,
      variantId: selectedSize.variantId,
      title: product.title,
      sizeLabel: getSizeLabel(selectedSize),
      unitPrice: unitPrice,
      quantity,
      image: activeImage,
      unit: selectedSize.unit,
    });

    return true;
  };

  const handleAddToCart = () => {
    if (!addSelectedItemToCart()) return;
    toast.success("Produit ajouté au panier");
    onClose();
  };

  const handleOrderNow = () => {
    if (!addSelectedItemToCart()) return;
    onClose();
    router.push("/cart");
  };

  const selectedStock =
    typeof selectedSize?.stock === "number" ? selectedSize.stock : null;
  const isOutOfStock = selectedStock !== null && selectedStock <= 0;
  const actionDisabled = !selectedSize?.variantId || isOutOfStock;

  const currentPrice = selectedSize ? selectedSize.price : (sortedSizes[0]?.price ?? 0);
  const hasDiscount =
    typeof product.discounted_price === "number" &&
    product.discounted_price > 0 &&
    product.discounted_price < currentPrice;
  const discountPercent =
    hasDiscount && currentPrice > 0
      ? Math.round(((currentPrice - product.discounted_price!) / currentPrice) * 100)
      : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="flex h-auto max-h-[min(90vh,calc(100vh-4rem))] w-[calc(100vw-1rem)] max-w-[1100px] flex-col gap-0 overflow-hidden rounded-lg bg-white p-0 sm:w-[calc(100vw-2rem)] sm:max-w-[1100px] lg:flex-row"
      >
        <DialogTitle></DialogTitle>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-2 top-2 z-50 flex size-9 items-center justify-center rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground sm:right-4 sm:top-4 sm:size-10"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            ></path>
          </svg>
        </button>

        {/* Product Images section */}
        <div className="flex w-full flex-col justify-between bg-[#F8F8F8] p-3 sm:p-4 lg:w-1/2 lg:p-6 relative">
          {hasDiscount && (
            <div className="absolute top-4 left-4 z-20 bg-red-600 text-white font-bold text-xs px-2.5 py-1 rounded shadow">
              -{discountPercent}%
            </div>
          )}
          {/* Main Image */}
          <div className="relative mx-auto flex aspect-square w-full max-w-[260px] items-center justify-center sm:max-w-[340px] lg:max-w-[420px]">
            <Image
              src={productImages[selectedImage]}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 260px, (max-width: 1024px) 340px, 420px"
              className="object-contain"
              priority
            />
          </div>

          {/* Thumbnails */}
          {productImages.length > 1 && (
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 sm:mt-4 sm:gap-2">
              {productImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative size-12 flex-shrink-0 overflow-hidden rounded-md border-2 sm:size-16 ${
                    selectedImage === index
                      ? "border-yellow-500"
                      : "border-transparent"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${product.title} thumbnail ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 48px, 64px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details Section */}
        <div className="flex max-h-[calc(90vh-140px)] w-full flex-col justify-between overflow-y-auto p-4 sm:max-h-[calc(90vh-160px)] sm:p-6 lg:max-h-[min(90vh,calc(100vh-4rem))] lg:w-1/2 lg:p-8">
          <div>
            {/* Brand Header */}
            {product.brand && (
              <div className="flex items-center gap-2">
                <a
                  href={`/products?search=${encodeURIComponent(product.brand)}`}
                  className="text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-yellow-600"
                >
                  {product.brand}
                </a>
              </div>
            )}
            <h2 className="text-lg font-bold mt-1 sm:text-xl md:text-2xl">{product.title}</h2>

            {/* Price */}
            <div className="flex items-center gap-2 sm:gap-4 mt-2 sm:mt-4">
              <div className="flex flex-col">
                {hasDiscount ? (
                  <div className="flex items-baseline flex-wrap gap-2.5">
                    <span className="text-base sm:text-xl text-red-500 line-through font-semibold">
                      {currentPrice.toFixed(2).replace('.', ',')} Dt
                    </span>
                    <span className="text-2xl sm:text-3xl font-bold text-emerald-600">
                      {product.discounted_price!.toFixed(2).replace('.', ',')} Dt
                    </span>
                    <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded font-bold">
                      -{discountPercent}%
                    </span>
                  </div>
                ) : (
                  <span className="text-xl font-bold sm:text-2xl md:text-3xl text-yellow-600">
                    {selectedSize
                      ? `${selectedSize.price.toFixed(2).replace('.', ',')} Dt`
                      : sortedSizes[0]
                      ? `À partir de ${sortedSizes[0].price.toFixed(2).replace('.', ',')} Dt`
                      : "Prix indisponible"}
                  </span>
                )}
                {product.sizes.length > 1 && !selectedSize && sortedSizes[0] && (
                  <span className="text-xs text-gray-500 sm:text-sm">
                    {`${sortedSizes[0].price.toFixed(2).replace('.', ',')} Dt - ${sortedSizes[
                      sortedSizes.length - 1
                    ].price.toFixed(2).replace('.', ',')} Dt`}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="mt-4 text-sm text-gray-600 sm:mt-6 sm:text-base">
              {product.description?.trim() ||
                "Description à venir pour ce produit."}
            </p>

            {/* Size Selection */}
            {sortedSizes.length > 0 && (
              <div className="mt-4 sm:mt-6 md:mt-8">
                <span className="text-xs font-medium sm:text-sm">Choisir la Taille:</span>
                <div className="flex gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 flex-wrap">
                  {sortedSizes.map((sizeOption) => {
                    const label = getSizeLabel(sizeOption);
                    const isSelected =
                      selectedSize?.size === sizeOption.size &&
                      selectedSize?.unit === sizeOption.unit &&
                      selectedSize?.quantity === sizeOption.quantity;

                    return (
                      <button
                        key={`${sizeOption.size}-${sizeOption.price}-${sizeOption.quantity ?? "na"}`}
                        onClick={() => setSelectedSize(sizeOption)}
                        className={`w-fit h-fit px-2 py-1 text-xs rounded-md sm:px-3 sm:py-1.5 sm:text-sm sm:rounded-lg flex flex-col items-center justify-center gap-0.5 sm:gap-1 ${isSelected
                          ? "bg-black text-white"
                          : "border border-gray-200 hover:border-gray-300"
                          }`}
                      >
                        <span>{label}</span>
                        <span className="font-semibold">
                          {sizeOption.price.toFixed(2).replace('.', ',')} Dt
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Availability badge */}
            <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-4">
              {selectedStock !== null && (
                <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium sm:text-sm ${
                      selectedStock <= 0
                        ? "bg-red-100 text-red-700"
                        : selectedStock <= 2
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {selectedStock <= 0
                      ? "En rupture de stock"
                      : selectedStock <= 2
                      ? selectedStock === 1 ? "Dernier article en stock" : "Derniers articles en stock"
                      : "En stock"}
                  </span>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="mt-4 sm:mt-6">
              <span className="text-xs font-medium sm:text-sm">Quantité:</span>
              <div className="flex items-center gap-2 mt-1.5 sm:mt-2">
                <button
                  onClick={decreaseQuantity}
                  disabled={actionDisabled || quantity <= 1}
                  className="flex size-7 items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50 sm:size-8"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-medium sm:w-12 sm:text-base">
                  {quantity}
                </span>
                <button
                  onClick={increaseQuantity}
                  disabled={
                    actionDisabled ||
                    (typeof selectedStock === "number" &&
                      quantity >= selectedStock)
                  }
                  className="flex size-7 items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50 sm:size-8"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-2 border-t pt-4 sm:mt-8 sm:gap-3 sm:pt-6">
            <Button
              onClick={handleAddToCart}
              disabled={actionDisabled}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-yellow-500 py-2 text-xs font-semibold text-white hover:bg-yellow-600 disabled:opacity-50 sm:py-3 sm:text-sm"
            >
              <ShoppingCart className="size-3.5 sm:size-4" />
              Ajouter au panier
            </Button>
            <Button
              onClick={handleOrderNow}
              disabled={actionDisabled}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-black py-2 text-xs font-semibold text-white hover:bg-black/90 disabled:opacity-50 sm:py-3 sm:text-sm"
            >
              <ShoppingBag className="size-3.5 sm:size-4" />
              Commander Maintenant
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;
