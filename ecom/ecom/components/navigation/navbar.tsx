"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Menu, Search as SearchIcon, User } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import CartDropdown from "@/components/cart/CartDropdown";
import ProductModal from "@/components/ui/product-modal";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/supabase";
import { toast } from "sonner";
import Image from "next/image";

const NAV_LINKS = [
  { label: "Nos Produits", href: "/products" },
  { label: "Commandes", href: "/orders" },
];

const PRODUCT_PHOTO_BUCKET = "product-photos";
const FALLBACK_IMAGE = "/fallback-image.jpg";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

type ProductVariantRow =
  Database["public"]["Tables"]["product_variants"]["Row"];
type ProductPhotoRow = Database["public"]["Tables"]["product_photos"]["Row"];

type SearchContext = "desktop" | "mobile" | "sheet";

type ProductSuggestion = {
  id: string;
  name: string;
  sku: string | null;
  image: string | null;
};

type ModalProduct = {
  id: string;
  title: string;
  sizes: {
    size: string;
    price: number;
    variantId?: string;
    quantity?: number | null;
    unit?: string | null;
  }[];
  image: string;
  images?: string[];
  description?: string;
};

const toPublicPhotoUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!SUPABASE_URL) return null;
  const sanitizedPath = url.replace(/^\/+/, "");
  return `${SUPABASE_URL}/storage/v1/object/public/${PRODUCT_PHOTO_BUCKET}/${sanitizedPath}`;
};

const normalizePhotos = (photos: ProductPhotoRow[]): ProductPhotoRow[] =>
  photos.map((photo) => ({
    ...photo,
    url: toPublicPhotoUrl(photo.url) ?? photo.url ?? null,
  }));

const pickPrimaryPhoto = (
  photos: ProductPhotoRow[],
  fallback?: string | null
): string | null => {
  if (photos.length) {
    const sorted = [...photos].sort((a, b) => {
      const posA = a.position ?? Number.POSITIVE_INFINITY;
      const posB = b.position ?? Number.POSITIVE_INFINITY;
      return posA - posB;
    });
    const selected = sorted.find((photo) => photo.url)?.url;
    if (selected) return selected;
  }
  return toPublicPhotoUrl(fallback) ?? fallback ?? null;
};

const variantSizeLabel = (variant: ProductVariantRow): string => {
  const hasValue = typeof variant.size_value === "number";
  const unit = variant.size_unit?.trim();
  if (hasValue && unit) return `${variant.size_value}${unit}`;
  if (hasValue) return String(variant.size_value);
  if (unit) return unit;
  return "Standard";
};

type SearchBarProps = {
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  hideButtonLabel?: boolean;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event?: React.FormEvent<HTMLFormElement>) => void;
  suggestions?: ProductSuggestion[];
  isLoadingSuggestions?: boolean;
  showSuggestions?: boolean;
  onSuggestionSelect?: (suggestion: ProductSuggestion) => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

const SearchBar = ({
  className,
  inputRef,
  hideButtonLabel = false,
  value,
  onChange,
  onSubmit,
  suggestions = [],
  isLoadingSuggestions = false,
  showSuggestions = false,
  onSuggestionSelect,
  onFocus,
  onBlur,
}: SearchBarProps) => (
  <div className={cn("relative", className)}>
    <form onSubmit={onSubmit} className="relative flex items-center w-full ">
      <SearchIcon className="pointer-events-none absolute left-3 size-4  text-gray-400" />
      <Input
        ref={
          inputRef ? (inputRef as React.RefObject<HTMLInputElement>) : undefined
        }
        type="text"
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="Rechercher un produit..."
        aria-label="Rechercher un produit"
        className="h-11 w-full rounded-xl border bg-white pl-10 pr-24 text-sm focus-visible:ring-yellow-500"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-yellow-700"
      >
        <SearchIcon className="size-4" />
        {!hideButtonLabel && <span>Rechercher</span>}
      </button>
    </form>
    {showSuggestions && (
      <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-yellow-50 bg-white shadow-2xl">
        {isLoadingSuggestions ? (
          <div className="px-4 py-3 text-sm text-gray-500">
            Recherche en cours…
          </div>
        ) : suggestions.length ? (
          <ul className="max-h-64 divide-y divide-gray-100 overflow-auto">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-900 transition hover:bg-yellow-50"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onSuggestionSelect?.(suggestion)}
                >
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-yellow-50 bg-yellow-50/50">
                    <img
                      src={suggestion.image ?? FALLBACK_IMAGE}
                      alt={suggestion.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-medium leading-tight">
                      {suggestion.name}
                    </span>
                    {suggestion.sku && (
                      <span className="text-xs uppercase tracking-wide text-gray-500">
                        SKU {suggestion.sku}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-3 text-sm text-gray-500">
            Aucun produit ne correspond à votre recherche.
          </div>
        )}
      </div>
    )}
  </div>
);

export default function Navbar() {
  const [lastScrollY, setLastScrollY] = useState(0);
  const [shouldShow, setShouldShow] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [activeSuggestionContext, setActiveSuggestionContext] =
    useState<SearchContext | null>(null);
  const [modalProduct, setModalProduct] = useState<ModalProduct | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isProductModalLoading, setIsProductModalLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get("search") ?? "";
  const supabase = useMemo(() => createClient(), []);
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsAtTop(currentScrollY === 0);
      if (currentScrollY < lastScrollY) {
        setShouldShow(true);
      } else if (currentScrollY > 50) {
        setShouldShow(false);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    let mounted = true;

    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !mounted) return;
      setIsAuthenticated(Boolean(data.session?.user));
    };

    syncSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setIsAuthenticated(Boolean(session?.user));
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    setSearchValue(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const timeout = setTimeout(
      () => mobileSearchInputRef.current?.focus(),
      200
    );
    return () => clearTimeout(timeout);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen) return;
    setActiveSuggestionContext((current) =>
      current === "sheet" ? null : current
    );
  }, [mobileMenuOpen]);

  useEffect(() => {
    const query = searchValue.trim();
    if (!query) {
      setSuggestions([]);
      setIsFetchingSuggestions(false);
      return;
    }

    let canceled = false;
    setIsFetchingSuggestions(true);
    const handler = setTimeout(async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`id, name, sku, product_photos (url, position)`)
        .ilike("name", `%${query}%`)
        .order("name", { ascending: true })
        .limit(6);

      if (canceled) return;

      if (error) {
        console.error("Unable to fetch product suggestions", error);
        setSuggestions([]);
      } else {
        const sanitized = (data ?? [])
          .map((item) => {
            const photos = normalizePhotos(
              ((item as any).product_photos ?? []) as ProductPhotoRow[]
            );
            return {
              id: String(item.id),
              name: (item.name ?? "").trim(),
              sku: item.sku ?? null,
              image: pickPrimaryPhoto(photos) ?? FALLBACK_IMAGE,
            } satisfies ProductSuggestion;
          })
          .filter((item) => item.name.length > 0);
        setSuggestions(sanitized);
      }

      setIsFetchingSuggestions(false);
    }, 200);

    return () => {
      canceled = true;
      clearTimeout(handler);
    };
  }, [searchValue, supabase]);

  const fetchProductDetails = useCallback(
    async (productId: string): Promise<ModalProduct | null> => {
      const { data, error } = await supabase
        .from("products")
        .select(
          `id, name, description,
           product_variants (id, price, size_value, size_unit),
           product_photos (url, position)`
        )
        .eq("id", productId)
        .single();

      if (error || !data) {
        console.error("Unable to load product", error);
        return null;
      }

      const variants = (
        ((data as any).product_variants ?? []) as ProductVariantRow[]
      ).filter((variant): variant is ProductVariantRow => Boolean(variant));
      const photos = normalizePhotos(
        ((data as any).product_photos ?? []) as ProductPhotoRow[]
      );
      const heroImage = pickPrimaryPhoto(photos) ?? FALLBACK_IMAGE;
      const galleryImages = photos
        .map((photo) => photo.url)
        .filter((url): url is string => Boolean(url));
      const orderedImages = heroImage
        ? [heroImage, ...galleryImages.filter((img) => img !== heroImage)]
        : galleryImages;

      const modalSizes = variants.length
        ? variants.map((variant) => ({
            size: variantSizeLabel(variant),
            price: variant.price ?? 0,
            variantId: variant.id ? String(variant.id) : undefined,
            quantity: variant.size_value,
            unit: variant.size_unit,
          }))
        : [
            {
              size: "Standard",
              price: 0,
            },
          ];

      return {
        id: String(data.id),
        title: (data.name ?? "Produit").trim() || "Produit",
        sizes: modalSizes,
        image: heroImage,
        images: orderedImages.length ? orderedImages : undefined,
        description: data.description ?? undefined,
      } satisfies ModalProduct;
    },
    [supabase]
  );

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      closeMobileMenu();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Unable to sign out", error);
    } finally {
      setIsSigningOut(false);
    }
  }, [closeMobileMenu, isSigningOut, router, supabase]);

  const handleProfileNavigate = useCallback(() => {
    closeMobileMenu();
    router.push("/profile");
  }, [closeMobileMenu, router]);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchValue(event.target.value);
    },
    []
  );

  const handleSearchFocus = useCallback((context: SearchContext) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setActiveSuggestionContext(context);
  }, []);

  const handleSearchBlur = useCallback((context: SearchContext) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = setTimeout(() => {
      setActiveSuggestionContext((current) =>
        current === context ? null : current
      );
    }, 120);
  }, []);

  const handleSuggestionSelect = useCallback(
    async (suggestion: ProductSuggestion) => {
      if (!suggestion?.id || isProductModalLoading) return;
      setSearchValue(suggestion.name);
      setActiveSuggestionContext(null);
      closeMobileMenu();
      setIsProductModalLoading(true);
      const product = await fetchProductDetails(suggestion.id);
      setIsProductModalLoading(false);

      if (!product) {
        toast.error("Impossible d'ouvrir ce produit");
        return;
      }

      setModalProduct(product);
      setIsProductModalOpen(true);
    },
    [closeMobileMenu, fetchProductDetails, isProductModalLoading]
  );

  const handleSearchSubmit = useCallback(
    (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const query = searchValue.trim();
      const target = query
        ? `/products?search=${encodeURIComponent(query)}`
        : "/products";
      closeMobileMenu();
      setActiveSuggestionContext(null);
      router.push(target);
    },
    [closeMobileMenu, router, searchValue]
  );

  const handleProductModalClose = useCallback(() => {
    setIsProductModalOpen(false);
  }, []);

  const searchHasValue = Boolean(searchValue.trim());
  const accountHref = isAuthenticated ? "/profile" : "/auth/login";
  const accountLabel = isAuthenticated ? "Profil" : "Compte";

  return (
    <>
      <motion.nav
        className="fixed top-0 z-50 flex h-auto w-full justify-center bg-white/80 py-2 sm:py-3 backdrop-blur-sm"
        initial={{ opacity: 1, y: 0 }}
        animate={{
          opacity: shouldShow ? 1 : 0,
          y: shouldShow ? 0 : -100,
          boxShadow:
            shouldShow && !isAtTop ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="w-full max-w-[1200px] px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    aria-label="Ouvrir le menu"
                  >
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="flex h-full flex-col gap-6"
                >
                  <SheetHeader className="px-4">
                    <SheetTitle>PharmaStore</SheetTitle>
                  </SheetHeader>
                  <div className="px-4">
                    <SearchBar
                      className="w-full"
                      inputRef={mobileSearchInputRef}
                      hideButtonLabel
                      value={searchValue}
                      onChange={handleSearchChange}
                      onSubmit={handleSearchSubmit}
                      suggestions={suggestions}
                      isLoadingSuggestions={isFetchingSuggestions}
                      showSuggestions={
                        searchHasValue && activeSuggestionContext === "sheet"
                      }
                      onSuggestionSelect={handleSuggestionSelect}
                      onFocus={() => handleSearchFocus("sheet")}
                      onBlur={() => handleSearchBlur("sheet")}
                    />
                  </div>
                  <nav className="px-4">
                    <p className="mb-2 text-xs uppercase tracking-[0.3em] text-gray-500">
                      Navigation
                    </p>
                    <div className="space-y-2">
                      {NAV_LINKS.map((link) => (
                        <Button
                          key={link.href}
                          variant="ghost"
                          className="w-full justify-start text-base"
                          asChild
                        >
                          <Link href={link.href} onClick={closeMobileMenu}>
                            {link.label}
                          </Link>
                        </Button>
                      ))}
                    </div>
                  </nav>
                  <div className="px-4">
                    <p className="mb-2 text-xs uppercase tracking-[0.3em] text-gray-500">
                      Compte
                    </p>
                    <div className="space-y-2">
                      {isAuthenticated ? (
                        <>
                          <Button
                            className="w-full"
                            onClick={handleProfileNavigate}
                          >
                            Mon profil
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
                            disabled={isSigningOut}
                            onClick={handleSignOut}
                          >
                            {isSigningOut ? "Deconnexion" : "Se deconnecter"}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button className="w-full" asChild>
                            <Link href="/auth/login" onClick={closeMobileMenu}>
                              Se connecter
                            </Link>
                          </Button>
                          <Button variant="outline" className="w-full" asChild>
                            <Link
                              href="/auth/sign-up"
                              onClick={closeMobileMenu}
                            >
                              Creer un compte
                            </Link>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <Link
                href="/"
                className="whitespace-nowrap text-xl font-bold text-yellow-600"
              >
                <Image
                  src="/logo.svg"
                  alt="PharmaStore"
                  width={100}
                  height={100}
                  className="size-14"
                />
              </Link>
              <Button
                variant="ghost"
                asChild
                className="hidden font-medium md:inline-flex"
              >
                <Link href="/products">Nos Produits</Link>
              </Button>
            </div>

            <SearchBar
              className="hidden flex-1 md:flex"
              value={searchValue}
              onChange={handleSearchChange}
              onSubmit={handleSearchSubmit}
              suggestions={suggestions}
              isLoadingSuggestions={isFetchingSuggestions}
              showSuggestions={
                searchHasValue && activeSuggestionContext === "desktop"
              }
              onSuggestionSelect={handleSuggestionSelect}
              onFocus={() => handleSearchFocus("desktop")}
              onBlur={() => handleSearchBlur("desktop")}
            />

            <div className="hidden items-center gap-3 md:flex">
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="gap-2"
                      aria-label="Menu compte"
                    >
                      <User size={20} />
                      <span className="hidden lg:inline">Profil</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        handleProfileNavigate();
                      }}
                    >
                      Voir mon profil
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={isSigningOut}
                      onSelect={(event) => {
                        event.preventDefault();
                        handleSignOut();
                      }}
                    >
                      {isSigningOut ? "Deconnexion" : "Se deconnecter"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" className="gap-2" asChild>
                  <Link href={accountHref} aria-label={accountLabel}>
                    <User size={20} />
                    <span className="hidden lg:inline">{accountLabel}</span>
                  </Link>
                </Button>
              )}
              <div className="flex-shrink-0">
                <CartDropdown />
              </div>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Mon profil"
                  onClick={handleProfileNavigate}
                >
                  <User size={20} />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/auth/login" aria-label="Se connecter">
                    <User size={20} />
                  </Link>
                </Button>
              )}
              <div className="flex-shrink-0">
                <CartDropdown />
              </div>
            </div>
          </div>

          <div className="mt-3 md:hidden">
            <SearchBar
              className="w-full"
              hideButtonLabel
              value={searchValue}
              onChange={handleSearchChange}
              onSubmit={handleSearchSubmit}
              suggestions={suggestions}
              isLoadingSuggestions={isFetchingSuggestions}
              showSuggestions={
                searchHasValue && activeSuggestionContext === "mobile"
              }
              onSuggestionSelect={handleSuggestionSelect}
              onFocus={() => handleSearchFocus("mobile")}
              onBlur={() => handleSearchBlur("mobile")}
            />
          </div>
        </div>
      </motion.nav>
      {modalProduct && (
        <ProductModal
          isOpen={isProductModalOpen}
          onClose={handleProductModalClose}
          product={modalProduct}
        />
      )}
    </>
  );
}
