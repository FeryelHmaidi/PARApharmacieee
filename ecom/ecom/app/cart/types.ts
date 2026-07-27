import type { CartItem, CartTotals } from "@/hooks/useCartStore";

export type PaymentMethod = "cash_on_delivery" | "online";

export const requiredFields = [
  "fullName",
  "phone",
  "address",
  "city",
  "postalCode",
] as const;

export type AddressFormState = Record<(typeof requiredFields)[number], string>;

export const initialFormState: AddressFormState = {
  fullName: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
};

export type CheckoutPayload = {
  items: CartItem[];
  totals: CartTotals;
  paymentMethod: PaymentMethod;
  form: AddressFormState;
};
