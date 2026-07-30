"use client";

import React, { useEffect, useState } from "react";
import {
  PlusCircle,
  MinusCircle,
  MoreHorizontal,
  Trash2,
  Edit3,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import type { ProductWithRelations, VariantRow } from "../../types";
import { useIncreaseStock } from "../../hooks/useIncreaseStock";
import { useDecreaseStock } from "../../hooks/useDecreaseStock";
import { useUpdateVariant } from "../../hooks/useUpdateVariant"; // you'll need this
import { useDeleteProduct } from "../../hooks/useDeleteProduct";
import ProductUploadSheet from "../ProductUploadSheet";

/* loading utility */
const isMutationLoading = (m: any) =>
  typeof m?.isLoading === "boolean" ? m.isLoading : m?.status === "loading";

type Product = ProductWithRelations;
type Variant = VariantRow;
const DEFAULT_CURRENCY = "USD";

const formatCurrency = (value: number, currency: string = DEFAULT_CURRENCY) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);

const formatExpiry = (value?: string | null) => {
  if (!value) return "—";
  try {
    return format(new Date(value), "LLL d, yyyy");
  } catch {
    return value;
  }
};

export const ActionsCell = ({ product }: { product: Product }) => {
  const increaseMutation = useIncreaseStock();
  const decreaseMutation = useDecreaseStock();
  const updateVariantMutation = useUpdateVariant();
  const deleteMutation = useDeleteProduct();

  const addLoading = isMutationLoading(increaseMutation);
  const reduceLoading = isMutationLoading(decreaseMutation);
  const editVarLoading = isMutationLoading(updateVariantMutation);
  const delLoading = isMutationLoading(deleteMutation);

  const anyLoading =
    addLoading || reduceLoading || editVarLoading || delLoading;

  /* Dialog states */
  const [addOpen, setAddOpen] = useState(false);
  const [reduceOpen, setReduceOpen] = useState(false);
  const [editVarOpen, setEditVarOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  /* Variant selection shared logic */
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  /* Stock quantity inputs */
  const [qty, setQty] = useState<number | "">("");

  /* Edit variant fields */
  const [editPrice, setEditPrice] = useState<number | "">("");
  const [editExpiry, setEditExpiry] = useState<string>("");
  const [editCurrency, setEditCurrency] = useState<string>(DEFAULT_CURRENCY);

  const variants = (product.variants ?? []) as Variant[];

  useEffect(() => {
    setSelectedVariant(null);
  }, [product.id]);

  useEffect(() => {
    if (!addOpen && !reduceOpen) {
      setQty("");
    }
    if (!addOpen && !reduceOpen && !editVarOpen) {
      setSelectedVariant(null);
    }
  }, [addOpen, reduceOpen, editVarOpen]);

  useEffect(() => {
    if (
      (addOpen || reduceOpen || editVarOpen) &&
      !selectedVariant &&
      variants.length
    ) {
      setSelectedVariant(variants[0]?.id ?? null);
    }
  }, [addOpen, reduceOpen, editVarOpen, selectedVariant, variants]);

  useEffect(() => {
    if (!reduceOpen || !variants.length) return;
    const current = variants.find((v) => v.id === selectedVariant);
    if (current && (current.stock ?? 0) > 0) return;
    const fallback = variants.find((v) => (v.stock ?? 0) > 0) ?? null;
    setSelectedVariant(fallback ? fallback.id : null);
  }, [reduceOpen, selectedVariant, variants]);

  useEffect(() => {
    if (!editVarOpen) {
      setEditPrice("");
      setEditExpiry("");
      setEditCurrency(DEFAULT_CURRENCY);
      return;
    }
    const current = variants.find((v) => v.id === selectedVariant);
    if (current) {
      setEditPrice(current.price);
      setEditExpiry(current.expiry_date ?? "");
      setEditCurrency(current.currency ?? DEFAULT_CURRENCY);
    }
  }, [editVarOpen, selectedVariant, variants]);

  // Helper: simple variant selector list
  const VariantRadioList = ({
    value,
    onChange,
    disableZeroStock = false,
  }: {
    value: string | null;
    onChange: (id: string | null) => void;
    disableZeroStock?: boolean;
  }) => (
    <div className="flex flex-col gap-2 max-h-44 overflow-auto pr-1">
      {variants.length === 0 && (
        <div className="text-xs text-muted-foreground px-2">
          No variants available
        </div>
      )}
      {variants.map((v) => {
        const label =
          v.size_value != null && v.size_unit
            ? `${v.size_value} ${v.size_unit}`
            : "Nom de produit";
        const currency = v.currency ?? DEFAULT_CURRENCY;
        const priceLabel = formatCurrency(v.price ?? 0, currency);
        const soldOut = (v.stock ?? 0) === 0;
        const disabled = disableZeroStock && soldOut;
        return (
          <label
            key={v.id}
            className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50 ${
              disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            <input
              type="radio"
              name={`variant-select-${product.id}`}
              checked={value === v.id}
              onChange={() => (disabled ? null : onChange(v.id))}
              disabled={disabled}
            />
            <div className="ml-2">
              <div className="font-medium flex items-center gap-2">
                <span>{label}</span>
                {soldOut && !disableZeroStock && (
                  <span className="text-[10px] uppercase rounded bg-amber-100 text-amber-700 px-1 py-0.5">
                    Sold out
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {priceLabel} • Stock: {v.stock ?? 0}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Expiry: {formatExpiry(v.expiry_date)}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );

  /* --- Add stock --- */
  const submitAdd = async () => {
    const qtyNum = Number(qty);
    if (!selectedVariant || qtyNum <= 0) return;
    await increaseMutation.mutateAsync({ id: selectedVariant, delta: qtyNum });
    setAddOpen(false);
    setQty("");
    setSelectedVariant(null);
  };

  /* --- Reduce stock --- */
  const submitReduce = async () => {
    const qtyNum = Number(qty);
    if (!selectedVariant || qtyNum <= 0) return;
    await decreaseMutation.mutateAsync({
      id: selectedVariant,
      delta: qtyNum,
    });
    setReduceOpen(false);
    setQty("");
    setSelectedVariant(null);
  };

  /* --- Edit variant --- */
  const submitEditVariant = async () => {
    if (!selectedVariant) return;
    const normalizedCurrency = editCurrency.trim().toUpperCase();
    await updateVariantMutation.mutateAsync({
      id: selectedVariant,
      price: editPrice === "" ? undefined : Number(editPrice),
      expiry_date: editExpiry || null,
      currency: normalizedCurrency || undefined,
    });
    setEditVarOpen(false);
    setSelectedVariant(null);
  };

  /* --- Delete product --- */
  const confirmDelete = async () => {
    await deleteMutation.mutateAsync(product.id);
    setDelOpen(false);
  };

  return (
    <>
      <ProductUploadSheet
        hideTrigger
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        initialProduct={product}
      />
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              disabled={anyLoading}
            >
              <MoreHorizontal className="h-4 w-4 rotate-90" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 py-1">
            {/* --- Add Stock --- */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <button
                  className="w-full text-left px-2 py-2 hover:bg-muted/50 flex items-center gap-2"
                  disabled={anyLoading}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Stock
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Stock</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <VariantRadioList
                    value={selectedVariant}
                    onChange={setSelectedVariant}
                    disableZeroStock
                  />
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={String(qty)}
                      onChange={(e) =>
                        setQty(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      placeholder="e.g. 10"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setAddOpen(false)}
                    disabled={addLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={submitAdd}
                    disabled={addLoading || !qty || !selectedVariant}
                  >
                    {addLoading ? "Saving..." : "Add"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* --- Reduce Stock --- */}
            <Dialog open={reduceOpen} onOpenChange={setReduceOpen}>
              <DialogTrigger asChild>
                <button
                  className="w-full text-left px-2 py-2 hover:bg-muted/50 flex items-center gap-2"
                  disabled={anyLoading}
                >
                  <MinusCircle className="h-4 w-4 mr-2" />
                  Reduce Stock
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Reduce Stock</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <VariantRadioList
                    value={selectedVariant}
                    onChange={setSelectedVariant}
                  />
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={String(qty)}
                      onChange={(e) =>
                        setQty(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      placeholder="e.g. 5"
                      disabled={
                        !selectedVariant ||
                        variants.find((v) => v.id === selectedVariant)
                          ?.stock === 0
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setReduceOpen(false)}
                    disabled={reduceLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={submitReduce}
                    disabled={reduceLoading || !qty || !selectedVariant}
                  >
                    {reduceLoading ? "Saving..." : "Reduce"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Separator className="my-1" />

            {/* --- Edit Variant --- */}
            <Dialog open={editVarOpen} onOpenChange={setEditVarOpen}>
              <DialogTrigger asChild>
                <button
                  className="w-full text-left px-2 py-2 hover:bg-muted/50 flex items-center gap-2"
                  disabled={anyLoading}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Variant
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Variant</DialogTitle>
                </DialogHeader>

                <div className="grid gap-3 py-2">
                  <VariantRadioList
                    value={selectedVariant}
                    onChange={setSelectedVariant}
                  />

                  <div>
                    <Label>Price</Label>
                    <Input
                      type="number"
                      value={String(editPrice)}
                      onChange={(e) =>
                        setEditPrice(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      placeholder="e.g. 24.99"
                    />
                  </div>

                  <div>
                    <Label>Currency</Label>
                    <Input
                      value={editCurrency}
                      onChange={(e) => setEditCurrency(e.target.value)}
                      placeholder="USD"
                    />
                  </div>

                  <div>
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={editExpiry}
                      onChange={(e) => setEditExpiry(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setEditVarOpen(false)}
                    disabled={editVarLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={submitEditVariant}
                    disabled={editVarLoading || !selectedVariant}
                  >
                    {editVarLoading ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <button
              className="w-full text-left px-2 py-2 hover:bg-muted/50 flex items-center gap-2"
              disabled={anyLoading}
              onClick={() => setEditSheetOpen(true)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Product
            </button>

            <Separator className="my-1" />

            {/* --- Delete Product --- */}
            <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
              <AlertDialogTrigger asChild>
                <button
                  className="w-full text-left px-2 py-2 text-red-500 hover:bg-muted/50 flex items-center gap-2"
                  disabled={anyLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Product
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove product?</AlertDialogTitle>
                </AlertDialogHeader>
                <div className="py-2 text-sm text-muted-foreground">
                  This will mark the product as inactive and hide it from the
                  store.
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={delLoading}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmDelete}
                    disabled={delLoading}
                  >
                    {delLoading ? "Removing..." : "Remove"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
};
