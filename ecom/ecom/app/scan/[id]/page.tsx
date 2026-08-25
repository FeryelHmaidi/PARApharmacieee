"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, PackageCheck, AlertTriangle, Lock, ArrowLeft, Loader2, Sparkles, Building2, User, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

export default function ScanOrderPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchOrder = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/scan/${orderId}`);
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
      } else {
        toast.error(data.message || "Commande introuvable");
      }
    } catch (e: any) {
      toast.error("Erreur de connexion au serveur");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const handleConfirmPacking = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/scan/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || "Commande emballée et stock mis à jour !");
        setStatusMessage(data.message);
        setOrder((prev: any) => ({ ...prev, status: "shipped" }));
      } else {
        toast.error(data.message || "Erreur lors de la validation");
      }
    } catch (e: any) {
      toast.error("Erreur réseau: " + e.message);
    }
    setIsUpdating(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-yellow-600 mb-4" />
        <p className="text-gray-600 font-medium">Chargement des dÃ©tails de la commande...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-sm border text-center max-w-md w-full">
          <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Commande Introuvable</h2>
          <p className="text-sm text-gray-500 mb-6">Le code QR scannÃ© ne correspond Ã  aucune commande active.</p>
          <Link href="/admin/orders">
            <Button className="w-full">Retour aux commandes</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isPackedOrShipped = ["shipped", "delivered"].includes(order.status);
  const isDownloaded = order.status === "processing" || (order.delivery_company && order.status !== "pending");
  const shortId = order.id.split("-")[0].toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-start">
      <div className="max-w-lg w-full space-y-6">
        {/* Header navigation */}
        <div className="flex items-center justify-between">
          <Link href="/admin/orders" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium">
            <ArrowLeft className="h-4 w-4" /> Admin Commandes
          </Link>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
            NÂ° {shortId}
          </span>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden">
          {/* Status banner */}
          {isPackedOrShipped ? (
            <div className="bg-emerald-50 border-b border-emerald-100 p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-emerald-900 text-sm">Commande EmballÃ©e & VerrouillÃ©e</h3>
                <p className="text-xs text-emerald-700">Le stock a Ã©tÃ© dÃ©crÃ©mentÃ©. La commande ne peut plus Ãªtre modifiÃ©e.</p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border-b border-amber-100 p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <PackageCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900 text-sm">PrÃªt pour Emballage</h3>
                <p className="text-xs text-amber-700">Statut actuel: TÃ©lÃ©chargÃ©. Confirmez l'emballage pour dÃ©duire le stock.</p>
              </div>
            </div>
          )}

          {/* Body Content */}
          <div className="p-6 space-y-5">
            {/* Customer info */}
            <div className="rounded-xl bg-slate-50 p-3.5 space-y-2 text-sm border border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <User className="h-4 w-4 text-slate-500" />
                {order.guest_info?.full_name || "Client"}
              </div>
              <div className="flex items-center gap-2 text-slate-600 text-xs">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                {order.shipping_phone || "Pas de numÃ©ro"}
              </div>
              <div className="flex items-center gap-2 text-slate-600 text-xs">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {order.shipping_address}, {order.shipping_city}
              </div>
              {order.delivery_company && (
                <div className="flex items-center gap-2 text-blue-700 text-xs font-medium pt-1 border-t border-slate-200">
                  <Building2 className="h-3.5 w-3.5 text-blue-500" />
                  Transporteur : <span className="font-bold">{order.delivery_company}</span>
                </div>
              )}
            </div>

            {/* Articles list */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Articles Ã  emballer ({(order.order_items || []).length})
              </h4>
              <div className="divide-y divide-slate-100 border rounded-xl overflow-hidden">
                {(order.order_items || []).map((item: any) => (
                  <div key={item.id} className="p-3 bg-white flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {item.product?.name || "Produit"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.variant?.size_value ? `${item.variant.size_value} ${item.variant.size_unit || ""}` : "Standard"} 
                        {item.variant?.stock !== undefined && ` • Stock actuel: ${item.variant.stock}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="inline-flex items-center justify-center bg-yellow-100 text-yellow-900 font-extrabold text-xs px-2.5 py-1 rounded-md">
                        x{item.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Amount */}
            <div className="flex items-center justify-between pt-2 border-t text-sm font-semibold">
              <span className="text-slate-600">Montant Total Ã  encaisser :</span>
              <span className="text-base text-slate-900 font-extrabold">
                {Number(order.total_amount || 0).toFixed(2)} DT
              </span>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              {isPackedOrShipped ? (
                <Button disabled className="w-full bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" /> Colis DÃ©jÃ  EmballÃ© & VerrouillÃ©
                </Button>
              ) : (
                <Button
                  onClick={handleConfirmPacking}
                  disabled={isUpdating}
                  size="lg"
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold shadow-md shadow-yellow-600/20 py-6 text-base rounded-xl transition-all"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Validation et dÃ©duction du stock...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Valider Emballage & DÃ©duire Stock
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}