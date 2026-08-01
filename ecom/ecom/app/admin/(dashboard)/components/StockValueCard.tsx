"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingUp, PackageCheck, Coins, ArrowUpRight } from "lucide-react";
import type { InventoryProduct } from "../types";

export function StockValueCard({
  inventory,
  isLoading,
}: {
  inventory?: InventoryProduct[] | null;
  isLoading?: boolean;
}) {
  const stockSummary = useMemo(() => {
    if (!inventory || inventory.length === 0) {
      return {
        totalSalesValue: 0,
        totalCostValue: 0,
        potentialProfit: 0,
        marginPercent: 0,
        totalItemsCount: 0,
        totalVariantsCount: 0,
        currency: "TND",
      };
    }

    let totalSalesValue = 0;
    let totalCostValue = 0;
    let totalItemsCount = 0;
    let totalVariantsCount = 0;
    let mainCurrency = "TND";

    for (const product of inventory) {
      const variants = product.variants ?? [];
      for (const v of variants) {
        const qty = Math.max(0, v.stock ?? 0);
        const price = Math.max(0, Number(v.price) || 0);
        const costPrice = Math.max(0, Number(v.cost_price) || 0);

        if (v.currency) mainCurrency = v.currency;

        totalSalesValue += qty * price;
        totalCostValue += qty * costPrice;
        totalItemsCount += qty;
        totalVariantsCount += 1;
      }
    }

    const potentialProfit = totalSalesValue - totalCostValue;
    const marginPercent =
      totalSalesValue > 0 ? (potentialProfit / totalSalesValue) * 100 : 0;

    return {
      totalSalesValue,
      totalCostValue,
      potentialProfit,
      marginPercent,
      totalItemsCount,
      totalVariantsCount,
      currency: mainCurrency,
    };
  }, [inventory]);

  const formatter = useMemo(() => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: stockSummary.currency,
      minimumFractionDigits: 2,
    });
  }, [stockSummary.currency]);

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm border rounded-2xl p-6">
        <div className="h-32 flex items-center justify-center text-sm text-slate-400">
          Calcul de la valeur du stock…
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-sm border rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-transparent border-b pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-yellow-600" />
            Valeur du Stock & Gain Potentiel Estimer
          </CardTitle>
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
            <PackageCheck className="h-3.5 w-3.5" />
            {stockSummary.totalItemsCount} articles en stock
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Valeur de Vente Totale */}
          <div className="space-y-1 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
              <Coins className="h-4 w-4 text-emerald-600" />
              Valeur de vente du stock
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatter.format(stockSummary.totalSalesValue)}
            </div>
            <p className="text-xs text-slate-500">
              Chiffre d'affaires brut estimé si tout est vendu
            </p>
          </div>

          {/* Coût d'Achat Total */}
          <div className="space-y-1 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
              <Wallet className="h-4 w-4 text-amber-600" />
              Coût d'achat total
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatter.format(stockSummary.totalCostValue)}
            </div>
            <p className="text-xs text-slate-500">
              Investissement d'achat du stock présent
            </p>
          </div>

          {/* Gain Potentiel Estimer */}
          <div className="space-y-1 bg-emerald-500/10 p-4 rounded-xl border border-emerald-200/60">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-emerald-800">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Gain / Bénéfice Estimé
              </span>
              <span className="text-xs font-bold bg-emerald-200/60 px-2 py-0.5 rounded-full text-emerald-800">
                +{stockSummary.marginPercent.toFixed(1).replace('.', ',')}% Marge
              </span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 flex items-center gap-1">
              {formatter.format(stockSummary.potentialProfit)}
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <p className="text-xs text-emerald-700 font-medium">
              Bénéfice estimé à réaliser sur le stock actuel
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
