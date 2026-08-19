"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Trash2 } from "lucide-react";
import { Constants } from "@/types/supabase";
import type {
  AdminOrder,
  OrderFormValues,
  OrderGuestInfo,
  OrderStatus,
} from "../types";
import { useUpsertOrder } from "../hooks/useOrderMutations";
import { useFetchProducts } from "../../inventory/hooks/useFetchProducts";
import type { VariantRow } from "../../inventory/types";

const buildVariantLabel = (variant?: VariantRow | null) => {
  if (!variant) return "Standard";
  const parts: string[] = [];
  if (variant.size_value && variant.size_unit) {
    parts.push(`${variant.size_value}${variant.size_unit}`);
  } else if (variant.size_unit) {
    parts.push(variant.size_unit);
  }
  if (variant.expiry_date) {
    const date = new Date(variant.expiry_date);
    if (!Number.isNaN(date.getTime())) {
      parts.push(
        `DLUO ${date.toLocaleDateString("fr-FR", {
          month: "short",
          year: "numeric",
        })}`
      );
    }
  }
  return parts.length ? parts.join(" • ") : "Standard";
};

const fallbackProductName = (productId?: string | null, index?: number) => {
  if (productId) {
    return `Produit ${productId.slice(0, 6)}`;
  }
  return index !== undefined ? `Article ${index + 1}` : "Article";
};

const STATUS_OPTIONS = Constants.public.Enums.order_status;
const PAYMENT_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "awaiting_payment", label: "Awaiting payment" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "cod", label: "Cash on delivery" },
  { value: "online", label: "Online payment" },
];

export const TUNISIAN_GOVERNORATES = [
  "Ariana",
  "Béja",
  "Ben Arous",
  "Bizerte",
  "Gabès",
  "Gafsa",
  "Jendouba",
  "Kairouan",
  "Kasserine",
  "Kébili",
  "Le Kef",
  "Mahdia",
  "La Manouba",
  "Médenine",
  "Monastir",
  "Nabeul",
  "Sfax",
  "Sidi Bouzid",
  "Siliana",
  "Sousse",
  "Tataouine",
  "Tozeur",
  "Tunis",
  "Zaghouan",
];


const CURRENCY_OPTIONS = ["TND", "USD", "EUR"];

const buildInitialValues = (order?: AdminOrder | null): OrderFormValues => {
  const guestInfo = (order?.guest_info as OrderGuestInfo | null) ?? null;
  const rawItems = order?.order_items ?? [];
  const mappedItems = rawItems.map((item, index) => ({
    id: item.id ?? `${order?.id ?? "manual"}-${index}`,
    productId: item.product_id ?? "",
    variantId: item.variant_id,
    productName: fallbackProductName(item.product_id, index),
    variantLabel: item.variant_id ?? "Variante",
    unitPrice: item.price_at_purchase ?? 0,
    quantity: item.quantity ?? 1,
  }));
  const computedTotal = mappedItems.reduce(
    (sum, line) =>
      sum + Math.max(0, line.unitPrice) * Math.max(0, line.quantity),
    0
  );

  return {
    id: order?.id,
    userId: order?.user_id ?? null,
    customerName:
      guestInfo?.full_name ??
      order?.customer_profile?.full_name ??
      "Guest customer",
    phone: order?.shipping_phone ?? "",
    address: order?.shipping_address ?? "",
    city: order?.shipping_city ?? "",
    postalCode: guestInfo?.postal_code ?? "",
    status: (order?.status as OrderStatus) ?? "pending",
    paymentStatus: order?.payment_status ?? "pending",
    paymentMethod: order?.payment_method ?? "cod",
    totalAmount: order?.total_amount ?? computedTotal,
    currency: order?.currency ?? "TND",
    deliveryCompany: order?.delivery_company ?? "",
    notes: order?.notes ?? guestInfo?.notes ?? "",
    items: mappedItems,
  };
};

type ManageOrderSheetProps = {
  trigger?: React.ReactNode;
  order?: AdminOrder | null;
  onSuccess?: () => void;
};

export function ManageOrderSheet({
  trigger,
  order,
  onSuccess,
}: ManageOrderSheetProps) {
  const [open, setOpen] = useState(false);
  const upsertOrder = useUpsertOrder();
  const [deliveryCompanies, setDeliveryCompanies] = useState<{id: string, name: string}[]>([]);
  const [form, setForm] = useState<OrderFormValues>(() =>
    buildInitialValues(order)
  );

  useEffect(() => {
    if (open) {
      setForm(buildInitialValues(order));
      setProductQuery("");
    }
  }, [open, order]);

  useEffect(() => {
    const fetchCompanies = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase.from("delivery_companies").select("*").order("name");
      if (data) setDeliveryCompanies(data);
    };
    fetchCompanies();
  }, []);

  const [productQuery, setProductQuery] = useState("");
  const {
    data: products = [],
    isLoading: productsLoading,
    isError: productsError,
  } = useFetchProducts();

  useEffect(() => {
    if (open) {
      setForm(buildInitialValues(order));
      setProductQuery("");
    }
  }, [open, order]);

  useEffect(() => {
    setForm((prev) => {
      if (prev.status !== "delivered" || prev.paymentStatus === "paid") {
        return prev;
      }
      return { ...prev, paymentStatus: "paid" };
    });
  }, [form.status]);

  const variantOptions = useMemo(() => {
    return products.flatMap((product) => {
      const variants = product.variants ?? [];
      return variants.map((variant) => ({
        id: variant.id,
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        label: buildVariantLabel(variant),
        price: variant.price ?? 0,
        stock: variant.stock ?? 0,
        currency: variant.currency ?? product.currency ?? "TND",
      }));
    });
  }, [products]);

  const filteredVariants = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    if (!query) {
      return variantOptions.slice(0, 8);
    }
    return variantOptions
      .filter(
        (variant) =>
          variant.productName.toLowerCase().includes(query) ||
          variant.label.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [productQuery, variantOptions]);

  const itemsSubtotal = useMemo(() => {
    return (form.items ?? []).reduce(
      (sum, item) =>
        sum + Math.max(0, item.unitPrice) * Math.max(0, item.quantity),
      0
    );
  }, [form.items]);

  useEffect(() => {
    setForm((prev) => {
      const normalizedTotal = Number(itemsSubtotal.toFixed(3));
      if (prev.totalAmount === normalizedTotal) {
        return prev;
      }
      return { ...prev, totalAmount: normalizedTotal };
    });
  }, [itemsSubtotal]);

  useEffect(() => {
    if (!products.length || !form.items.length) return;
    setForm((prev) => {
      let changed = false;
      const nextItems = prev.items.map((item) => {
        const product = products.find((record) => record.id === item.productId);
        if (!product) return item;
        const variant = product.variants?.find((v) => v.id === item.variantId);
        const nextName = product.name ?? item.productName;
        const nextVariantLabel = variant
          ? buildVariantLabel(variant)
          : item.variantLabel;
        if (
          nextName === item.productName &&
          nextVariantLabel === item.variantLabel
        ) {
          return item;
        }
        changed = true;
        return {
          ...item,
          productName: nextName,
          variantLabel: nextVariantLabel,
        };
      });
      return changed ? { ...prev, items: nextItems } : prev;
    });
  }, [products, form.items]);

  const currencyFormatter = useMemo(() => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: form.currency ?? "TND",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [form.currency]);

  const formatCurrency = useCallback(
    (value: number) => currencyFormatter.format(value || 0),
    [currencyFormatter]
  );

  const handleAddItem = useCallback(
    (variant: (typeof filteredVariants)[number]) => {
      setForm((prev) => {
        const existingIndex = prev.items.findIndex(
          (item) => item.variantId === variant.variantId
        );

        if (existingIndex >= 0) {
          const nextItems = prev.items.map((item, index) =>
            index === existingIndex
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
          return { ...prev, items: nextItems };
        }

        const newItem = {
          id: crypto.randomUUID?.() ?? `${variant.id}-${Date.now()}`,
          productId: variant.productId,
          variantId: variant.variantId,
          productName: variant.productName,
          variantLabel: variant.label,
          unitPrice: variant.price ?? 0,
          quantity: 1,
        } satisfies OrderFormValues["items"][number];

        const shouldAdoptCurrency =
          prev.items.length === 0 &&
          variant.currency &&
          variant.currency !== prev.currency;

        return {
          ...prev,
          currency: shouldAdoptCurrency
            ? (variant.currency as OrderFormValues["currency"])
            : prev.currency,
          items: [...prev.items, newItem],
        };
      });
    },
    [filteredVariants]
  );

  const handleItemQuantityChange = useCallback(
    (itemId: string, quantity: number) => {
      setForm((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: Number.isFinite(quantity)
                  ? Math.max(1, Math.floor(quantity))
                  : 1,
              }
            : item
        ),
      }));
    },
    []
  );

  const handleItemPriceChange = useCallback((itemId: string, price: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              unitPrice: Number.isFinite(price) ? Math.max(0, price) : 0,
            }
          : item
      ),
    }));
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  }, []);

  const mode = order ? "edit" : "create";
  const title = mode === "edit" ? "Edit order" : "Create manual order";
  const description =
    mode === "edit"
      ? "Update customer details, totals, and status for this order."
      : "Capture a manual order for phone or in-store sales.";

  const disabled = upsertOrder.isPending;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (!form.items.length) {
      toast.error("Add at least one product to the order");
      return;
    }

    const submission = { ...form, totalAmount: itemsSubtotal };

    try {
      await upsertOrder.mutateAsync(submission);
      toast.success(mode === "edit" ? "Order updated" : "Order created");
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save order"
      );
    }
  };

  const handleChange = <K extends keyof OrderFormValues>(
    key: K,
    value: OrderFormValues[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader className="text-left">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 flex flex-col gap-6 p-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="customerName">Customer name</Label>
                <Input
                  id="customerName"
                  value={form.customerName}
                  onChange={(event) =>
                    handleChange("customerName", event.target.value)
                  }
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(event) =>
                      handleChange("phone", event.target.value)
                    }
                    placeholder="+216 55 000 000"
                  />
                </div>
                <div>
                  <Label htmlFor="userId">User ID (optional)</Label>
                  <Input
                    id="userId"
                    value={form.userId ?? ""}
                    onChange={(event) =>
                      handleChange(
                        "userId",
                        event.target.value.trim() ? event.target.value : null
                      )
                    }
                    placeholder="uuid"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(event) =>
                    handleChange("address", event.target.value)
                  }
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(event) =>
                      handleChange("city", event.target.value)
                    }
                    placeholder="Tunis"
                  />
                </div>
                <div>
                  <Label htmlFor="governorate">Gouvernorat</Label>
                  <Select
                    value={form.postalCode}
                    onValueChange={(val) => handleChange("postalCode", val)}
                  >
                    <SelectTrigger id="governorate" className="w-full">
                      <SelectValue placeholder="Choisir un gouvernorat" />
                    </SelectTrigger>
                    <SelectContent>
                      {TUNISIAN_GOVERNORATES.map((gov) => (
                        <SelectItem key={gov} value={gov}>
                          {gov}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border bg-muted/10 p-4">
              <div>
                <p className="font-semibold">Product catalog</p>
                <p className="text-sm text-muted-foreground">
                  Search your inventory and add products to this order.
                </p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={productQuery}
                  onChange={(event) => setProductQuery(event.target.value)}
                  placeholder="Name, reference, size…"
                  className="pl-10"
                />
              </div>
              {productsError ? (
                <p className="text-sm text-destructive">
                  Unable to load products. Please refresh to try again.
                </p>
              ) : (
                <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                  {productsLoading ? (
                    <p className="text-sm text-muted-foreground">
                      Loading catalog…
                    </p>
                  ) : filteredVariants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No products match your search.
                    </p>
                  ) : (
                    filteredVariants.map((variant) => (
                      <div
                        key={variant.id}
                        className="flex items-center justify-between gap-3 rounded-xl border bg-white/80 p-3 shadow-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium leading-tight line-clamp-1">
                            {variant.productName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {variant.label} • {variant.stock} in stock
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold">
                            {formatCurrency(variant.price)}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAddItem(variant)}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">Order items</p>
                  <p className="text-sm text-muted-foreground">
                    Adjust quantities or remove products before saving.
                  </p>
                </div>
                <div className="text-lg font-semibold">
                  {formatCurrency(itemsSubtotal)}
                </div>
              </div>
              {form.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No items selected yet. Add a product from the catalog above.
                </p>
              ) : (
                <div className="space-y-3">
                  {form.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border bg-muted/10 p-3"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium leading-tight line-clamp-1">
                            {item.productName}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {item.variantLabel ?? "Standard"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                          <div className="w-28">
                            <Label className="text-xs text-muted-foreground">
                              Price
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice.toString()}
                              onChange={(event) =>
                                handleItemPriceChange(
                                  item.id,
                                  Number(event.target.value)
                                )
                              }
                            />
                          </div>
                          <div className="w-24">
                            <Label className="text-xs text-muted-foreground">
                              Qty
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={(event) =>
                                handleItemQuantityChange(
                                  item.id,
                                  Number(event.target.value)
                                )
                              }
                            />
                          </div>
                          <div className="w-24 text-right text-sm font-semibold">
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Remove item"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="size-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    handleChange("status", value as OrderStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Société de livraison</Label>
                <Select
                  value={form.deliveryCompany || "none"}
                  onValueChange={(value) =>
                    handleChange("deliveryCompany", value === "none" ? null : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {deliveryCompanies.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={4}
                value={form.notes ?? ""}
                onChange={(event) => handleChange("notes", event.target.value)}
                placeholder="Add delivery notes, instructions, etc."
              />
            </div>
          </div>

          <SheetFooter className="mt-8 gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={disabled}
            >
              Close
            </Button>
            <Button type="submit" disabled={disabled}>
              {disabled
                ? "Saving..."
                : mode === "edit"
                ? "Save changes"
                : "Create order"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
