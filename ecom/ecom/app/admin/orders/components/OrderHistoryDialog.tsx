"use client";

import { useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge } from "./OrderStatusBadge";
import {
  useOrderHistory,
  formatStatusName,
  type OrderHistoryItem,
} from "../hooks/useOrderHistory";
import type { AdminOrder, OrderStatus } from "../types";
import {
  CheckCircle2,
  Clock,
  FileEdit,
  History,
  Package,
  RefreshCcw,
  RotateCcw,
  Truck,
  XCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";

type OrderHistoryDialogProps = {
  order: AdminOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const getActionStyle = (item: OrderHistoryItem) => {
  const action = item.action.toUpperCase();
  const newStatus = (item.new_status || "").toLowerCase();

  if (action === "RETOUR_RECU" || newStatus === "retour_recu") {
    return {
      icon: RotateCcw,
      iconColor: "text-purple-600",
      bgLight: "bg-purple-50",
      borderColor: "border-purple-200",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
      badgeText: "Retour Reçu ✅",
    };
  }

  if (newStatus === "delivered" || action === "LIVRAISON") {
    return {
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      bgLight: "bg-emerald-50",
      borderColor: "border-emerald-200",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      badgeText: "Livré",
    };
  }

  if (newStatus === "cancelled" || action === "ANNULATION") {
    return {
      icon: XCircle,
      iconColor: "text-rose-600",
      bgLight: "bg-rose-50",
      borderColor: "border-rose-200",
      badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
      badgeText: "Annulé",
    };
  }

  if (newStatus === "shipped" || action === "SHIPPED") {
    return {
      icon: Package,
      iconColor: "text-teal-600",
      bgLight: "bg-teal-50",
      borderColor: "border-teal-200",
      badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
      badgeText: "Emballé / Expédié",
    };
  }

  if (action === "TRACKING_UPDATE" || newStatus === "processing") {
    return {
      icon: Truck,
      iconColor: "text-blue-600",
      bgLight: "bg-blue-50",
      borderColor: "border-blue-200",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
      badgeText: "Livraison",
    };
  }

  if (newStatus === "confirmed") {
    return {
      icon: CheckCircle2,
      iconColor: "text-blue-600",
      bgLight: "bg-blue-50",
      borderColor: "border-blue-200",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
      badgeText: "Confirmé",
    };
  }

  if (action === "CREATION") {
    return {
      icon: Sparkles,
      iconColor: "text-amber-600",
      bgLight: "bg-amber-50",
      borderColor: "border-amber-200",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
      badgeText: "Création",
    };
  }

  return {
    icon: FileEdit,
    iconColor: "text-slate-600",
    bgLight: "bg-slate-50",
    borderColor: "border-slate-200",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
    badgeText: "Modification",
  };
};

export function OrderHistoryDialog({
  order,
  open,
  onOpenChange,
}: OrderHistoryDialogProps) {
  const { data: history = [], isLoading, refetch, isFetching } = useOrderHistory(order);

  const customerName = useMemo(() => {
    if (!order) return "Client";
    return (
      order.customer_profile?.full_name ||
      (order.guest_info as { full_name?: string } | null)?.full_name ||
      "Client"
    );
  }, [order]);

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-yellow-600" />
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Historique de la commande #{order.id.slice(0, 8)}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <span>Client : <strong className="text-slate-700">{customerName}</strong></span>
                <span>•</span>
                <span>Tél : <strong className="text-slate-700">{order.shipping_phone || "—"}</strong></span>
                <span>•</span>
                <span>Total : <strong className="text-slate-700">{(order.total_amount ?? 0).toFixed(3)} {order.currency ?? "TND"}</strong></span>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <OrderStatusBadge status={(order.status as OrderStatus) ?? "pending"} />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => refetch()}
                disabled={isFetching}
                title="Actualiser l'historique"
              >
                <RefreshCcw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              Aucun événement historique trouvé pour cette commande.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {history.map((item, index) => {
                const style = getActionStyle(item);
                const IconComponent = style.icon;
                const dateObj = new Date(item.created_at);
                const isValidDate = !isNaN(dateObj.getTime());
                const formattedDate = isValidDate
                  ? format(dateObj, "dd MMMM yyyy 'à' HH:mm", { locale: fr })
                  : "Date inconnue";
                const relativeTime = isValidDate
                  ? formatDistanceToNow(dateObj, { addSuffix: true, locale: fr })
                  : "";

                return (
                  <div key={item.id || index} className="relative group">
                    {/* Dot Icon */}
                    <div
                      className={`absolute -left-6 top-1 h-5 w-5 rounded-full border-2 bg-white flex items-center justify-center ${style.borderColor} ring-4 ring-white shadow-xs`}
                    >
                      <IconComponent className={`h-2.5 w-2.5 ${style.iconColor}`} />
                    </div>

                    {/* Card */}
                    <div
                      className={`rounded-xl border p-3.5 transition hover:shadow-xs ${style.bgLight} ${style.borderColor}`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900">
                            {item.action === "RETOUR_RECU"
                              ? "Colis Retour Réceptionné ✅"
                              : item.action === "STATUT_CHANGE"
                              ? `Changement de statut : ${formatStatusName(item.new_status)}`
                              : item.action === "TRACKING_UPDATE"
                              ? "N° de suivi mis à jour"
                              : item.action === "ANNULATION"
                              ? "Annulation de la commande"
                              : item.action === "CREATION"
                              ? "Création de la commande"
                              : "Modification de la commande"}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 font-medium ${style.badgeColor}`}
                          >
                            {style.badgeText}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground whitespace-nowrap">
                          <Clock className="h-3 w-3" />
                          <span title={formattedDate}>{relativeTime}</span>
                          <span className="text-slate-400">•</span>
                          <span>{isValidDate ? format(dateObj, "dd/MM/yyyy HH:mm") : ""}</span>
                        </div>
                      </div>

                      {item.details && (
                        <p className="text-xs text-slate-700 leading-relaxed mt-1">
                          {item.details}
                        </p>
                      )}

                      {item.old_status && item.new_status && (
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-600 bg-white/70 px-2 py-1 rounded-md border border-slate-200/60 w-fit">
                          <span>De : <strong>{formatStatusName(item.old_status)}</strong></span>
                          <span>➔</span>
                          <span>Vers : <strong>{formatStatusName(item.new_status)}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t pt-3 flex justify-between items-center text-xs text-muted-foreground">
          <span>{history.length} événement(s) au total</span>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
