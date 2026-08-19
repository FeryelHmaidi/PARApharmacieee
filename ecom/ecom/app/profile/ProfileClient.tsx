"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { TypedSupabaseClient } from "@/lib/supabase/types";
import type { Database } from "@/types/supabase";

const statusLabels: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  processing: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  returned: "Retournée",
};

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "TND",
  minimumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderWithItems = OrderRow & { order_items: OrderItemRow[] | null };

export type ProfileClientProps = {
  userId: string;
  userEmail: string | null;
  initialProfile: ProfileRow | null;
  initialOrders: OrderWithItems[];
};

type ProfileFormState = {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
};

type FeedbackState = { type: "success" | "error"; message: string } | null;

const openStatuses = new Set(["pending", "confirmed", "processing", "shipped"]);

const normalizeField = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export default function ProfileClient({
  userId,
  userEmail,
  initialProfile,
  initialOrders,
}: ProfileClientProps) {
  const supabase = useMemo(
    () => createClient() as unknown as TypedSupabaseClient,
    []
  );

  const [formValues, setFormValues] = useState<ProfileFormState>({
    full_name: initialProfile?.full_name ?? "",
    email: initialProfile?.email ?? userEmail ?? "",
    phone: initialProfile?.phone ?? "",
    address: initialProfile?.address ?? "",
    city: initialProfile?.city ?? "",
    postal_code: initialProfile?.postal_code ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const orders = initialOrders ?? [];

  const stats = {
    totalOrders: orders.length,
    totalSpent: orders.reduce(
      (sum, order) => sum + (order.total_amount ?? 0),
      0
    ),
    openOrders: orders.filter((order) => openStatuses.has(order.status ?? ""))
      .length,
    lastOrderDate: orders[0]?.created_at ?? null,
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const payload = {
        id: userId,
        full_name: normalizeField(formValues.full_name),
        email: normalizeField(formValues.email) ?? userEmail,
        phone: normalizeField(formValues.phone),
        address: normalizeField(formValues.address),
        city: normalizeField(formValues.city),
        postal_code: normalizeField(formValues.postal_code),
        updated_at: new Date().toISOString(),
      } satisfies Partial<ProfileRow> & { id: string };

      const { error } = await supabase.from("profiles").upsert(payload as any);

      if (error) {
        throw error;
      }

      setFeedback({
        type: "success",
        message: "Profil mis à jour avec succès.",
      });
    } catch (error) {
      console.error("Failed to update profile", error);
      setFeedback({
        type: "error",
        message:
          "Impossible de mettre à jour votre profil. Veuillez réessayer.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto w-[90%] max-w-6xl py-12 space-y-10">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>
              Actualisez vos coordonnées pour accélérer vos futures commandes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nom complet</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    placeholder="Votre nom"
                    value={formValues.full_name}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="vous@example.com"
                    value={formValues.email}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="(+216) 00 000 000"
                    value={formValues.phone}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Code postal</Label>
                  <Input
                    id="postal_code"
                    name="postal_code"
                    placeholder="1000"
                    value={formValues.postal_code}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="Rue, étage, bâtiment"
                    value={formValues.address}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder="Tunis"
                    value={formValues.city}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {feedback && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    feedback.type === "success"
                      ? "border-yellow-200 bg-yellow-50 text-yellow-800"
                      : "border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  {feedback.message}
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Résumé du compte</CardTitle>
            <CardDescription>Gardez un œil sur vos activités.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Commandes totales</p>
              <p className="text-2xl font-semibold">{stats.totalOrders}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Montant cumulé</p>
              <p className="text-2xl font-semibold">
                {currencyFormatter.format(stats.totalSpent)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Commandes actives</p>
              <p className="text-2xl font-semibold">{stats.openOrders}</p>
            </div>
            {stats.lastOrderDate && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Dernière commande
                </p>
                <p className="text-base font-medium">
                  {dateFormatter.format(new Date(stats.lastOrderDate))}
                </p>
              </div>
            )}
            <Button asChild variant="outline" className="w-full">
              <Link href="/orders">Suivre mes commandes</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Commandes récentes</h2>
            <p className="text-muted-foreground">
              Dernières activités liées à votre compte.
            </p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/orders">Tout l'historique</Link>
          </Button>
        </div>

        {orders.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="py-10 text-center text-muted-foreground">
              Aucune commande récente. Découvrez nos nouveautés.
              <div className="mt-4">
                <Button asChild>
                  <Link href="/products">Voir les produits</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.slice(0, 5).map((order) => {
              const statusKey = order.status ?? "pending";
              const statusLabel = statusLabels[statusKey] ?? "En attente";
              const totalDisplay = currencyFormatter.format(
                order.total_amount ?? 0
              );
              const shippingCity =
                order.shipping_city || "Ville non renseignée";
              const shippingPhone = order.shipping_phone || "Téléphone inconnu";

              return (
                <Card key={order.id} className="rounded-2xl">
                  <CardContent className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Commande #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-lg font-semibold">
                        {order.created_at
                          ? dateFormatter.format(new Date(order.created_at))
                          : "Date inconnue"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {shippingCity} · {shippingPhone}
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <Badge
                        variant={
                          statusKey === "delivered" ? "secondary" : "outline"
                        }
                      >
                        {statusLabel}
                      </Badge>
                      <p className="text-xl font-semibold">{totalDisplay}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
