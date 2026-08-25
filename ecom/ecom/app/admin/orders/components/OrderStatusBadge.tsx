import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "../types";

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  processing: "bg-indigo-100 text-indigo-800 border-indigo-200 font-semibold",
  shipped: "bg-emerald-100 text-emerald-800 border-emerald-200 font-bold",
  delivered: "bg-yellow-100 text-yellow-800 border-yellow-200",
  cancelled: "bg-rose-100 text-rose-800 border-rose-200",
  returned: "bg-gray-200 text-gray-700 border-gray-300",
};

const LABELS: Record<OrderStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  processing: "Téléchargé",
  shipped: "Emballé / Expédié",
  delivered: "Livré",
  cancelled: "Annulé",
  returned: "Retourné",
};

type OrderStatusBadgeProps = {
  status: OrderStatus;
  className?: string;
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-2", STATUS_STYLES[status], className)}
    >
      {LABELS[status]}
    </Badge>
  );
}
