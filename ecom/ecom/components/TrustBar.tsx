"use client";

import { Truck, ShieldCheck, Banknote, PhoneCall } from "lucide-react";

const TRUST_ITEMS = [
  {
    icon: Truck,
    title: "Livraison Rapide 24/48h",
    description: "Partout en Tunisie à domicile ou au bureau",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    icon: Banknote,
    title: "Paiement à la Livraison",
    description: "Réglez en toute sécurité à la réception",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
  {
    icon: ShieldCheck,
    title: "Produits 100% Authentiques",
    description: "Garantis d'origine laboratoires certifiés",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  {
    icon: PhoneCall,
    title: "Conseil & Service Client",
    description: "À votre écoute au 48 006 623 (7j/7)",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-100",
  },
];

export default function TrustBar() {
  return (
    <section className="w-full my-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {TRUST_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border bg-white shadow-xs hover:shadow-md transition duration-200 ${item.border}`}
            >
              <div className={`p-2.5 rounded-xl ${item.bg} ${item.color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {item.title}
                </p>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
