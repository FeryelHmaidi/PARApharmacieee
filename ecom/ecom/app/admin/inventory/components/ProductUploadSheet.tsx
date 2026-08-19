"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { PlusCircle, Camera, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Database } from "@/types/supabase";
import { Constants } from "@/types/supabase";
import type {
  ProductWithRelations,
  VariantRow,
  PhotoRow,
  TagRow,
} from "../types";
import { useUploadProduct, type VariantDraft } from "../hooks/useUploadProduct";
import { useEditProductFull } from "../hooks/useEditProductFull";
import { useTags } from "../hooks/useTags";
import { useCreateTag } from "../hooks/useCreateTag";
import { cn } from "@/lib/utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type SizeUnit = Database["public"]["Enums"]["size_unit"];
type ProductStatus = Database["public"]["Enums"]["product_status"];

type VariantFormState = {
  id: string;
  variantId?: string;
  costPrice: string;
  price: string;
  currency: string;
  stock: string;
  expiry: string;
  sizeValue: string;
  sizeUnit: SizeUnit | "";
  active: boolean;
};

type ExistingPhotoState = PhotoRow & { removed?: boolean };
type VariantPayload = VariantDraft & { id?: string };

const sizeUnitOptions = Constants.public.Enums.size_unit;
const DEFAULT_CURRENCY = "TND";

const createVariantFormState = (variant?: VariantRow): VariantFormState => ({
  id:
    variant?.id ??
    (typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).slice(2)),
  variantId: variant?.id,
  costPrice: variant && (variant as any).cost_price != null ? String((variant as any).cost_price).replace('.', ',') : "",
  price: variant ? String(variant.price ?? "").replace('.', ',') : "",
  currency: variant?.currency ?? DEFAULT_CURRENCY,
  stock: variant ? String(variant.stock ?? "") : "",
  expiry: variant?.expiry_date ?? "",
  sizeValue:
    variant && variant.size_value != null ? String(variant.size_value) : "",
  sizeUnit: (variant?.size_unit as SizeUnit | "") ?? "",
  active: variant?.active ?? true,
});

export default function ProductUploadSheet({
  trigger,
  open,
  onOpenChange,
  onSuccess,
  initialProduct,
  hideTrigger = false,
}: {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: (productId: string) => void; // optional callback so parent can refresh
  initialProduct?: ProductWithRelations | null;
  hideTrigger?: boolean;
}) {
  // controlled/uncontrolled open state (same as before)
  const [localOpen, setLocalOpen] = useState<boolean>(false);
  useEffect(() => {
    if (typeof open === "boolean") setLocalOpen(open);
  }, [open]);

  const setOpen = (val: boolean) => {
    if (typeof onOpenChange === "function") onOpenChange(val);
    if (typeof open !== "boolean") setLocalOpen(val);
  };

  const isSheetOpen = typeof open === "boolean" ? Boolean(open) : localOpen;

  useEffect(() => {
    if (!isSheetOpen) return;
    resetForm(initialProduct ?? null);
  }, [isSheetOpen, initialProduct]);

  // form state
  const buildInitialVariants = () => {
    if (initialProduct?.variants?.length) {
      return initialProduct.variants.map((variant) =>
        createVariantFormState(variant as VariantRow)
      );
    }
    return [createVariantFormState()];
  };

  const buildInitialPhotos = () =>
    (initialProduct?.photos as PhotoRow[] | undefined)?.map((photo) => ({
      ...photo,
      removed: false,
    })) ?? [];

  const [name, setName] = useState(initialProduct?.name ?? "");
  const [sku, setSku] = useState(initialProduct?.sku ?? "");
  const [description, setDescription] = useState(
    initialProduct?.description ?? ""
  );
  const [category, setCategory] = useState(
    (initialProduct as any)?.category ?? ""
  );
  const [subCategory, setSubCategory] = useState(
    (initialProduct as any)?.sub_category ?? (initialProduct as any)?.subcategory ?? ""
  );
  const [brand, setBrand] = useState(initialProduct?.brand ?? "");
  const [variantForms, setVariantForms] =
    useState<VariantFormState[]>(buildInitialVariants);
  const [bestSeller, setBestSeller] = useState(
    initialProduct?.best_seller ?? false
  );
  const [inactive, setInactive] = useState(
    initialProduct?.status === "inactive"
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    (initialProduct?.tags ?? []).map((tag) => tag.id)
  );
  const [newTagName, setNewTagName] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [brandLogoFile, setBrandLogoFile] = useState<File | null>(null);
  const [brandLogoPreview, setBrandLogoPreview] = useState<string | null>(null);
  const [removedBrandLogo, setRemovedBrandLogo] = useState(false);
  const [existingPhotos, setExistingPhotos] =
    useState<ExistingPhotoState[]>(buildInitialPhotos);
  const [removedVariantIds, setRemovedVariantIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const brandLogoRef = useRef<HTMLInputElement | null>(null);

  // Dictionaries state
  const [dictCategories, setDictCategories] = useState<{id: string, name: string}[]>([]);
  const [dictSubcategories, setDictSubcategories] = useState<{id: string, name: string, category_id: string}[]>([]);
  const [dictBrands, setDictBrands] = useState<{id: string, name: string, brand_logo_url: string | null}[]>([]);
  const supabase = useMemo(() => createClientComponentClient(), []);

  useEffect(() => {
    async function fetchDictionaries() {
      const [catsRes, subcatsRes, brandsRes] = await Promise.all([
        supabase.from("categories").select("id, name").order("name"),
        supabase.from("subcategories").select("id, name, category_id").order("name"),
        supabase.from("brands").select("id, name, brand_logo_url").order("name"),
      ]);
      if (catsRes.data) setDictCategories(catsRes.data);
      if (subcatsRes.data) setDictSubcategories(subcatsRes.data);
      if (brandsRes.data) setDictBrands(brandsRes.data);
    }
    fetchDictionaries();
  }, [supabase]);

  // Derived filtered subcategories based on selected category text
  // Since `category` state holds the name (text), we need to find its ID first
  const selectedCategoryId = useMemo(() => {
    return dictCategories.find(c => c.name === category)?.id;
  }, [category, dictCategories]);

  const filteredSubcategories = useMemo(() => {
    if (!selectedCategoryId) return dictSubcategories;
    return dictSubcategories.filter(s => s.category_id === selectedCategoryId);
  }, [selectedCategoryId, dictSubcategories]);

  const uploadMutation = useUploadProduct();
  const uploadProductAsync = uploadMutation.mutateAsync.bind(uploadMutation);
  const editMutation = useEditProductFull();
  const editProductAsync = editMutation.mutateAsync.bind(editMutation);
  const { data: fetchedTags = [], isLoading: tagsLoading } = useTags();
  const createTagMutation = useCreateTag();
  const isEditMode = Boolean(initialProduct);
  const isUploading = isEditMode
    ? editMutation.isPending
    : uploadMutation.isPending;
  // validation state
  const [errors, setErrors] = useState<{
    name?: string;
    sku?: string;
    photos?: string;
    variants?: string;
  }>({});

  const updatePhotoErrorBounds = (totalPhotos: number) => {
    setErrors((prev) => {
      if (totalPhotos > 5) {
        if (prev.photos === "Max 5 images") return prev;
        return { ...prev, photos: "Max 5 images" };
      }

      if (
        totalPhotos > 0 &&
        (prev.photos === "Max 5 images" ||
          prev.photos === "Add at least one photo")
      ) {
        const nextErrors = { ...prev };
        delete nextErrors.photos;
        return nextErrors;
      }

      if (totalPhotos <= 5 && prev.photos === "Max 5 images") {
        const nextErrors = { ...prev };
        delete nextErrors.photos;
        return nextErrors;
      }

      return prev;
    });
  };

  const clearVariantError = () => {
    setErrors((prev) =>
      prev.variants ? { ...prev, variants: undefined } : prev
    );
  };

  const updateVariantField = <K extends keyof VariantFormState>(
    id: string,
    field: K,
    value: VariantFormState[K]
  ) => {
    clearVariantError();
    setVariantForms((prev) =>
      prev.map((variant) =>
        variant.id === id ? { ...variant, [field]: value } : variant
      )
    );
  };

  const addVariant = () => {
    clearVariantError();
    setVariantForms((prev) => [...prev, createVariantFormState()]);
  };

  const removeVariant = (id: string) => {
    if (variantForms.length === 1) {
      toast.error("At least one variant is required");
      return;
    }
    clearVariantError();
    const removed = variantForms.find((variant) => variant.id === id);
    if (removed?.variantId) {
      setRemovedVariantIds((prev) =>
        prev.includes(removed.variantId!) ? prev : [...prev, removed.variantId!]
      );
    }
    setVariantForms((prev) => prev.filter((variant) => variant.id !== id));
  };

  const parseVariantForms = (): VariantPayload[] => {
    if (!variantForms.length) {
      throw new Error("Add at least one variant");
    }

    return variantForms.map((variant, index) => {
      const order = index + 1;
      const trimmedPrice = variant.price.trim().replace(',', '.');
      const trimmedStock = variant.stock.trim();
      const trimmedCurrency = variant.currency.trim();
      const trimmedCostPrice = variant.costPrice ? variant.costPrice.trim().replace(',', '.') : undefined;

      const price = Number(trimmedPrice);
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error(`Variant ${order}: price must be greater than 0`);
      }

      const cost_price =
        trimmedCostPrice && trimmedCostPrice !== ""
          ? Number(trimmedCostPrice)
          : null;
      if (cost_price !== null && (!Number.isFinite(cost_price) || cost_price < 0)) {
        throw new Error(`Variant ${order}: cost price must be zero or more`);
      }

      const stockValue = Number(trimmedStock);
      if (!Number.isFinite(stockValue) || stockValue < 0) {
        throw new Error(`Variant ${order}: stock must be zero or more`);
      }

      if (!trimmedCurrency) {
        throw new Error(`Variant ${order}: currency is required`);
      }

      const rawSizeValue = variant.sizeValue.trim();
      const sizeValue = rawSizeValue === "" ? null : Number(rawSizeValue);
      if (
        sizeValue !== null &&
        (!Number.isFinite(sizeValue) || sizeValue <= 0)
      ) {
        throw new Error(
          `Variant ${order}: size value must be positive when provided`
        );
      }

      return {
        id: variant.variantId,
        cost_price,
        price,
        stock: Math.max(0, Math.trunc(stockValue)),
        currency: trimmedCurrency.toUpperCase(),
        expiry_date: variant.expiry || null,
        size_value: sizeValue,
        size_unit: variant.sizeUnit || null,
        active: variant.active,
      } satisfies VariantPayload;
    });
  };

  // file handler
  const onFiles = (selected: FileList | null) => {
    if (!selected) return;
    const arr = Array.from(selected);
    const MAX_BYTES = 5 * 1024 * 1024;
    const keptExisting = existingPhotos.filter((photo) => !photo.removed);
    const availableSlots = Math.max(0, 5 - keptExisting.length - files.length);

    if (availableSlots <= 0) {
      toast.error("You reached the maximum of 5 photos. Remove one first.");
      return;
    }

    for (const f of arr) {
      if (f.size > MAX_BYTES) {
        toast.error("Each image must be smaller than 5 MB.");
        return;
      }
    }

    const trimmed = arr.slice(0, availableSlots);
    const combined = [...files, ...trimmed];
    setFiles(combined);

    // create previews
    const p = combined.map((f) => URL.createObjectURL(f));
    previews.forEach((u) => URL.revokeObjectURL(u));
    setPreviews(p);

    updatePhotoErrorBounds(keptExisting.length + combined.length);
  };

  const removeFile = (index: number) => {
    const next = files.slice();
    const nextPreviews = previews.slice();
    next.splice(index, 1);
    const removedUrl = nextPreviews.splice(index, 1)[0];
    if (removedUrl) URL.revokeObjectURL(removedUrl);
    setFiles(next);
    setPreviews(nextPreviews);
    if (inputRef.current) inputRef.current.value = "";
    // revalidate
    const keptExisting = existingPhotos.filter(
      (photo) => !photo.removed
    ).length;
    updatePhotoErrorBounds(keptExisting + next.length);
  };

  const onBrandLogoFile = (selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    const file = selected[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Brand logo must be smaller than 5 MB.");
      return;
    }
    
    setBrandLogoFile(file);
    if (brandLogoPreview) URL.revokeObjectURL(brandLogoPreview);
    setBrandLogoPreview(URL.createObjectURL(file));
    setRemovedBrandLogo(false);
  };

  const removeBrandLogoFile = () => {
    setBrandLogoFile(null);
    if (brandLogoPreview) URL.revokeObjectURL(brandLogoPreview);
    setBrandLogoPreview(null);
    if (brandLogoRef.current) brandLogoRef.current.value = "";
    setRemovedBrandLogo(true);
  };

  const toggleExistingPhoto = (photoId: string) => {
    if (!photoId) return;

    const nextExisting = existingPhotos.map((photo) =>
      photo.id === photoId ? { ...photo, removed: !photo.removed } : photo
    );

    setExistingPhotos(nextExisting);

    const keptExisting = nextExisting.filter((photo) => !photo.removed).length;
    updatePhotoErrorBounds(keptExisting + files.length);
  };

  const resetForm = (product?: ProductWithRelations | null) => {
    const target = product ?? null;
    setName(target?.name ?? "");
    setSku(target?.sku ?? "");
    setDescription(target?.description ?? "");
    setCategory((target as any)?.category ?? "");
    setSubCategory((target as any)?.sub_category ?? (target as any)?.subcategory ?? "");
    setBrand(target?.brand ?? "");
    setVariantForms(
      target?.variants?.length
        ? (target.variants as VariantRow[]).map((variant) =>
            createVariantFormState(variant)
          )
        : [createVariantFormState()]
    );
    setBestSeller(target?.best_seller ?? false);
    setInactive(target?.status === "inactive");
    setSelectedTagIds((target?.tags ?? []).map((tag) => tag.id));
    setExistingPhotos(
      (target?.photos as PhotoRow[] | undefined)?.map((photo) => ({
        ...photo,
        removed: false,
      })) ?? []
    );
    setRemovedVariantIds([]);
    setFiles([]);
    previews.forEach((u) => URL.revokeObjectURL(u));
    setPreviews([]);
    
    setBrandLogoFile(null);
    if (brandLogoPreview) URL.revokeObjectURL(brandLogoPreview);
    setBrandLogoPreview(null);
    setRemovedBrandLogo(false);

    if (inputRef.current) inputRef.current.value = "";
    if (brandLogoRef.current) brandLogoRef.current.value = "";
    setErrors({});
    setNewTagName("");
  };

  const combinedTags: TagRow[] = useMemo(() => {
    const initialTags = (initialProduct?.tags as TagRow[] | undefined) ?? [];
    const map = new Map<string, TagRow>();
    initialTags.forEach((tag) => map.set(tag.id, tag));
    fetchedTags.forEach((tag) => map.set(tag.id, tag));
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
    );
  }, [fetchedTags, initialProduct?.id, initialProduct?.tags]);

  const selectedTagObjects = useMemo(() => {
    const dictionary = new Map(combinedTags.map((tag) => [tag.id, tag]));
    return selectedTagIds
      .map((id) => dictionary.get(id))
      .filter((tag): tag is TagRow => Boolean(tag));
  }, [combinedTags, selectedTagIds]);

  const toggleTagSelection = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleCreateTag = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed) {
      toast.error("Entrez un nom de tag avant d'ajouter.");
      return;
    }

    const existing = combinedTags.find(
      (tag) => tag.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (existing) {
      setSelectedTagIds((prev) =>
        prev.includes(existing.id) ? prev : [...prev, existing.id]
      );
      setNewTagName("");
      toast.success("Tag déjà existant ajouté à la sélection.");
      return;
    }

    try {
      const created = await createTagMutation.mutateAsync(trimmed);
      setSelectedTagIds((prev) =>
        prev.includes(created.id) ? prev : [...prev, created.id]
      );
      setNewTagName("");
      toast.success("Tag créé.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Impossible de créer le tag.";
      toast.error(message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedSku = sku.trim();

    if (!trimmedName || !trimmedSku) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const keptExisting = existingPhotos.filter((photo) => !photo.removed);
    const removedExisting = existingPhotos.filter((photo) => photo.removed);
    const removedPhotoIds = removedExisting
      .map((photo) => photo.id)
      .filter((id): id is string => Boolean(id));
    const totalPhotosCount = keptExisting.length + files.length;

    if (totalPhotosCount === 0) {
      setErrors((prev) => ({ ...prev, photos: "Add at least one photo" }));
      toast.error("Add at least one photo.");
      return;
    }

    if (totalPhotosCount > 5) {
      setErrors((prev) => ({ ...prev, photos: "Max 5 images" }));
      toast.error("You can only keep 5 photos.");
      return;
    }

    let normalizedVariants: VariantPayload[];
    try {
      normalizedVariants = parseVariantForms();
      setErrors((prev) => ({ ...prev, variants: undefined }));
    } catch (validationError) {
      const message =
        validationError instanceof Error
          ? validationError.message
          : "Please review variant inputs";
      setErrors((prev) => ({ ...prev, variants: message }));
      toast.error(message);
      return;
    }

    const status: ProductStatus = inactive ? "inactive" : "active";
    const descriptionValue = description.trim() || null;
    const initialTagIds = (initialProduct?.tags ?? []).map((tag) => tag.id);

    let finalTagIds = [...selectedTagIds];

    if (category.trim()) {
      try {
        const catTag = await createTagMutation.mutateAsync(category.trim());
        if (catTag?.id && !finalTagIds.includes(catTag.id)) {
          finalTagIds.push(catTag.id);
        }
      } catch (err) {
        console.error("Error saving category tag:", err);
      }
    }

    if (subCategory.trim()) {
      try {
        const subCatTag = await createTagMutation.mutateAsync(subCategory.trim());
        if (subCatTag?.id && !finalTagIds.includes(subCatTag.id)) {
          finalTagIds.push(subCatTag.id);
        }
      } catch (err) {
        console.error("Error saving subcategory tag:", err);
      }
    }

    const uniqueSelectedTagIds = Array.from(new Set(finalTagIds));

    try {
      if (isEditMode && initialProduct?.id) {
        const highestPosition = keptExisting.reduce(
          (max, photo) =>
            typeof photo.position === "number"
              ? Math.max(max, photo.position)
              : max,
          -1
        );

        const result = await editProductAsync({
          productId: initialProduct.id,
          name: trimmedName,
          sku: trimmedSku,
          description: descriptionValue,
          brand: brand.trim() ? brand.trim() : null,
          best_seller: bestSeller,
          status,
          variants: normalizedVariants,
          removedVariantIds,
          newPhotos: files,
          removedPhotoIds,
          nextPhotoPositionStart: highestPosition + 1,
          tagIds: uniqueSelectedTagIds,
          previousTagIds: initialTagIds,
          brandLogo: brandLogoFile ?? undefined,
          removedBrandLogo,
        });
        resetForm(initialProduct ?? null);
        setOpen(false);
        if (onSuccess && result?.productId) onSuccess(result.productId);
        return;
      }

      const result = await uploadProductAsync({
        name: trimmedName,
        sku: trimmedSku,
        description: descriptionValue,
        brand: brand.trim() ? brand.trim() : null,
        best_seller: bestSeller,
        status,
        variants: normalizedVariants.map(
          ({ id: _omit, ...variant }) => variant
        ),
        photos: files,
        tagIds: uniqueSelectedTagIds,
        brandLogo: brandLogoFile ?? undefined,
      });
      resetForm();
      setOpen(false);
      if (onSuccess && result) onSuccess(result as string);
    } catch (err) {
      // handled by hooks
    }
  };
  const variantBasicsReady =
    variantForms.length > 0 &&
    variantForms.every(
      (variant) =>
        variant.price.trim() !== "" &&
        variant.currency.trim() !== "" &&
        variant.stock.trim() !== ""
    );

  const keptExistingCount = existingPhotos.filter(
    (photo) => !photo.removed
  ).length;
  const totalPhotosSelected = keptExistingCount + files.length;

  const isFormValid =
    !!name.trim() &&
    !!sku.trim() &&
    totalPhotosSelected > 0 &&
    totalPhotosSelected <= 5 &&
    variantBasicsReady;

  const sheetTitle = isEditMode ? "Edit product" : "Create product";
  const sheetDescription = isEditMode
    ? "Update the product details, variants, and photos."
    : "Fill the product details and upload up to 5 photos.";
  const submitLabel = isEditMode ? "Update product" : "Save product";

  return (
    <Sheet open={isSheetOpen} onOpenChange={setOpen}>
      {!hideTrigger &&
        (trigger ? (
          <SheetTrigger asChild>{trigger}</SheetTrigger>
        ) : (
          <SheetTrigger asChild>
            <Button
              variant="default"
              className="inline-flex items-center gap-2 bg-yellow-600 text-white hover:bg-yellow-700"
            >
              <PlusCircle className="h-4 w-4" />
              Add Product
            </Button>
          </SheetTrigger>
        ))}

      <SheetContent className="w-full sm:max-w-xl overflow-x-hidden px-4 sm:px-8">
        <SheetHeader className="px-0 mt-2">
          <SheetTitle>{sheetTitle}</SheetTitle>
          <SheetDescription className="mt-2">
            {sheetDescription}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="product-name">
                Product name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="product-name"
                name="name"
                placeholder="Paracetamol 500mg Tablets"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "err-name" : undefined}
              />
              {errors.name && (
                <p id="err-name" className="text-xs text-red-600 mt-1">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="product-sku">
                SKU <span className="text-red-500">*</span>
              </Label>
              <Input
                id="product-sku"
                name="sku"
                placeholder="PCM-500"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                aria-invalid={!!errors.sku}
                aria-describedby={errors.sku ? "err-sku" : undefined}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Unique product code (eg. barcode or internal SKU).
              </p>
              {errors.sku && (
                <p id="err-sku" className="text-xs text-red-600 mt-1">
                  {errors.sku}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Product Description</Label>
              <Textarea
                id="notes"
                placeholder="Product description for customers"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <Label>Tags</Label>
                <p className="text-xs text-muted-foreground">
                  Sélectionnez des tags existants ou créez-en pour organiser vos
                  produits.
                </p>
              </div>

              <div className="min-h-[2rem] rounded-md border bg-white px-3 py-2 flex flex-wrap gap-2">
                {selectedTagObjects.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    Aucun tag sélectionné.
                  </span>
                )}
                {selectedTagObjects.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700"
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => toggleTagSelection(tag.id)}
                      className="text-yellow-800 hover:text-yellow-900"
                      aria-label={`Retirer le tag ${tag.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Créer un nouveau tag"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  disabled={createTagMutation.isPending}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCreateTag}
                  disabled={createTagMutation.isPending}
                >
                  {createTagMutation.isPending ? "Ajout..." : "Ajouter"}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {tagsLoading && (
                  <span className="text-xs text-muted-foreground">
                    Chargement des tags...
                  </span>
                )}
                {!tagsLoading && combinedTags.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    Aucun tag disponible pour le moment.
                  </span>
                )}
                {combinedTags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      type="button"
                      key={tag.id}
                      onClick={() => toggleTagSelection(tag.id)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition",
                        selected
                          ? "bg-yellow-600 text-white border-yellow-600"
                          : "bg-white text-gray-700 border-gray-200 hover:border-yellow-300"
                      )}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="product-category">Catégorie</Label>
                <Select value={category || undefined} onValueChange={(val) => { setCategory(val); setSubCategory(""); }}>
                  <SelectTrigger id="product-category">
                    <SelectValue placeholder="Sélectionnez une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {dictCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="product-subcategory">Sous-catégorie</Label>
                <Select value={subCategory || undefined} onValueChange={setSubCategory}>
                  <SelectTrigger id="product-subcategory" disabled={!category}>
                    <SelectValue placeholder="Sélectionnez une sous-catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubcategories.map(sub => (
                      <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="product-brand">Marque</Label>
                <Select value={brand || undefined} onValueChange={(val) => {
                  setBrand(val);
                  // Automatically set logo if brand has one
                  const selectedBrand = dictBrands.find(b => b.name === val);
                  if (selectedBrand && selectedBrand.brand_logo_url && !brandLogoFile) {
                    // We don't need to auto-upload it since it's already a URL
                    // But our form expects a File for brandLogo if changed.
                    // We can just let the system keep the existing product URL or upload a new one.
                    // Actually, if we just want to reuse the brand's logo, we can let the backend handle it
                    // or we set it as preview for visual feedback.
                  }
                }}>
                  <SelectTrigger id="product-brand">
                    <SelectValue placeholder="Sélectionnez une marque" />
                  </SelectTrigger>
                  <SelectContent>
                    {dictBrands.map(b => (
                      <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Logo de la marque (Optionnel)</Label>
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="brand-logo-input"
                    className="flex h-10 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-accent hover:text-accent-foreground"
                  >
                    <Camera className="mr-2 h-4 w-4 text-gray-600" />
                    Upload Logo
                    <input
                      ref={brandLogoRef}
                      id="brand-logo-input"
                      className="hidden"
                      type="file"
                      accept="image/*"
                      onChange={(e) => onBrandLogoFile(e.target.files)}
                    />
                  </label>
                  {brandLogoPreview && !removedBrandLogo ? (
                    <div className="relative h-10 w-20 rounded border bg-gray-50 overflow-hidden">
                      <img src={brandLogoPreview} alt="Brand Logo Preview" className="h-full w-full object-contain" />
                      <button
                        type="button"
                        onClick={removeBrandLogoFile}
                        className="absolute right-0 top-0 rounded-bl bg-white/90 p-0.5 shadow-sm hover:bg-white"
                        aria-label="Remove logo"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </button>
                    </div>
                  ) : initialProduct?.brand_logo_url && !removedBrandLogo ? (
                    <div className="relative h-10 w-20 rounded border bg-gray-50 overflow-hidden">
                      <img src={initialProduct.brand_logo_url} alt="Brand Logo" className="h-full w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setRemovedBrandLogo(true)}
                        className="absolute right-0 top-0 rounded-bl bg-white/90 p-0.5 shadow-sm hover:bg-white"
                        aria-label="Remove logo"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Aucun logo</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label>Photos</Label>
            <div className="mt-2 grid grid-cols-1 gap-3">
              <label
                htmlFor="photos-input"
                className="flex h-20 w-full cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-gray-200 bg-muted/40 text-sm transition hover:bg-muted"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <Camera className="h-5 w-5 text-gray-600" />
                  <span className="text-xs text-gray-700">
                    Click to add photos
                  </span>
                </div>
                <input
                  ref={inputRef}
                  id="photos-input"
                  className="hidden"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => onFiles(e.target.files)}
                />
              </label>

              {errors.photos && (
                <p className="text-xs text-red-600">{errors.photos}</p>
              )}

              <div className="flex items-center gap-2 overflow-x-auto py-2">
                {keptExistingCount === 0 && previews.length === 0 && (
                  <div className="text-xs text-gray-500">
                    No photos selected
                  </div>
                )}

                {existingPhotos.map((photo, index) => (
                  <div
                    key={photo.id ?? photo.url ?? `existing-${index}`}
                    className={cn(
                      "relative h-28 w-28 overflow-hidden rounded-md border bg-white",
                      photo.removed && "opacity-60"
                    )}
                  >
                    <img
                      src={photo.url}
                      alt={photo.url ?? `existing-${index}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => toggleExistingPhoto(photo.id)}
                      className={cn(
                        "absolute right-1 top-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm",
                        photo.removed
                          ? "bg-white/90 text-yellow-600"
                          : "bg-white/90 text-red-600"
                      )}
                    >
                      {photo.removed ? "Restore" : "Remove"}
                    </button>
                    {photo.removed && (
                      <div className="absolute inset-0 grid place-items-center bg-white/70 text-xs font-semibold text-gray-700 pointer-events-none">
                        Removed
                      </div>
                    )}
                  </div>
                ))}

                {previews.map((p, i) => (
                  <div
                    key={p}
                    className="relative h-28 w-28 overflow-hidden rounded-md border bg-white"
                  >
                    <img
                      src={p}
                      alt={`preview-${i}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute right-1 top-1 rounded-full bg-white/90 p-1 shadow-sm hover:bg-white"
                      aria-label="Remove photo"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                Supported: JPG, PNG. Max 5 MB per image.
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <Label>Variants</Label>
                <p className="text-xs text-muted-foreground">
                  Define price, stock, and sizing per variant.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full md:w-auto"
                onClick={addVariant}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add variant
              </Button>
            </div>

            {errors.variants && (
              <p className="text-xs text-red-600">{errors.variants}</p>
            )}

            <div className="space-y-4">
              {variantForms.map((variant, index) => (
                <div
                  key={variant.id}
                  className="space-y-4 rounded-lg border p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium">Nom de produit {variantForms.length > 1 ? index + 1 : ""}</p>
                    {variantForms.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeVariant(variant.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Remove
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`variant-costPrice-${variant.id}`}>
                        Prix d'achat
                      </Label>
                      <Input
                        id={`variant-costPrice-${variant.id}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="15,00"
                        value={variant.costPrice}
                        onChange={(e) => {
                          let val = e.target.value.replace(/[^0-9.,]/g, '');
                          val = val.replace('.', ',');
                          const parts = val.split(',');
                          if (parts.length > 2) val = parts[0] + ',' + parts.slice(1).join('');
                          updateVariantField(variant.id, "costPrice", val);
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`variant-price-${variant.id}`}>
                        Prix de vente
                      </Label>
                      <Input
                        id={`variant-price-${variant.id}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="19,99"
                        value={variant.price}
                        onChange={(e) => {
                          let val = e.target.value.replace(/[^0-9.,]/g, '');
                          val = val.replace('.', ',');
                          const parts = val.split(',');
                          if (parts.length > 2) val = parts[0] + ',' + parts.slice(1).join('');
                          updateVariantField(variant.id, "price", val);
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`variant-stock-${variant.id}`}>
                        Stock
                      </Label>
                      <Input
                        id={`variant-stock-${variant.id}`}
                        type="number"
                        min="0"
                        placeholder="120"
                        value={variant.stock}
                        onChange={(e) =>
                          updateVariantField(
                            variant.id,
                            "stock",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`variant-expiry-${variant.id}`}>
                        Expiry date
                      </Label>
                      <Input
                        id={`variant-expiry-${variant.id}`}
                        type="date"
                        value={variant.expiry}
                        onChange={(e) =>
                          updateVariantField(
                            variant.id,
                            "expiry",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`variant-size-${variant.id}`}>
                        Size value
                      </Label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          id={`variant-size-${variant.id}`}
                          type="number"
                          min="0"
                          placeholder="500"
                          value={variant.sizeValue}
                          onChange={(e) =>
                            updateVariantField(
                              variant.id,
                              "sizeValue",
                              e.target.value
                            )
                          }
                        />
                        <Select
                          value={variant.sizeUnit || "none"}
                          onValueChange={(value) =>
                            updateVariantField(
                              variant.id,
                              "sizeUnit",
                              value === "none" ? "" : (value as SizeUnit)
                            )
                          }
                        >
                          <SelectTrigger className="w-full sm:w-[160px]">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No unit</SelectItem>
                            {sizeUnitOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option.toUpperCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-md border px-4 py-3">
                      <div>
                        <Label className="text-sm">Active variant</Label>
                        <p className="text-xs text-muted-foreground">
                          Toggle availability for this variant.
                        </p>
                      </div>
                      <Switch
                        checked={variant.active}
                        onCheckedChange={(checked) =>
                          updateVariantField(
                            variant.id,
                            "active",
                            Boolean(checked)
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center justify-between w-full gap-3">
              <div>
                <Label htmlFor="best-seller" className="text-sm">
                  Mark as Best Seller
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Mark this product as a best seller on the storefront.
                </p>
              </div>
              <Switch
                id="best-seller"
                checked={bestSeller}
                onCheckedChange={(v) => setBestSeller(Boolean(v))}
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center justify-between w-full gap-3">
              <div>
                <Label htmlFor="inactive" className="text-sm">
                  Mark as inactive
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Don't show this product in the store.
                </p>
              </div>
              <Switch
                id="inactive"
                checked={inactive}
                onCheckedChange={(v) => setInactive(Boolean(v))}
              />
            </div>
          </div>

          <SheetFooter className="pt-4 px-0">
            <div className="flex gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  resetForm(initialProduct ?? null);
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!isFormValid || isUploading}
                aria-disabled={!isFormValid || isUploading}
              >
                {isUploading ? "Saving..." : submitLabel}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
