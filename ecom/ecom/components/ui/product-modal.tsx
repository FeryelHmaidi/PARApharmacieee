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

    addItem({
      productId: product.id,
      variantId: selectedSize.variantId,
      title: product.title,
      sizeLabel: getSizeLabel(selectedSize),
      unitPrice: selectedSize.price,
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

        {/* Image gallery - on top when stacked (small screens), left when side-by-side (lg+) */}
        <div className="flex w-full flex-shrink-0 flex-col gap-2 p-3 sm:gap-4 sm:p-4 lg:min-h-0 lg:w-[min(400px,45%)] lg:flex-row lg:p-6">
          {/* Thumbnail list */}
          <div className="flex w-full gap-2 overflow-x-auto pb-1 sm:gap-3 lg:w-[80px] lg:flex-shrink-0 lg:flex-col lg:overflow-visible lg:pb-0 xl:w-[100px]">
            {productImages.map((image, index) => (
              <div
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 bg-gray-100 sm:h-20 sm:w-20 lg:h-auto lg:w-full lg:aspect-square ${index === selectedImage
                  ? "border-yellow-600"
                  : "border-transparent"
                  } hover:border-yellow-600 transition cursor-pointer`}
              >
                <div className="relative w-full h-full">
                  <Image
                    src={image}
                    alt={`${product.title} view ${index + 1}`}
                    fill
                    className="w-full h-full object-contain p-1"
                  />
                </div>
              </div>
            ))}
            {/* Brand Logo (Under Thumbnails) */}
            {product.brand_logo_url && (
              <div className="flex justify-center mt-4 w-full">
                <a
                  href={product.brand ? `/products?search=${encodeURIComponent(product.brand)}` : '#'}
                  className={`block h-12 w-full relative transition ${product.brand ? 'hover:opacity-80 cursor-pointer' : 'cursor-default pointer-events-none'}`}
                  title={product.brand || "Marque"}
                >
                  <img
                    src={product.brand_logo_url}
                    alt={product.brand || "Logo de la marque"}
                    className="h-full w-full object-contain"
                  />
                </a>
              </div>
            )}
          </div>

          {/* Main image and Logo wrapper */}
          <div className="flex flex-1 flex-col gap-4">
            <div className="relative flex flex-1 items-center justify-center rounded-lg bg-gray-50 overflow-hidden min-h-[180px] sm:min-h-[220px] lg:min-h-[240px]">
              <Image
                src={productImages[selectedImage]}
                alt={product.title}
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>

        {/* Product details - below images when stacked (small screens), right when side-by-side (lg+) */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Brand Text (Fallback) */}
          {product.brand && !product.brand_logo_url && (
            <div className="mt-2 sm:mt-4 mb-1">
              <a
                href={`/products?search=${encodeURIComponent(product.brand)}`}
                className="text-sm font-semibold text-gray-500 hover:text-blue-600 hover:underline cursor-pointer"
              >
                {product.brand}
              </a>
            </div>
          )}
          <h2 className="text-lg font-bold mt-1 sm:text-xl md:text-2xl">{product.title}</h2>

          {/* Price and Rating */}
          <div className="flex items-center gap-2 sm:gap-4 mt-2 sm:mt-4">
            <div className="flex flex-col">
              <span className="text-xl font-bold sm:text-2xl md:text-3xl">
                {selectedSize
                  ? `${selectedSize.price.toFixed(2).replace('.', ',')} Dt`
                  : sortedSizes[0]
                    ? `À partir de ${sortedSizes[0].price.toFixed(2).replace('.', ',')} Dt`
                    : "Prix indisponible"}
              </span>
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
                      key={`${sizeOption.size}-${sizeOption.price}-${sizeOption.quantity ?? "na"
                        }`}
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

          {/* Availability badge (based on selected size) */}
          {selectedStock !== null && (
            <div className="mt-3 sm:mt-4">
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
            </div>
          )}

          {/* Quantity Selector */}
          <div className="mt-4 flex w-full flex-col items-stretch gap-3 sm:mt-6 sm:gap-4 md:mt-8 md:flex-row md:items-end">
            <div>
              <span className="text-xs font-medium mb-1.5 block sm:text-sm sm:mb-2">Quantity:</span>
              <div className="flex items-center h-9 w-full max-w-[120px] rounded-lg border border-gray-200 sm:h-10">
                <button
                  onClick={decreaseQuantity}
                  className="w-9 h-full flex items-center justify-center text-base border-r border-gray-200 hover:bg-gray-50 transition sm:w-10 sm:text-lg"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <div className="flex-1 h-full flex items-center justify-center font-medium">
                  {quantity}
                </div>
                <button
                  onClick={increaseQuantity}
                  className="w-9 h-full flex items-center justify-center text-base border-l border-gray-200 hover:bg-gray-50 transition sm:w-10 sm:text-lg"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>{" "}
            <div className="flex w-full flex-col gap-2 sm:flex-row md:flex-1 md:gap-3">
              <Button
                className="flex-1 rounded-lg bg-yellow-100 py-3 text-sm font-medium text-yellow-900 transition hover:bg-yellow-200 sm:py-4 sm:text-base"
                size={"lg"}
                onClick={handleAddToCart}
                disabled={actionDisabled}
              >
                <ShoppingBag className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Ajouter au Panier
              </Button>
              <Button
                className="flex-1 rounded-lg bg-yellow-600 py-3 text-sm font-medium text-white transition hover:bg-yellow-600/90 sm:py-4 sm:text-base"
                size={"lg"}
                onClick={handleOrderNow}
                disabled={actionDisabled}
              >
                <ShoppingCart className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Commander maintenant
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;
