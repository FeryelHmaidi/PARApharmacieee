"use client";

import { useMemo, useState } from "react";
import { format, startOfDay, endOfDay, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ManageOrderSheet } from "./ManageOrderSheet";
import { OrderHistoryDialog } from "./OrderHistoryDialog";
import { getOrderReceptionDate } from "../hooks/useOrderHistory";
import type { AdminOrder } from "../types";
import { getTrackingUrl } from "@/lib/delivery/tracking";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  History,
  MoreHorizontal,
  Package,
  PackageCheck,
  RefreshCcw,
  RotateCcw,
  Search,
  Truck,
  Wallet,
} from "lucide-react";

type ReturnsReceivedTableProps = {
  orders?: AdminOrder[] | null;
  isLoading: boolean;
  isFetching: boolean;
  error?: Error | null;
  refetch: () => Promise<any> | void;
};

type SortField = "reception_date" | "customer" | "total" | "articles" | "delivery";

export function ReturnsReceivedTable({
  orders,
  isLoading,
  isFetching,
  error,
  refetch,
}: ReturnsReceivedTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [carrierFilter, setCarrierFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [sortField, setSortField] = useState<SortField>("reception_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [historyOrder, setHistoryOrder] = useState<AdminOrder | null>(null);

  // 1. Filter only orders that are 'retour_recu'
  const returnedOrders = useMemo(() => {
    return (orders ?? []).filter((o) => o.status === "retour_recu");
  }, [orders]);

  // Unique carriers among returned orders
  const carrierOptions = useMemo(() => {
    const set = new Set<string>();
    returnedOrders.forEach((o) => {
      if (o.delivery_company) set.add(o.delivery_company);
    });
    return Array.from(set);
  }, [returnedOrders]);

  // 2. Filter by search, date range, carrier
  const filteredReturns = useMemo(() => {
    return returnedOrders.filter((order) => {
      const customerName =
        order.customer_profile?.full_name ||
        (order.guest_info as { full_name?: string } | null)?.full_name ||
        "";

      const matchesSearch = [
        order.id,
        customerName,
        order.shipping_phone,
        order.delivery_company,
        (order as any).tracking_number,
      ]
        .filter(Boolean)
        .some((val) =>
          val?.toLowerCase().includes(searchTerm.trim().toLowerCase())
        );

      const matchesCarrier =
        carrierFilter === "all" ||
        order.delivery_company?.toLowerCase() === carrierFilter.toLowerCase();

      let matchesDate = true;
      const recDate = getOrderReceptionDate(order);
      if (recDate) {
        if (dateFrom) {
          matchesDate = matchesDate && recDate >= startOfDay(new Date(dateFrom));
        }
        if (dateTo) {
          matchesDate = matchesDate && recDate <= endOfDay(new Date(dateTo));
        }
      }

      return matchesSearch && matchesCarrier && matchesDate;
    });
  }, [returnedOrders, searchTerm, carrierFilter, dateFrom, dateTo]);

  // 3. Sort returns
  const sortedReturns = useMemo(() => {
    const list = [...filteredReturns];
    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (sortField) {
        case "reception_date": {
          const dateA = getOrderReceptionDate(a);
          const dateB = getOrderReceptionDate(b);
          valA = dateA ? dateA.getTime() : 0;
          valB = dateB ? dateB.getTime() : 0;
          break;
        }
        case "customer": {
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
        }
        case "total":
          valA = a.total_amount ?? 0;
          valB = b.total_amount ?? 0;
          break;
        case "articles":
          valA = (a.order_items ?? []).reduce((s, it) => s + (it.quantity || 1), 0);
          valB = (b.order_items ?? []).reduce((s, it) => s + (it.quantity || 1), 0);
          break;
        case "delivery":
          valA = (a.delivery_company || "").toLowerCase();
          valB = (b.delivery_company || "").toLowerCase();
          break;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredReturns, sortField, sortOrder]);

  // Metrics summary
  const metrics = useMemo(() => {
    const count = sortedReturns.length;
    const totalAmount = sortedReturns.reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
    const totalItemsRestocked = sortedReturns.reduce((sum, o) => {
      const itemsCount = (o.order_items ?? []).reduce(
        (s, it) => s + (it.quantity || 1),
        0
      );
      return sum + itemsCount;
    }, 0);

    return { count, totalAmount, totalItemsRestocked };
  }, [sortedReturns]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder(field === "reception_date" ? "desc" : "asc");
    }
  };

  const handleExportCSV = () => {
    if (sortedReturns.length === 0) {
      toast.error("Aucun retour à exporter");
      return;
    }

    const headers = [
      "ID Commande",
      "Date Réception Physique",
      "Client",
      "Téléphone",
      "Transporteur",
      "N° Suivi",
      "Articles Remis au Stock",
      "Montant Total (TND)",
      "Date Création",
    ];

    const rows = sortedReturns.map((order) => {
      const recDate = getOrderReceptionDate(order);
      const formattedRec = recDate
        ? format(recDate, "yyyy-MM-dd HH:mm:ss")
        : "";
      const customer =
        order.customer_profile?.full_name ||
        (order.guest_info as any)?.full_name ||
        "Client";
      const articles = (order.order_items ?? [])
        .map(
          (it) =>
            `${it.quantity}x ${it.product?.name || `Article #${it.product_id?.slice(0, 6)}`}`
        )
        .join(" | ");

      return [
        order.id,
        `"${formattedRec}"`,
        `"${customer}"`,
        order.shipping_phone || "",
        `"${order.delivery_company || ""}"`,
        (order as any).tracking_number || "",
        `"${articles}"`,
        order.total_amount ?? 0,
        order.created_at ? format(new Date(order.created_at), "yyyy-MM-dd HH:mm") : "",
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `retours_recus_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export CSV des retours réussi !");
  };

  const SortHeader = ({
    title,
    field,
  }: {
    title: string;
    field: SortField;
  }) => {
    const isCurrent = sortField === field;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors font-semibold text-xs"
      >
        <span>{title}</span>
        {isCurrent ? (
          sortOrder === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-purple-600" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-purple-600" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-300 opacity-60" />
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Summary Metric Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-purple-200 bg-purple-50/40 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-700">
                Colis Retournés Réceptionnés
              </p>
              <h3 className="text-2xl font-bold text-purple-950 mt-1">
                {metrics.count} <span className="text-xs font-normal text-purple-600">colis</span>
              </h3>
              <p className="text-[11px] text-purple-600/80 mt-0.5">
                Reçus en main propre par l'admin
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
              <RotateCcw className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-700">
                Articles Réintégrés au Stock
              </p>
              <h3 className="text-2xl font-bold text-emerald-950 mt-1">
                {metrics.totalItemsRestocked} <span className="text-xs font-normal text-emerald-600">unités</span>
              </h3>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">
                Stock restauré automatiquement ✅
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <PackageCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-600">
                Valeur Marchandise Récupérée
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {metrics.totalAmount.toFixed(3)}{" "}
                <span className="text-xs font-normal text-slate-500">TND</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Total des montants des commandes
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
              <Wallet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters Bar ── */}
      <Card className="shadow-xs">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par client, tél, commande, transporteur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>

              {/* Carrier filter */}
              <Select value={carrierFilter} onValueChange={setCarrierFilter}>
                <SelectTrigger className="w-full sm:w-[170px] h-9 text-xs">
                  <SelectValue placeholder="Société de livraison" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes sociétés</SelectItem>
                  {carrierOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-purple-600" />
                <span>Reçu du :</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 text-xs w-[130px]"
                />
                <span>au :</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 text-xs w-[130px]"
                />
              </div>

              {(dateFrom || dateTo || searchTerm || carrierFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                    setSearchTerm("");
                    setCarrierFilter("all");
                  }}
                  className="h-8 text-xs text-rose-600 hover:text-rose-700"
                >
                  Réinitialiser
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-8 text-xs gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-8 w-8"
                title="Actualiser"
              >
                <RefreshCcw
                  className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ── */}
      <Card className="shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="w-[190px]">
                <SortHeader title="Date Réception" field="reception_date" />
              </TableHead>
              <TableHead className="w-[110px]">Commande</TableHead>
              <TableHead>
                <SortHeader title="Client" field="customer" />
              </TableHead>
              <TableHead>
                <SortHeader title="Articles Restockés" field="articles" />
              </TableHead>
              <TableHead>
                <SortHeader title="Total" field="total" />
              </TableHead>
              <TableHead>
                <SortHeader title="Transporteur" field="delivery" />
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="py-8 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-red-600 text-xs">
                  {error.message}
                </TableCell>
              </TableRow>
            ) : sortedReturns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-14 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <RotateCcw className="h-8 w-8 text-purple-300" />
                    <p className="text-sm font-medium text-slate-700">
                      Aucun retour réceptionné trouvé
                    </p>
                    <p className="text-xs text-slate-500">
                      Dès qu'une commande passe au statut « Retour Reçu ✅ », elle apparaît ici automatiquement avec sa date de réception.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedReturns.map((order) => {
                const recDate = getOrderReceptionDate(order);
                const isValidRecDate = recDate && !isNaN(recDate.getTime());
                const formattedRecDate = isValidRecDate
                  ? format(recDate, "dd/MM/yyyy HH:mm")
                  : "—";
                const relativeRec = isValidRecDate
                  ? formatDistanceToNow(recDate, { addSuffix: true, locale: fr })
                  : "";

                const customerName =
                  order.customer_profile?.full_name ||
                  (order.guest_info as { full_name?: string } | null)?.full_name ||
                  "Client";

                const items = order.order_items ?? [];

                return (
                  <TableRow
                    key={order.id}
                    className="hover:bg-purple-50/30 transition border-b border-slate-100"
                  >
                    {/* Date de Réception */}
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
                          <Calendar className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-purple-950 flex items-center gap-1">
                            <span>{formattedRecDate}</span>
                          </div>
                          {relativeRec && (
                            <p className="text-[10px] text-muted-foreground">
                              {relativeRec}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Numéro de Commande */}
                    <TableCell>
                      <div className="text-xs font-bold text-slate-900 font-mono">
                        #{order.id.slice(0, 8)}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[9px] bg-purple-100 text-purple-800 border-purple-200 mt-0.5"
                      >
                        Retour Reçu ✅
                      </Badge>
                    </TableCell>

                    {/* Client */}
                    <TableCell>
                      <div className="font-semibold text-xs text-slate-900">
                        {customerName}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {order.shipping_phone || "—"}
                      </p>
                    </TableCell>

                    {/* Articles remis en stock */}
                    <TableCell>
                      <div className="flex flex-col gap-1 max-w-[220px]">
                        {items.slice(0, 2).map((item, idx) => {
                          const prodName =
                            item.product?.name ||
                            `Article #${item.product_id?.slice(0, 6) || idx + 1}`;
                          return (
                            <div
                              key={item.id || idx}
                              className="flex items-center gap-1.5 text-[11px] text-slate-800"
                            >
                              <span className="font-bold text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200">
                                +{item.quantity}
                              </span>
                              <span className="truncate leading-tight" title={prodName}>
                                {prodName}
                              </span>
                            </div>
                          );
                        })}
                        {items.length > 2 && (
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            +{items.length - 2} autre(s) article(s)...
                          </span>
                        )}
                        {items.length === 0 && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Total */}
                    <TableCell>
                      <div className="text-xs font-bold text-slate-900">
                        {(order.total_amount ?? 0).toFixed(3)} {order.currency ?? "TND"}
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase">
                        {order.payment_method || "COD"}
                      </p>
                    </TableCell>

                    {/* Transporteur & Tracking */}
                    <TableCell>
                      <div className="text-xs font-semibold text-slate-800 flex flex-col gap-0.5">
                        {order.delivery_company ? (
                          <>
                            <div className="inline-flex items-center gap-1">
                              <Truck className="h-3 w-3 text-slate-400" />
                              <span>{order.delivery_company}</span>
                            </div>
                            {(order as any).tracking_number && (
                              <a
                                href={getTrackingUrl(
                                  (order as any).tracking_number,
                                  order.delivery_company
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 font-mono font-medium"
                                title="Suivi colis transporteur"
                              >
                                <span>📦</span>
                                <span className="truncate max-w-[110px]">
                                  {(order as any).tracking_number}
                                </span>
                              </a>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryOrder(order)}
                          className="h-7 text-xs gap-1 border-purple-200 text-purple-700 hover:bg-purple-50"
                          title="Historique de la commande"
                        >
                          <History className="h-3.5 w-3.5" />
                          <span>Historique</span>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <ManageOrderSheet
                              order={order}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  👁️ Voir la commande
                                </DropdownMenuItem>
                              }
                            />
                            <DropdownMenuItem
                              onClick={() => {
                                navigator.clipboard.writeText(order.id);
                                toast.success("ID copié !");
                              }}
                            >
                              📋 Copier ID
                            </DropdownMenuItem>
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
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* History Dialog */}
      <OrderHistoryDialog
        order={historyOrder}
        open={Boolean(historyOrder)}
        onOpenChange={(open) => !open && setHistoryOrder(null)}
      />
    </div>
  );
}
