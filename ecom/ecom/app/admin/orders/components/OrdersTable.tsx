"use client";

import { useMemo, useState, useEffect } from "react";
import { format, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ManageOrderSheet } from "./ManageOrderSheet";
import { OrderStatusBadge } from "./OrderStatusBadge";
import {
  useCancelOrder,
  useUpdateOrderStatus,
} from "../hooks/useOrderMutations";
import type { AdminOrder, OrderStatus } from "../types";
import { Constants } from "@/types/supabase";
import {
  Download,
  Loader2,
  MoreHorizontal,
  RefreshCcw,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Truck,
  Package,
} from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const STATUS_OPTIONS = [
  "all",
  ...Constants.public.Enums.order_status,
  "tentative",
] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number];

type SortKey =
  | "date"
  | "customer"
  | "articles"
  | "total"
  | "delivery"
  | "payment"
  | "status";

type OrdersTableProps = {
  orders?: AdminOrder[] | null;
  isLoading: boolean;
  isFetching: boolean;
  error?: Error | null;
  refetch: () => Promise<any> | void;
};

const EMPTY_STATES: Record<StatusFilter, string> = {
  all: "Aucune commande trouvée pour le moment.",
  pending: "Aucune commande en attente actuellement.",
  tentative: "Aucune tentative d'appel en cours.",
  confirmed: "Aucune commande confirmée actuellement.",
  processing: "Aucune commande en cours de traitement.",
  shipped: "Aucune commande expédiée.",
  delivered: "Aucune commande livrée.",
  cancelled: "Aucune commande annulée.",
  returned: "Aucune commande retournée.",
};

const getEffectiveStatus = (order: AdminOrder): OrderStatus => {
  if (order.status === "pending" && order.notes?.includes("[TENTATIVE")) {
    return "tentative";
  }
  return (order.status as OrderStatus) ?? "pending";
};

export function OrdersTable({
  orders,
  isLoading,
  isFetching,
  error,
  refetch,
}: OrdersTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deliveryCompanyFilter, setDeliveryCompanyFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [deliveryCompanies, setDeliveryCompanies] = useState<
    { id: string; name: string }[]
  >([]);

  const [orderToCancel, setOrderToCancel] = useState<AdminOrder | null>(null);
  const [orderToConfirm, setOrderToConfirm] = useState<{
    order: AdminOrder;
    company: string;
  } | null>(null);

  const updateStatus = useUpdateOrderStatus();
  const cancelOrder = useCancelOrder();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchCompanies = async () => {
      const { data } = await supabase
        .from("delivery_companies")
        .select("*")
        .order("name");
      if (data) setDeliveryCompanies(data);
    };
    fetchCompanies();
  }, [supabase]);

  // Reset pageIndex on filter change
  useEffect(() => {
    setPageIndex(0);
  }, [searchTerm, statusFilter, deliveryCompanyFilter, dateFrom, dateTo]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder(key === "date" ? "desc" : "asc");
    }
  };

  const filteredOrders = useMemo(() => {
    const list = orders ?? [];
    return list.filter((order) => {
      const effectiveStatus = getEffectiveStatus(order);
      const matchesSearch = [
        order.id,
        order.customer_profile?.full_name,
        (order.guest_info as { full_name?: string } | null)?.full_name,
        order.shipping_phone,
      ]
        .filter(Boolean)
        .some((value) =>
          value?.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesStatus =
        statusFilter === "all" || effectiveStatus === statusFilter;

      const matchesDeliveryCompany =
        deliveryCompanyFilter === "all" ||
        order.delivery_company === deliveryCompanyFilter;

      let matchesDate = true;
      if (order.created_at) {
        const orderDate = new Date(order.created_at);
        if (dateFrom) {
          matchesDate =
            matchesDate && orderDate >= startOfDay(new Date(dateFrom));
        }
        if (dateTo) {
          matchesDate = matchesDate && orderDate <= endOfDay(new Date(dateTo));
        }
      }

      return (
        matchesSearch && matchesStatus && matchesDeliveryCompany && matchesDate
      );
    });
  }, [
    orders,
    searchTerm,
    statusFilter,
    deliveryCompanyFilter,
    dateFrom,
    dateTo,
  ]);

  const sortedOrders = useMemo(() => {
    const result = [...filteredOrders];
    result.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (sortKey) {
        case "date":
          valA = a.created_at ? new Date(a.created_at).getTime() : 0;
          valB = b.created_at ? new Date(b.created_at).getTime() : 0;
          break;
        case "customer":
          valA = (
            a.customer_profile?.full_name ||
            (a.guest_info as any)?.full_name ||
            ""
          ).toLowerCase();
          valB = (
            b.customer_profile?.full_name ||
            (b.guest_info as any)?.full_name ||
            ""
          ).toLowerCase();
          break;
        case "articles":
          valA = (a.order_items ?? []).reduce(
            (s, it) => s + (it.quantity || 1),
            0
          );
          valB = (b.order_items ?? []).reduce(
            (s, it) => s + (it.quantity || 1),
            0
          );
          break;
        case "total":
          valA = a.total_amount ?? 0;
          valB = b.total_amount ?? 0;
          break;
        case "delivery":
          valA = (a.delivery_company || "").toLowerCase();
          valB = (b.delivery_company || "").toLowerCase();
          break;
        case "payment":
          valA = (a.payment_status || "").toLowerCase();
          valB = (b.payment_status || "").toLowerCase();
          break;
        case "status":
          valA = getEffectiveStatus(a).toLowerCase();
          valB = getEffectiveStatus(b).toLowerCase();
          break;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [filteredOrders, sortKey, sortOrder]);

  const totalPages = Math.ceil(
    sortedOrders.length / (pageSize >= 9999 ? sortedOrders.length || 1 : pageSize)
  );

  const paginatedOrders = useMemo(() => {
    if (pageSize >= 9999) return sortedOrders;
    const start = pageIndex * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, pageIndex, pageSize]);

  const handleStatusChange = async (
    order: AdminOrder,
    nextStatus: OrderStatus
  ) => {
    // Si la commande passe en confirmé et n'a pas encore de société de livraison
    if (nextStatus === "confirmed" && !order.delivery_company) {
      setOrderToConfirm({
        order,
        company: deliveryCompanies[0]?.name || "",
      });
      return;
    }

    try {
      await updateStatus.mutateAsync({ orderId: order.id, status: nextStatus });
      toast.success("Statut de la commande mis à jour");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de modifier le statut"
      );
    }
  };

  const handleConfirmOrderWithCompany = async () => {
    if (!orderToConfirm) return;
    if (!orderToConfirm.company) {
      toast.error("Veuillez choisir une société de livraison");
      return;
    }
    try {
      await updateStatus.mutateAsync({
        orderId: orderToConfirm.order.id,
        status: "confirmed",
        deliveryCompany: orderToConfirm.company,
      });
      toast.success(
        `Commande confirmée et assignée à ${orderToConfirm.company}`
      );
      setOrderToConfirm(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la confirmation"
      );
    }
  };

  const handleAssignDeliveryCompany = async (
    orderId: string,
    company: string
  ) => {
    try {
      await updateStatus.mutateAsync({
        orderId,
        status: "confirmed",
        deliveryCompany: company,
      });
      toast.success(`Société ${company} assignée avec succès`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur d'assignation transporteur"
      );
    }
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    try {
      await cancelOrder.mutateAsync({
        orderId: orderToCancel.id,
        notes: orderToCancel.notes ?? undefined,
      });
      toast.success("Commande annulée avec succès");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible d'annuler la commande"
      );
    } finally {
      setOrderToCancel(null);
    }
  };

  const toggleSelectAll = () => {
    if (
      selectedOrderIds.length === filteredOrders.length &&
      filteredOrders.length > 0
    ) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((orderId) => orderId !== id) : [...prev, id]
    );
  };

  const handleExportCSV = () => {
    const ordersToExport =
      selectedOrderIds.length > 0
        ? filteredOrders.filter((o) => selectedOrderIds.includes(o.id))
        : filteredOrders;

    if (ordersToExport.length === 0) {
      toast.error("Aucune commande à exporter");
      return;
    }

    const headers = [
      "Order ID",
      "Date",
      "Customer",
      "Phone",
      "Articles",
      "Total (TND)",
      "Payment Method",
      "Delivery Company",
      "Status",
      "Payment Status",
      "Notes Privées",
    ];

    const csvContent = [
      headers.join(","),
      ...ordersToExport.map((order) => {
        const name =
          order.customer_profile?.full_name ||
          (order.guest_info as any)?.full_name ||
          "Client";
        const articlesList = (order.order_items ?? [])
          .map(
            (it) =>
              `${it.quantity}x ${it.product?.name || `Article #${it.product_id?.slice(0, 6)}`}`
          )
          .join(" | ");

        return [
          order.id,
          order.created_at
            ? format(new Date(order.created_at), "yyyy-MM-dd HH:mm:ss")
            : "",
          `"${name}"`,
          order.shipping_phone || "",
          `"${articlesList}"`,
          order.total_amount || 0,
          order.payment_method || "",
          `"${order.delivery_company || ""}"`,
          order.status || "",
          order.payment_status || "",
          `"${(order.notes || "").replace(/"/g, '""')}"`,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `export_commandes_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export CSV réussi");
  };

  const SortHeader = ({
    title,
    field,
  }: {
    title: string;
    field: SortKey;
  }) => {
    const isCurrent = sortKey === field;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors group font-semibold text-xs"
      >
        <span>{title}</span>
        {isCurrent ? (
          sortOrder === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-yellow-600" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-yellow-600" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>
    );
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={9}>
            <div className="flex flex-col gap-2 py-8">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={9}>
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-red-600">{error.message}</p>
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex items-center gap-2"
              >
                <RefreshCcw className="h-4 w-4" /> Réessayer
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (!paginatedOrders.length) {
      return (
        <TableRow>
          <TableCell colSpan={9}>
            <div className="py-10 text-center text-sm text-muted-foreground">
              {EMPTY_STATES[statusFilter]}
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return paginatedOrders.map((order) => {
      const name =
        order.customer_profile?.full_name ||
        (order.guest_info as { full_name?: string } | null)?.full_name ||
        "Client";
      const formattedDate = order.created_at
        ? format(new Date(order.created_at), "dd/MM/yyyy HH:mm")
        : "—";
      const paymentStatus = order.payment_status ?? "pending";
      const paymentMethod = order.payment_method ?? "—";
      const effectiveStatus = getEffectiveStatus(order);

      const items = order.order_items ?? [];

      return (
        <TableRow key={order.id} className="align-top hover:bg-slate-50/70 transition">
          <TableCell className="pt-4">
            <Checkbox
              checked={selectedOrderIds.includes(order.id)}
              onCheckedChange={() => toggleSelectOrder(order.id)}
            />
          </TableCell>

          {/* Numéro & Date */}
          <TableCell>
            <div className="text-xs font-bold text-slate-900">
              #{order.id.slice(0, 8)}
            </div>
            <p className="text-[11px] text-muted-foreground whitespace-nowrap mt-0.5">
              {formattedDate}
            </p>
          </TableCell>

          {/* Client & Note */}
          <TableCell>
            <div className="font-semibold text-xs text-slate-800">{name}</div>
            <p className="text-[11px] text-muted-foreground">
              {order.shipping_phone || "—"}
            </p>
            {order.notes && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded cursor-pointer mt-1 max-w-[140px]">
                      <span>🔒</span>
                      <span className="truncate">{order.notes}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs font-normal">
                    <p className="font-semibold text-amber-800 mb-0.5">
                      Note privée (Admin & Confirmation) :
                    </p>
                    {order.notes}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </TableCell>

          {/* Articles commandés */}
          <TableCell>
            <div className="flex flex-col gap-1 max-w-[210px]">
              {items.slice(0, 2).map((item, idx) => {
                const prodName =
                  item.product?.name ||
                  `Article #${item.product_id?.slice(0, 6) || idx + 1}`;
                return (
                  <div
                    key={item.id || idx}
                    className="flex items-center gap-1.5 text-[11px] text-slate-800"
                  >
                    <span className="font-bold text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.2 rounded border border-yellow-200">
                      x{item.quantity}
                    </span>
                    <span className="truncate leading-tight" title={prodName}>
                      {prodName}
                    </span>
                  </div>
                );
              })}
              {items.length > 2 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-[10px] text-yellow-700 font-semibold cursor-pointer hover:underline mt-0.5 inline-flex items-center gap-0.5">
                        <Package className="w-3 h-3" />
                        +{items.length - 2} autre(s) article(s)...
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="p-2.5 text-xs max-w-sm bg-slate-900 text-white shadow-xl">
                      <div className="font-bold mb-1 border-b border-slate-700 pb-1">
                        Tous les articles de la commande ({items.length}) :
                      </div>
                      <div className="space-y-1">
                        {items.map((it, i) => (
                          <div
                            key={it.id || i}
                            className="flex items-center gap-1.5"
                          >
                            <span className="bg-slate-700 text-yellow-300 font-bold px-1 rounded text-[10px]">
                              x{it.quantity}
                            </span>
                            <span>
                              {it.product?.name ||
                                `Produit #${it.product_id?.slice(0, 6)}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {items.length === 0 && (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          </TableCell>

          {/* Total */}
          <TableCell>
            <div className="text-xs font-bold text-slate-900">
              {new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: order.currency ?? "TND",
                minimumFractionDigits: 3,
              }).format(order.total_amount ?? 0)}
            </div>
            <p className="text-[10px] text-muted-foreground uppercase mt-0.5">
              {paymentMethod}
            </p>
          </TableCell>

          {/* Livraison */}
          <TableCell>
            {order.status === "confirmed" && !order.delivery_company ? (
              <div className="space-y-1">
                <Select
                  onValueChange={(val) =>
                    handleAssignDeliveryCompany(order.id, val)
                  }
                  disabled={updateStatus.isPending}
                >
                  <SelectTrigger className="h-7 text-xs border-amber-400 bg-amber-50 text-amber-900 font-bold hover:bg-amber-100 shadow-xs ring-1 ring-amber-300 w-[140px]">
                    <span className="flex items-center gap-1 truncate">
                      <Truck className="h-3.5 w-3.5 text-amber-700" />
                      <span>Choisir société</span>
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryCompanies.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-amber-700 font-semibold leading-none">
                  ⚠️ Transporteur requis
                </p>
              </div>
            ) : (
              <div className="text-xs font-semibold text-slate-800 flex flex-col gap-0.5">
                {order.delivery_company ? (
                  <>
                    <div className="inline-flex items-center gap-1">
                      <Truck className="h-3 w-3 text-slate-400" />
                      <span>{order.delivery_company}</span>
                    </div>
                    {(order as any).tracking_number && (
                      <a
                        href={`https://my.bigbossexpress.tn/track/${(order as any).tracking_number}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 font-mono font-medium"
                        title="Suivi du colis"
                      >
                        <span>📦</span>
                        <span className="truncate max-w-[120px]">
                          {(order as any).tracking_number}
                        </span>
                      </a>
                    )}
                  </>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
            )}
          </TableCell>

          {/* Payment */}
          <TableCell>
            <Badge variant="secondary" className="capitalize text-[10px]">
              {paymentStatus.replace("_", " ")}
            </Badge>
          </TableCell>

          {/* Statut */}
          <TableCell>
            <Select
              value={effectiveStatus}
              onValueChange={(value) =>
                handleStatusChange(order, value as OrderStatus)
              }
              disabled={updateStatus.isPending}
            >
              <SelectTrigger className="h-8 w-full justify-between gap-2 pr-2 text-xs">
                <OrderStatusBadge
                  status={effectiveStatus}
                  className="pointer-events-none text-xs"
                />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.filter((s) => s !== "all").map((option) => (
                  <SelectItem key={option} value={option}>
                    <OrderStatusBadge status={option as OrderStatus} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableCell>

          {/* Actions */}
          <TableCell className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <ManageOrderSheet
                  order={order}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      {order.status === "processing" ||
                      order.status === "shipped" ||
                      order.status === "delivered" ||
                      (order.status === "confirmed" && order.delivery_company)
                        ? "👁️ Voir la commande"
                        : "✏️ Modifier la commande"}
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuItem
                  onClick={() =>
                    window.open(
                      `/admin/delivery/list/package-content/print/${order.id}`,
                      "_blank"
                    )
                  }
                >
                  🖨️ Imprimer Bordereau
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(order.id)}
                >
                  📋 Copier ID Commande
                </DropdownMenuItem>
                {order.delivery_company && (
                  <DropdownMenuItem
                    onClick={async () => {
                      const comp = deliveryCompanies.find(
                        (c) =>
                          c.name.toLowerCase() ===
                          order.delivery_company?.toLowerCase()
                      );
                      const compId = comp?.id || deliveryCompanies[0]?.id;
                      if (!compId) {
                        toast.error("Société introuvable");
                        return;
                      }
                      const tId = toast.loading(
                        `Création du colis chez ${order.delivery_company}...`
                      );
                      try {
                        const res = await fetch(
                          "/api/admin/delivery/create-colis",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              order_id: order.id,
                              company_id: compId,
                            }),
                          }
                        );
                        const data = await res.json();
                        if (data.success) {
                          toast.success(
                            `Colis créé ! N° de suivi : ${data.tracking_number || "OK"}`,
                            { id: tId }
                          );
                          refetch();
                        } else {
                          toast.error(
                            data.message || "Échec de création du colis",
                            { id: tId }
                          );
                        }
                      } catch (err: any) {
                        toast.error(err?.message || "Erreur réseau", {
                          id: tId,
                        });
                      }
                    }}
                  >
                    🚀 Créer colis ({order.delivery_company})
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-rose-600 focus:text-rose-600 font-medium"
                  onClick={() => setOrderToCancel(order)}
                >
                  🗑️ Supprimer / Annuler
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <Card className="space-y-4 border bg-card p-4 rounded-2xl shadow-sm">
      {/* Filtres & Actions */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3 flex-1">
          <div className="relative w-full sm:w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 h-9 text-xs"
              placeholder="Recherche ID, client, tél..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {STATUS_OPTIONS.filter((s) => s !== "all").map((status) => (
                <SelectItem key={status} value={status}>
                  <OrderStatusBadge status={status as OrderStatus} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={deliveryCompanyFilter}
            onValueChange={setDeliveryCompanyFilter}
          >
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="Sté livraison" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes sociétés</SelectItem>
              {deliveryCompanies.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Du</span>
            <Input
              type="date"
              className="h-9 w-[130px] text-xs"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Au</span>
            <Input
              type="date"
              className="h-9 w-[130px] text-xs"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 lg:mt-0">
          <Button
            variant="outline"
            className="h-9 inline-flex items-center gap-2 text-xs"
            onClick={handleExportCSV}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
            {selectedOrderIds.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {selectedOrderIds.length}
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            className="h-9 w-9 p-0"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            <span className="sr-only">Actualiser</span>
          </Button>
        </div>
      </div>

      {/* Tableau des commandes */}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    filteredOrders.length > 0 &&
                    selectedOrderIds.length === filteredOrders.length
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>
                <SortHeader title="Commande" field="date" />
              </TableHead>
              <TableHead>
                <SortHeader title="Client" field="customer" />
              </TableHead>
              <TableHead>
                <SortHeader title="Articles" field="articles" />
              </TableHead>
              <TableHead>
                <SortHeader title="Total" field="total" />
              </TableHead>
              <TableHead>
                <SortHeader title="Livraison" field="delivery" />
              </TableHead>
              <TableHead>
                <SortHeader title="Paiement" field="payment" />
              </TableHead>
              <TableHead>
                <SortHeader title="Statut" field="status" />
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">{renderBody()}</TableBody>
        </Table>
      </div>

      {/* Footer de Pagination & Total (Identique à Photo 2) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100">
        <div className="text-xs sm:text-sm text-slate-600 font-medium">
          Total :{" "}
          <span className="font-bold text-slate-900">
            {filteredOrders.length}
          </span>{" "}
          commande(s)
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
            <span>Lignes par page :</span>
            <select
              value={pageSize >= 9999 ? 9999 : pageSize}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPageSize(val);
                setPageIndex(0);
              }}
              className="h-8 border border-slate-200 rounded-lg px-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500 font-medium text-slate-700 cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={9999}>Tout</option>
            </select>
          </div>

          <div className="text-xs sm:text-sm text-slate-600 font-medium">
            Page{" "}
            <span className="font-bold text-slate-900">
              {totalPages > 0 ? pageIndex + 1 : 0}
            </span>{" "}
            sur{" "}
            <span className="font-bold text-slate-900">
              {totalPages || 1}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-xs rounded-lg"
              onClick={() => setPageIndex(0)}
              disabled={pageIndex === 0}
              title="Première page"
            >
              «
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-xs rounded-lg"
              onClick={() => setPageIndex((p) => p - 1)}
              disabled={pageIndex === 0}
              title="Page précédente"
            >
              ‹
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-xs rounded-lg"
              onClick={() => setPageIndex((p) => p + 1)}
              disabled={pageIndex >= totalPages - 1}
              title="Page suivante"
            >
              ›
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-xs rounded-lg"
              onClick={() => setPageIndex(totalPages - 1)}
              disabled={pageIndex >= totalPages - 1}
              title="Dernière page"
            >
              »
            </Button>
          </div>
        </div>
      </div>

      {/* Modal choix société de livraison lors du passage en Confirmé */}
      <Dialog
        open={Boolean(orderToConfirm)}
        onOpenChange={(open) => !open && setOrderToConfirm(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Truck className="h-5 w-5 text-yellow-600" />
              Confirmation de la commande
            </DialogTitle>
            <DialogDescription>
              La commande #{orderToConfirm?.order.id.slice(0, 8)} passe au
              statut <strong>Confirmé</strong>. Veuillez sélectionner la société
              de livraison responsable pour cette commande :
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-800">
                Société de livraison <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={orderToConfirm?.company || ""}
                onValueChange={(val) =>
                  setOrderToConfirm((prev) => (prev ? { ...prev, company: val } : null))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choisir une société..." />
                </SelectTrigger>
                <SelectContent>
                  {deliveryCompanies.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setOrderToConfirm(null)}
              disabled={updateStatus.isPending}
            >
              Annuler
            </Button>
            <Button
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
              onClick={handleConfirmOrderWithCompany}
              disabled={updateStatus.isPending || !orderToConfirm?.company}
            >
              {updateStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirmer la commande"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'annulation */}
      <AlertDialog
        open={Boolean(orderToCancel)}
        onOpenChange={(open) => !open && setOrderToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la commande</AlertDialogTitle>
            <AlertDialogDescription>
              {orderToCancel ? (
                <span>
                  Vous êtes sur le point d'annuler la commande{" "}
                  <strong>#{orderToCancel.id.slice(0, 8)}</strong>. Cette
                  action retirera la commande des files d'expédition.
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={handleConfirmCancel}
              disabled={cancelOrder.isPending}
            >
              {cancelOrder.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Annuler la commande"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
