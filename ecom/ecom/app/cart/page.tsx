"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCartStore, selectCartTotals } from "@/hooks/useCartStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TUNISIAN_GOVERNORATES } from "../admin/orders/components/ManageOrderSheet";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AccountPageHeader } from "@/components/account-page-header";
import {
  AddressFormState,
  initialFormState,
  PaymentMethod,
  requiredFields,
} from "./types";
import { useCheckoutProfile } from "./hooks/useCheckoutProfile";
import { CheckoutError, usePlaceOrder } from "./hooks/usePlaceOrder";

const formatPrice = (value: number) => `${value.toFixed(2).replace('.', ',')} Dt`;

const CartPage = () => {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const totals = useMemo(() => selectCartTotals(items), [items]);

  const [form, setForm] = useState<AddressFormState>(initialFormState);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("cash_on_delivery");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [placedOrderInfo, setPlacedOrderInfo] = useState<{
    form: AddressFormState;
    items: typeof items;
    totals: ReturnType<typeof selectCartTotals>;
    paymentMethod: PaymentMethod;
    orderId?: string;
  } | null>(null);
  const profilePrefilled = useRef(false);
  const { data: profileData, isLoading: profileLoading } = useCheckoutProfile();
  const placeOrder = usePlaceOrder();

  const profile = profileData?.profile;
  const loadingProfile = profileLoading;
  const placingOrder = placeOrder.isPending;

  const addressComplete = requiredFields.every((field) => form[field].trim());
  const cartSubtitle = items.length
    ? `${items.length} article${items.length > 1 ? "s" : ""} prêt${
        items.length > 1 ? "s" : ""
      } à être commandé${items.length > 1 ? "s" : ""}.`
    : "Ajoutez vos coups de cœur et profitez de notre livraison rapide.";

  useEffect(() => {
    if (!profile || profilePrefilled.current) return;

    setForm((prev) => ({
      fullName: prev.fullName || profile.full_name || "",
      phone: prev.phone || profile.phone || "",
      address: prev.address || profile.address || "",
      city: prev.city || profile.city || "",
      postalCode: prev.postalCode || profile.postal_code || "",
    }));

    profilePrefilled.current = true;
  }, [profile]);

  useEffect(() => {
    if (!addressComplete && paymentMethod === "online") {
      setPaymentMethod("cash_on_delivery");
    }
  }, [addressComplete, paymentMethod]);

  const handleQuantityChange = (variantId: string, delta: number) => {
    const target = items.find((item) => item.id === variantId);
    if (!target) return;
    const next = Math.max(1, target.quantity + delta);
    updateQuantity(variantId, next);
  };

  const handleInputChange = (field: keyof AddressFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckout = async () => {
    setHasSubmitted(true);
    
    if (!items.length) {
      toast.error("Votre panier est vide");
      return;
    }

    if (!addressComplete) {
      toast.error("Merci de renseigner votre adresse complète");
      return;
    }

    try {
      const response = await placeOrder.mutateAsync({
        items,
        totals,
        paymentMethod,
        form,
      });

      // Save order info to display success page
      setPlacedOrderInfo({
        form,
        items: [...items], // copy to preserve after clear
        totals: { ...totals },
        paymentMethod,
        orderId: (response as any)?.id // if mutation returns the order ID
      });

      clearCart();
      toast.success("Commande passée avec succès !");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (error instanceof CheckoutError) {
        if (error.code === "AUTH_REQUIRED") {
          toast.error("Veuillez vous connecter pour confirmer la commande");
          router.push("/auth/login");
          return;
        }

        if (error.code === "EMPTY_CART") {
          toast.error("Votre panier est vide");
          return;
        }
      }

      console.error(error);
      toast.error("Impossible de finaliser votre commande");
    }
  };

  const renderContent = () => {
    if (placedOrderInfo) {
      return (
        <main className="mx-auto w-[85%] flex min-h-[60vh] flex-col gap-8 py-16 items-center">
          <div className="bg-white border rounded-2xl p-8 max-w-xl w-full shadow-sm text-sm">
            <div className="text-center mb-8 space-y-2">
              <h2 className="text-2xl font-bold">Thank you for your order</h2>
              <p className="text-gray-500">
                We have received your order and it is being processed.
              </p>
            </div>

            <div className="mb-8">
              <h3 className="font-semibold text-lg border-b pb-2 mb-4">
                Customer Information
              </h3>
              <div className="text-gray-600 space-y-1">
                <p>{placedOrderInfo.form.fullName}</p>
                <p>{placedOrderInfo.form.address}</p>
                <p>{placedOrderInfo.form.phone}</p>
                <p>{placedOrderInfo.form.city}</p>
                {placedOrderInfo.form.postalCode && (
                  <p>{placedOrderInfo.form.postalCode}</p>
                )}
              </div>
            </div>

            <div className="mb-8">
              <h3 className="font-semibold text-lg border-b pb-2 mb-4">
                Order Details
              </h3>
              <div className="space-y-4">
                {placedOrderInfo.items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden relative shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">🛍️</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold line-clamp-1">{item.title}</p>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Quantity : {item.quantity}</span>
                        <span>Unit price : {formatPrice(item.unitPrice)}</span>
                        <span>Total : {formatPrice(item.unitPrice * item.quantity)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span>{formatPrice(placedOrderInfo.totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Shipping</span>
                <span>0.00 DT</span>
              </div>
              <div className="flex justify-between text-red-600 font-bold text-lg pt-2">
                <span>Total</span>
                <span>{formatPrice(placedOrderInfo.totals.subtotal)}</span>
              </div>
            </div>

            <div className="mt-8">
              <Button asChild className="w-full bg-slate-800 text-white hover:bg-slate-900">
                <Link href="/">Return to the Home page</Link>
              </Button>
            </div>
          </div>
        </main>
      );
    }

    if (!items.length && !loadingProfile) {
      return (
        <main className="mx-auto w-[85%] flex min-h-[60vh] flex-col gap-8 py-16">
          <div className="bg-white border rounded-2xl p-10 text-center shadow-sm">
            <h2 className="text-2xl font-semibold mb-4">
              Votre panier est vide
            </h2>
            <p className="text-gray-600 mb-6">
              Parcourez nos produits et ajoutez vos articles préférés.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                asChild
                className="bg-yellow-600 text-white hover:bg-yellow-700"
              >
                <Link href="/products">Découvrir les produits</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/orders">Voir mes commandes</Link>
              </Button>
            </div>
          </div>
        </main>
      );
    }

    return (
      <main className="mx-auto w-[85%] flex min-h-screen flex-col gap-10 py-16">
        <div className="grid lg:grid-cols-[2fr,1fr] gap-8">
          <section className="space-y-6">
            <div className="bg-white border rounded-2xl p-6">
              <h1 className="text-2xl font-semibold mb-4">Votre panier</h1>
              <div className="divide-y">
                {items.map((item) => (
                  <div key={item.id} className="py-4 flex gap-4">
                    <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden relative flex-shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          🛍️
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-semibold line-clamp-2">
                            {item.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {item.sizeLabel}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-gray-400 hover:text-red-600"
                          aria-label="Supprimer l'article"
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.id, -1)}
                            className="w-8 h-8 border rounded-lg flex items-center justify-center"
                            aria-label="Diminuer la quantité"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-10 text-center font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.id, 1)}
                            className="w-8 h-8 border rounded-lg flex items-center justify-center"
                            aria-label="Augmenter la quantité"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <p className="font-semibold">
                          {formatPrice(item.unitPrice * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-between text-sm text-gray-600">
                <span>Total articles</span>
                <span>{totals.itemCount}</span>
              </div>
            </div>

            <div className="bg-white border rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-3">
                  Adresse de livraison
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Nom complet</Label>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(e) =>
                        handleInputChange("fullName", e.target.value)
                      }
                      className={hasSubmitted && !form.fullName.trim() ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      className={hasSubmitted && !form.phone.trim() ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={(e) =>
                        handleInputChange("address", e.target.value)
                      }
                      className={hasSubmitted && !form.address.trim() ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) =>
                        handleInputChange("city", e.target.value)
                      }
                      className={hasSubmitted && !form.city.trim() ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Gouvernorat</Label>
                    <Select
                      value={form.postalCode}
                      onValueChange={(val) => handleInputChange("postalCode", val)}
                    >
                      <SelectTrigger id="postalCode" className={`w-full ${hasSubmitted && !form.postalCode.trim() ? "border-red-500 focus:ring-red-500" : ""}`}>
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

              <div>
                <h2 className="text-xl font-semibold mb-3">Paiement</h2>
                <div className="space-y-3">
                  <label
                    className={`flex items-center justify-between border rounded-xl p-4 cursor-pointer transition ${
                      paymentMethod === "cash_on_delivery"
                        ? "border-yellow-500 bg-yellow-50"
                        : "hover:border-gray-300"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">Paiement à la livraison</p>
                      <p className="text-sm text-gray-500">
                        Réglez en espèces à la réception.
                      </p>
                    </div>
                    <input
                      type="radio"
                      className="w-4 h-4"
                      checked={paymentMethod === "cash_on_delivery"}
                      onChange={() => setPaymentMethod("cash_on_delivery")}
                    />
                  </label>

                  <label
                    className={`flex items-center justify-between cursor-not-allowed border rounded-xl p-4  transition ${
                      paymentMethod === "online"
                        ? "border-yellow-500 bg-yellow-50"
                        : "hover:border-gray-300"
                    } ${
                      !addressComplete ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    <div>
                      <p className="font-semibold">Paiement en ligne</p>
                      <p className="text-sm text-gray-500">
                        Disponible lorsque votre adresse est complète.
                      </p>
                    </div>
                    <input
                      type="radio"
                      className="w-4 h-4"
                      checked={paymentMethod === "online"}
                      onChange={() => setPaymentMethod("online")}
                      disabled={true}
                    />
                  </label>
                </div>
                {!addressComplete && (
                  <p className="text-xs text-amber-600 mt-2">
                    Complétez votre adresse pour activer le paiement en ligne.
                  </p>
                )}
              </div>
            </div>
          </section>

          <aside className="bg-white border rounded-2xl p-6 h-fit space-y-4">
            <h2 className="text-xl font-semibold">Récapitulatif</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Sous-total</span>
                <span>{formatPrice(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Livraison</span>
                <span>Calculée à l'expédition</span>
              </div>
            </div>
            <div className="flex justify-between text-lg font-semibold pt-2 border-t">
              <span>Total</span>
              <span>{formatPrice(totals.subtotal)}</span>
            </div>
            <Button
              className="w-full bg-yellow-600 text-white hover:bg-yellow-700"
              onClick={handleCheckout}
              disabled={placingOrder || items.length === 0}
            >
              {placingOrder ? "Validation en cours..." : "Placer la commande"}
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/orders">Voir mes commandes</Link>
            </Button>
          </aside>
        </div>
      </main>
    );
  };

  return (
    <>
      <AccountPageHeader
        title="Votre panier"
        subtitle={cartSubtitle}
        activePath="/cart"
        actions={[]}
      />
      {renderContent()}
    </>
  );
};

export default CartPage;
